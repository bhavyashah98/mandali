import { io, Socket } from 'socket.io-client';
import { AppState, AppStateStatus } from 'react-native';

/**
 * Socket Singleton — the entire app shares ONE socket instance.
 * Always call socket.off() in useEffect cleanup to avoid duplicate listeners.
 */

let socketInstance: Socket | null = null;
let currentToken: string | null = null;

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

/**
 * Initializes the socket with the provided auth token.
 * If a socket session already exists with the same token, it does nothing.
 * If the token changed, it disconnects the old one and creates a new one.
 */
export const initializeSocket = (token: string) => {
    if (socketInstance && currentToken === token) return socketInstance;

    if (socketInstance) {
        console.log('[Socket] Token changed or re-init, disconnecting old socket...');
        socketInstance.disconnect();
    }

    const host = process.env.EXPO_PUBLIC_SOCKET_URL!;
    currentToken = token;

    socketInstance = io(host, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        auth: { token }, // Pass token for backend socketAuthMiddleware
    });

    socketInstance.on('connect', () => {
        console.log('[Socket] Connected with auth:', socketInstance?.id);
    });

    socketInstance.on('connect_error', (err) => {
        console.error('[Socket] Connection Error:', err.message);
    });

    socketInstance.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected:', reason);
        if (reason === "io server disconnect") {
            socketInstance?.connect();
        }
    });

    return socketInstance;
};

export const getSocket = (): Socket => {
    if (!socketInstance) {
        // Fallback for screens calling getSocket before init (not ideal but avoids crashes)
        const host = process.env.EXPO_PUBLIC_SOCKET_URL!;
        socketInstance = io(host, {
            transports: ['websocket', 'polling'],
            reconnection: true,
        });
    }
    return socketInstance;
};

export const disconnectSocket = () => {
    if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
        currentToken = null;
    }
};
