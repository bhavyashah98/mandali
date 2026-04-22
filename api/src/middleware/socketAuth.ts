import jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';

export const socketAuthMiddleware = (socket: Socket, next: (err?: Error) => void) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
        console.warn(`[Socket Auth] BYPASS: No token provided from ${socket.id}. Proceeding as guest.`);
        return next(); 
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; phone: string };
        (socket as any).userId = decoded.userId;
        (socket as any).userPhone = decoded.phone;
        
        console.log(`[Socket Auth] Success: User ${decoded.userId} connected via ${socket.id}`);
        next();
    } catch (err: any) {
        console.error(`[Socket Auth] Invalid token for socket ${socket.id}: ${err.message}. Proceeding as guest.`);
        next(); // Still proceed for transition period
    }
};
