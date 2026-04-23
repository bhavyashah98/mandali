import { io, Socket } from 'socket.io-client';
import { AppState, AppStateStatus, NativeEventSubscription } from 'react-native';

/**
 * Socket Singleton — the entire app shares ONE socket instance.
 * Always call socket.off() in useEffect cleanup to avoid duplicate listeners.
 */

let socketInstance: Socket | null = null;
let currentToken: string | null = null;
let appStateSubscription: NativeEventSubscription | null = null;

// Handle background/foreground transitions
const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
        if (socketInstance && !socketInstance.connected) {
            console.log('[Socket] Foregrounded: Reconnecting...');
            socketInstance.connect();
        }
    } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Cleanly disconnect to avoid "zombie" sessions on the server
        // This is crucial for mobile OS lifecycle management
        if (socketInstance?.connected) {
            console.log('[Socket] Backgrounded: Disconnecting...');
            socketInstance.disconnect();
        }
    }
};

export const initializeSocket = (token: string) => {
    // 1. Singleton Listener Setup
    if (!appStateSubscription) {
        appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    }

    // 2. Token Matching / Reuse
    if (socketInstance && currentToken === token) return socketInstance;

    // 3. Cleanup existing instance if token changed
    if (socketInstance) {
        console.log('[Socket] Token changed or re-init, disconnecting old socket...');
        socketInstance.disconnect();
    }

    const host = process.env.EXPO_PUBLIC_SOCKET_URL!;
    currentToken = token;

    // 4. Create new Socket instance
    socketInstance = io(host, {
        transports: ['websocket'], // Prefer pure websocket for RN performance
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        autoConnect: true,
        auth: { token },
    });

    // 5. Connection Lifecycle Logging
    socketInstance.on('connect', () => {
        console.log('[Socket] Connected:', socketInstance?.id);
    });

    // Mirror the manager's reconnection events for debug
    socketInstance.io.on("reconnect_attempt", (attempt) => {
        console.log(`[Socket] Reconnection attempt #${attempt}`);
    });

    socketInstance.on('connect_error', (err) => {
        console.error('[Socket] Connection Error:', err.message);
    });

    socketInstance.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected:', reason);
        // If server kicks us off, try to get back on
        if (reason === "io server disconnect") {
            socketInstance?.connect();
        }
    });

    return socketInstance;
};

export const getSocket = (): Socket => {
    if (!socketInstance) {
        // Fallback for cases where getSocket is called before init
        const host = process.env.EXPO_PUBLIC_SOCKET_URL!;
        socketInstance = io(host, {
            transports: ['websocket'],
            reconnection: true,
            autoConnect: true
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
