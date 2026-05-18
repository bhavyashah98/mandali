import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth';
import groupRoutes from './routes/groups';
import uploadRoutes from './routes/upload';
import housieRoutes from './routes/housie';
import memoriesRoutes from './routes/memories';
import legalRoutes from './routes/legal';
import deepLinksRoutes from './routes/deepLinks';
import moderationRoutes from './routes/moderation';
import chatRoutes from './routes/chat';
import appVersionRoutes from './routes/appVersion';
import hisaabRoutes from './routes/hisaab';
import configRoutes from './routes/config';
import blinkRoutes from './routes/blink';
import { supabase } from './lib/supabase';
import { socketAuthMiddleware } from './middleware/socketAuth';
import { appVersionGuard } from './middleware/appVersionGuard';

const app = express();
const port = process.env.PORT || 3000;
const httpServer = createServer(app);

export const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    },
    allowEIO3: true, // Support older engine.io versions if necessary
    pingInterval: 25000,
    pingTimeout: 60000,
    connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000,
        skipMiddlewares: true,
    }
});

// Attach io to app for use in routes
app.set('io', io);

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    console.log(`[API] ${req.method} ${req.url}`);
    next();
});

app.use(appVersionGuard);

// Route Handlers
app.use('/auth', authRoutes);
app.use('/groups', groupRoutes);
app.use('/upload', uploadRoutes);
app.use('/housie', housieRoutes);
app.use('/memories', memoriesRoutes);
app.use('/hisaab', hisaabRoutes);
app.use('/config', configRoutes);
app.use('/blink/games', blinkRoutes);
app.use('/', legalRoutes);
app.use('/', deepLinksRoutes);
app.use('/moderation', moderationRoutes);
app.use('/chat', chatRoutes);
app.use('/app-version', appVersionRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Mandali API is running' });
});

import { registerChatHandlers } from './sockets/chatHandlers';
import { registerHousieHandlers } from './sockets/housieHandlers';
import { registerBlinkHandlers } from './sockets/blinkHandlers';
import { initHousieEngine } from './services/housieEngine';
import { initBlinkEngine } from './services/blinkEngine';

// Initialize Background Engines
initHousieEngine();
initBlinkEngine();

// import { populateBlinkCards } from './utils/generateBlinkCards';
// // Run one-off generation for Blink cards
// populateBlinkCards();

// --- Real-time Presence Cache ---
const onlineUsers = new Map<string, string>(); // userId -> socketId

// Memory Monitor
setInterval(() => {
    const used = process.memoryUsage();
    console.log(`[SYS]
    RSS=${Math.round(used.rss / 1024 / 1024)}MB
    HeapUsed=${Math.round(used.heapUsed / 1024 / 1024)}MB
    HeapTotal=${Math.round(used.heapTotal / 1024 / 1024)}MB
    External=${Math.round(used.external / 1024 / 1024)}MB
    Online=${onlineUsers.size}`);
}, 60000);

// Socket.io Connection Logic
io.on('connection', async (socket) => {
    // Manually verify token from handshake
    const token = socket.handshake.auth?.token;
    let userId: string | undefined = undefined;

    if (token) {
        try {
            const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET!) as { userId: string };
            userId = decoded.userId;
            (socket as any).userId = userId;
            console.log(`[Socket] Token verified for userId: ${userId}`);
        } catch (err: any) {
            console.error(`[Socket] Token verification failed: ${err.message}`);
        }
    }

    if (!userId) {
        console.log(`[Socket] Guest attached: ${socket.id}`);
        registerChatHandlers(io, socket, onlineUsers);
        registerHousieHandlers(io, socket);
        return;
    }

    console.log(`[Socket] Authenticated: ${userId} (${socket.id})`);

    // 1. Presence Setup
    onlineUsers.set(userId, socket.id);
    socket.join(`user_${userId}`);
    console.log(`[Socket] User ${userId} joined their private room.`);

    // Non-blocking update
    supabase.from('users').update({
        online_status: true,
        last_seen: new Date().toISOString()
    }).eq('id', userId).then(({ error }) => {
        if (!error) io.emit('online_status', { userId, status: true });
    });

    // 2. Room Joins
    // Auto-join group rooms the user is a member of
    const { data: memberships } = await supabase.from('group_members').select('group_id').eq('user_id', userId);
    if (memberships) {
        memberships.forEach(m => socket.join(`group_${m.group_id}`));
    }

    // 3. Delegate Feature Handlers
    registerChatHandlers(io, socket, onlineUsers);
    registerHousieHandlers(io, socket);
    registerBlinkHandlers(io, socket);

    // 4. Lifecyle Handlers
    socket.on('disconnect', (reason) => {
        console.log(`[Socket] Disconnected: ${socket.id} (${userId || 'Guest'}) Reason: ${reason}`);
        if (userId) {
            // Only delete if the current socket is the one mapped to this user
            if (onlineUsers.get(userId) === socket.id) {
                onlineUsers.delete(userId);
            }

            supabase.from('users').update({
                online_status: false,
                last_seen: new Date().toISOString()
            }).eq('id', userId).then(async ({ error }) => {
                if (!error) {
                    io.emit('online_status', { userId, status: false });

                    // Cleanup: Remove any "pre_claim" virtual locks for this user from active games
                    try {
                        const { data: games } = await supabase
                            .from('housie_games')
                            .select('game_code, winners')
                            .eq('status', 'active');

                        if (games) {
                            for (const game of games) {
                                const winners = game.winners || {};
                                const pending = winners['__pending'] || [];

                                const updatedPending = pending.filter(
                                    (p: any) => !(p.userId === userId && p.type === 'pre_claim')
                                );

                                if (updatedPending.length !== pending.length) {
                                    console.log(`[Socket] Cleaning up zombie pre_claim for user ${userId} in game ${game.game_code}`);
                                    await supabase
                                        .from('housie_games')
                                        .update({
                                            winners: { ...winners, __pending: updatedPending },
                                            last_activity_at: new Date().toISOString()
                                        })
                                        .eq('game_code', game.game_code)
                                        .eq('winners', winners); // atomic guard
                                }
                            }
                        }
                    } catch (cleanupErr) {
                        console.error("[Socket] Failed to cleanup pre_claims on disconnect:", cleanupErr);
                    }
                }
            });
        }
    });

});

httpServer.listen(port, () => {
    console.log(`[Server] Mandali backend is listening on port ${port}`);
});
