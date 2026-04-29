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
import wellKnownRoutes from './routes/well-known';
import deepLinksRoutes from './routes/deepLinks';
import moderationRoutes from './routes/moderation';
import chatRoutes from './routes/chat';
import { supabase } from './lib/supabase';
import { socketAuthMiddleware } from './middleware/socketAuth';

const app = express();
const port = process.env.PORT || 3000;
const httpServer = createServer(app);

export const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    },
    allowEIO3: true // Support older engine.io versions if necessary
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

// Route Handlers
app.use('/auth', authRoutes);
app.use('/groups', groupRoutes);
app.use('/upload', uploadRoutes);
app.use('/housie', housieRoutes);
app.use('/memories', memoriesRoutes);
app.use('/.well-known', wellKnownRoutes);
app.use('/', deepLinksRoutes);
app.use('/', legalRoutes);
app.use('/moderation', moderationRoutes);
app.use('/chat', chatRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Mandali API is running' });
});

import { registerChatHandlers } from './sockets/chatHandlers';
import { registerHousieHandlers } from './sockets/housieHandlers';

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
}, 10000);

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
        } catch (err) { }
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
            }).eq('id', userId).then(({ error }) => {
                if (!error) io.emit('online_status', { userId, status: false });
            });
        }
    });

});

httpServer.listen(port, () => {
    console.log(`[Server] Mandali backend is listening on port ${port}`);
});
