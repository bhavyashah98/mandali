import { io, Socket } from 'socket.io-client';
import { AppState, AppStateStatus } from 'react-native';

/**
 * Socket Singleton — the entire app shares ONE socket instance.
 * Always call socket.off() in useEffect cleanup to avoid duplicate listeners.
 */

let socketInstance: Socket | null = null;

// Handle background/foreground transitions
const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
        if (socketInstance && !socketInstance.connected) {
            console.log('[Socket] App active, restoring connection...');
            socketInstance.connect();
        }
    }
};

// Start listening for app state changes immediately
AppState.addEventListener('change', handleAppStateChange);

export const getSocket = (): Socket => {
    if (!socketInstance) {
        const host = process.env.EXPO_PUBLIC_SOCKET_URL!;

        socketInstance = io(host, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: Infinity, // Use Infinity for games so it never gives up
            reconnectionDelay: 1000,
        });

        socketInstance.on('connect', () => {
            console.log('[Socket] Connected:', socketInstance?.id);
        });

        socketInstance.on('disconnect', (reason) => {
            console.log('[Socket] Disconnected:', reason);
            // If server disconnected us, try to reconnect manually
            if (reason === "io server disconnect") {
                socketInstance?.connect();
            }
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
