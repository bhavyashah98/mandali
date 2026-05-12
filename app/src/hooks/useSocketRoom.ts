import { useEffect, useRef } from 'react';
import { useSocket } from './useSocket';

/**
 * Custom hook to automatically manage socket room subscriptions and data synchronization.
 * It handles joining the room initially and re-joining if the socket reconnects.
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
            onSyncRef.current?.();
        };

        // Initial join if already connected
        if (socket.connected) {
            joinRoom();
        }

        // Listen for connection events
        socket.on('connect', joinRoom);

        return () => {
            socket.off('connect', joinRoom);
        };
    }, [socket, event, identifier]);
};
