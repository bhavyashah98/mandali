import jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';

export const socketAuthMiddleware = (socket: Socket, next: (err?: Error) => void) => {
    const token = socket.handshake.auth.token;

    if (!token) {
        return next(new Error('Authentication error: Missing token'));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; phone: string };
        (socket as any).userId = decoded.userId;
        (socket as any).userPhone = decoded.phone;
        next();
    } catch (err) {
        next(new Error('Authentication error: Invalid or expired token'));
    }
};
