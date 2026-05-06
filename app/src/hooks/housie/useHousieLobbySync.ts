import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { useSocket } from '../useSocket';
import { useSocketRoom } from '../useSocketRoom';

export const useHousieLobbySync = (groupId: string | undefined) => {
    const socket = useSocket();
    const queryClient = useQueryClient();

    const invalidateGamesList = useCallback(() => {
        if (groupId) {
            queryClient.invalidateQueries({ queryKey: ['housieGroupGames', groupId] });
        }
    }, [groupId, queryClient]);

    // Refresh when the screen comes into focus (e.g. coming back from waiting room or settings)
    useFocusEffect(
        useCallback(() => {
            invalidateGamesList();
        }, [invalidateGamesList])
    );

    // useSocketRoom handles room joining and AppState-based sync automatically
    useSocketRoom('join_group', groupId, invalidateGamesList);

    useEffect(() => {
        if (!groupId || !socket) return;

        // Listen for events that change the lobby list status
        const events = [
            'game_created',
            'game_scheduled',
            'game_starting',
            'game_activated',
            'game_ended',
            'player_joined_game'
        ];


        events.forEach(event => socket.on(event, invalidateGamesList));

        return () => {
            events.forEach(event => socket.off(event, invalidateGamesList));
        };
    }, [groupId, socket, invalidateGamesList]);
};
