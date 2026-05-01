import { useEffect } from 'react';
import { useSocket } from './useSocket';

/**
 * Custom hook to automatically manage socket room subscriptions.
 * It handles joining the room initially and re-joining if the socket reconnects 
 * (e.g., when the app comes back from the background).
 * 
 * @param event The socket event to emit for joining (e.g., 'join_game', 'join_group')
 * @param identifier The unique identifier for the room (e.g., gameCode, groupId)
 */
export const useSocketRoom = (event: string, identifier: string | undefined | null) => {
    const socket = useSocket();

    useEffect(() => {
        if (!socket || !identifier) return;

        const joinRoom = () => {
            socket.emit(event, identifier);
        };

        if (socket.connected) {
            joinRoom();
        }

        socket.on('connect', joinRoom);

        return () => {
            socket.off('connect', joinRoom);
        };
    }, [socket, event, identifier]);
};
