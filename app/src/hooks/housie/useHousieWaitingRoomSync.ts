import { useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '../useSocket';
import { useSocketRoom } from '../useSocketRoom';

interface UseHousieWaitingRoomSyncProps {
    game: any;
    gameCode: string;
    groupId: string;
    planId?: string;
    isHost: boolean;
    hasTickets: boolean;
}

export const useHousieWaitingRoomSync = ({
    game,
    gameCode,
    groupId,
    planId,
    isHost,
    hasTickets
}: UseHousieWaitingRoomSyncProps) => {
    const navigation = useNavigation<any>();
    const queryClient = useQueryClient();
    const socket = useSocket();

    const invalidate = useCallback(() => {
        if (gameCode) {
            queryClient.invalidateQueries({ queryKey: ['housieGame', gameCode] });
            queryClient.invalidateQueries({ queryKey: ['housieParticipants', gameCode] });
        }
    }, [gameCode, queryClient]);

    // useSocketRoom handles background/foreground sync and reconnection
    useSocketRoom('join_game', gameCode, invalidate);

    // Refresh data when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            invalidate();
        }, [invalidate])
    );

    // Socket listeners for real-time transitions
    useEffect(() => {
        if (!socket || !gameCode) return;

        const onTicketsBought = () => {
            invalidate();
        };

        const onGameStarting = () => {
            invalidate();
        };

        const onGameEnded = () => {
            invalidate();
        };

        socket.on('tickets_bought', onTicketsBought);
        socket.on('game_starting', onGameStarting);
        socket.on('game_ended', onGameEnded);

        return () => {
            socket.off('tickets_bought', onTicketsBought);
            socket.off('game_starting', onGameStarting);
            socket.off('game_ended', onGameEnded);
        };
    }, [socket, gameCode, invalidate, navigation, groupId]);

    // Handle initial state redirection - Single Source of Truth
    useEffect(() => {
        if (!game) return;

        if (game.status === 'starting') {
            navigation.replace('HousieStarting', { gameCode, groupId, planId });
        } else if (game.status === 'active') {
            if (isHost && game.settings?.callingMode !== 'auto') {
                navigation.replace('HousieGame', { gameCode, groupId, planId });
            } else if (hasTickets) {
                navigation.replace('HousieTicket', { gameCode, groupId, planId });
            } else {
                navigation.replace('HousieSpectator', { gameCode, groupId, planId });
            }
        } else if (game.status === 'ended') {
            Alert.alert('Game Over', 'This game has already ended.');
            navigation.goBack();
        }
    }, [game?.status, game?.settings?.callingMode, hasTickets, isHost, navigation, gameCode, groupId, planId]);
};
