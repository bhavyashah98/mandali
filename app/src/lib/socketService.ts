import { io, Socket } from 'socket.io-client';
import { API_URL } from './api';

/**
 * Socket Singleton — the entire app shares ONE socket instance.
 * Always call socket.off() in useEffect cleanup to avoid duplicate listeners.
 */

let socketInstance: Socket | null = null;

export const getSocket = (): Socket => {
    if (!socketInstance || !socketInstance.connected) {
        const host = API_URL!.replace('/api', '');
        socketInstance = io(host, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        socketInstance.on('connect', () => {
            console.log('[Socket] Connected:', socketInstance?.id);
        });

        socketInstance.on('disconnect', (reason) => {
            console.log('[Socket] Disconnected:', reason);
        });
    }

    return socketInstance;
};

export const disconnectSocket = () => {
    if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
    }
};
