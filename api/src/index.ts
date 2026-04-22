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

// Socket.io Connection Logic
io.use(socketAuthMiddleware);

io.on('connection', async (socket) => {
    const userId = (socket as any).userId;
    console.log(`[Socket] Authenticated: ${userId} (${socket.id})`);

    // 1. Presence Setup
    onlineUsers.set(userId, socket.id);
    await supabase.from('users').update({ online_status: true, last_seen: new Date().toISOString() }).eq('id', userId);
    io.emit('online_status', { userId, status: true });

    // 2. Room Joins
    // Auto-join group rooms the user is a member of
    const { data: memberships } = await supabase.from('group_members').select('group_id').eq('user_id', userId);
    if (memberships) {
        memberships.forEach(m => socket.join(m.group_id));
    }

    // 3. Delegate Feature Handlers
    registerChatHandlers(io, socket, onlineUsers);
    registerHousieHandlers(io, socket);

    // 4. Lifecyle Handlers
    socket.on('disconnect', async () => {
        console.log(`[Socket] User disconnected: ${socket.id}`);
        if (userId) {
            onlineUsers.delete(userId);
            await supabase.from('users').update({ online_status: false, last_seen: new Date().toISOString() }).eq('id', userId);
            io.emit('online_status', { userId, status: false });
        }
    });

});

httpServer.listen(port, () => {
    console.log(`[Server] Mandali backend is listening on port ${port}`);
});
