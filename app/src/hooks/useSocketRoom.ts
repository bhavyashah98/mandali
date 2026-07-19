import { useEffect, useRef } from 'react';
import { useSocket } from './useSocket';

/**
 * Manages socket room subscription and data synchronisation.
 *
 * On reconnect with a recovered session (socket.recovered = true) the server
 * already replayed all buffered events — we only need to re-join the room for
 * future events, not trigger an HTTP refetch.
 *
 * On a fresh / unrecovered connection we call onSync so the caller can
 * invalidate queries and catch up on any state that was missed.
 *
 * @param event      Socket event to emit for joining (e.g. 'join_game')
 * @param identifier Unique room identifier (e.g. gameCode, groupId)
 * @param onSync     Optional callback invoked only when recovery failed
 */
export const useSocketRoom = (
    event: string,
    identifier: string | undefined | null,
    onSync?: () => void
) => {
    const socket = useSocket();
    const onSyncRef = useRef(onSync);

    // Keep ref updated so joinRoom always calls the latest version
    useEffect(() => {
        onSyncRef.current = onSync;
    }, [onSync]);

    useEffect(() => {
        if (!socket || !identifier) return;

        const joinRoom = () => {
            console.log(`[SocketRoom] 📡 Joining ${event} for: ${identifier} (recovered=${socket.recovered})`);
            socket.emit(event, identifier);

            // Only HTTP-refetch when the server could NOT replay missed events
            if (!socket.recovered) {
                onSyncRef.current?.();
            }
        };

        // Initial join
        if (socket.connected) {
            joinRoom();
        }

        socket.on('connect', joinRoom);
        return () => {
            socket.off('connect', joinRoom);
        };
    }, [socket, event, identifier]);
};
