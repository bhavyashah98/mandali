import { useEffect } from 'react';
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

    useEffect(() => {
        if (!socket || !identifier) return;

        const joinRoom = () => {
            socket.emit(event, identifier);
            // Also trigger sync on reconnection to ensure data is fresh
            onSync?.();
        };

        if (socket.connected) {
            joinRoom();
        }

        socket.on('connect', joinRoom);

        // Handle background -> foreground transition
        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active') {
                onSync?.();
                // Re-emit join in case socket state is inconsistent
                if (socket.connected) {
                    socket.emit(event, identifier);
                }
            }
        });

        return () => {
            socket.off('connect', joinRoom);
            subscription.remove();
        };
    }, [socket, event, identifier, onSync]);
};
