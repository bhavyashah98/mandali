import { io, Socket } from 'socket.io-client';
import { API_URL } from './api';

/**
 * Socket Singleton
 * 
 * Instead of each screen creating its own io() connection (which leads to
 * many duplicate connections), the entire app shares ONE socket instance.
 * 
 * Usage:
 *   import { getSocket } from '../../lib/socketService';
 *   const socket = getSocket();
 *   socket.emit('join_game', gameCode);
 *   socket.on('number_called', handler);
 * 
 * Always call socket.off('event', handler) in your useEffect cleanup to avoid
 * duplicate listeners, since the socket itself is never destroyed.
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
