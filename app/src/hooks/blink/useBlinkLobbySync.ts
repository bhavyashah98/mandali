import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { useSocket } from '../useSocket';
import { useSocketRoom } from '../useSocketRoom';

export const useBlinkLobbySync = (groupId: string | undefined) => {
    const socket = useSocket();
    const queryClient = useQueryClient();

    const invalidateGamesList = useCallback(() => {
        if (groupId) {
            queryClient.invalidateQueries({ queryKey: ['blinkGroupGames', groupId] });
        }
    }, [groupId, queryClient]);

    // Refresh when the screen comes into focus
    useFocusEffect(
        useCallback(() => {
            invalidateGamesList();
        }, [invalidateGamesList])
    );

    // Join the group room for real-time updates
    useSocketRoom('join_group', groupId, invalidateGamesList);

    useEffect(() => {
        if (!groupId || !socket) return;

        // Listen for events that change the blink lobby list status
        const events = [
            'blink_game_created',
            'blink_game_scheduled',
            'blink_game_starting',
            'blink_game_activated',
            'blink_game_ended',
            'blink_player_joined'
        ];

        events.forEach(event => socket.on(event, invalidateGamesList));

        return () => {
            events.forEach(event => socket.off(event, invalidateGamesList));
        };
    }, [groupId, socket, invalidateGamesList]);
};
