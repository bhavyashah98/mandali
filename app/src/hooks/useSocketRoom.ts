import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useSocket } from './useSocket';

/**
 * Custom hook to automatically manage socket room subscriptions and data synchronization.
 * It handles joining the room initially, re-joining if the socket reconnects,
 * and triggering an optional sync callback when the app returns from the background.
 * 
 * @param event The socket event to emit for joining (e.g., 'join_game', 'join_group')
 * @param identifier The unique identifier for the room (e.g., gameCode, groupId)
 * @param onSync Optional callback to trigger a data refresh (e.g., query invalidation)
 */
export const useSocketRoom = (
    event: string, 
    identifier: string | undefined | null,
    onSync?: () => void
) => {
    const socket = useSocket();
    const onSyncRef = useRef(onSync);

    // Keep ref updated with latest callback
    useEffect(() => {
        onSyncRef.current = onSync;
    }, [onSync]);

    useEffect(() => {
        if (!socket || !identifier) return;

        const joinRoom = () => {
            console.log(`[SocketRoom] 📡 Joining ${event} for: ${identifier} (Socket ID: ${socket.id})`);
            socket.emit(event, identifier);
            // Trigger sync on reconnection to ensure data is fresh
            onSyncRef.current?.();
        };

        // Initial join if already connected
        if (socket.connected) {
            joinRoom();
        }

        // Listen for connection events (handles both initial and reconnections)
        socket.on('connect', joinRoom);
        socket.on('reconnect', joinRoom);

        // Handle background -> foreground transition
        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active') {
                console.log(`[SocketRoom] 📱 App foregrounded. Re-syncing ${identifier}...`);
                
                // Re-emit join in case socket state is inconsistent after backgrounding
                if (socket.connected) {
                    socket.emit(event, identifier);
                }
                
                // Always sync data on foreground return
                onSyncRef.current?.();
            }
        });

        return () => {
            socket.off('connect', joinRoom);
            socket.off('reconnect', joinRoom);
            subscription.remove();
        };
    }, [socket, event, identifier]); // Removed onSync from dependencies
};
