import { useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '../useSocket';
import { useSocketRoom } from '../useSocketRoom';

interface UseHousieWaitingRoomSyncProps {
    game: any;
    gameCode: string;
    groupId: string;
    isHost: boolean;
}

export const useHousieWaitingRoomSync = ({
    game,
    gameCode,
    groupId,
    isHost
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

    // Socket listeners for real-time transitions
    useEffect(() => {
        if (!socket || !gameCode) return;

        const onTicketsBought = () => {
            queryClient.invalidateQueries({ queryKey: ['housieParticipants', gameCode] });
        };

        const onGameStarting = () => {
            navigation.replace('HousieStarting', { gameCode, groupId });
        };

        const onGameEnded = () => {
            navigation.goBack();
        };

        socket.on('tickets_bought', onTicketsBought);
        socket.on('game_starting', onGameStarting);
        socket.on('game_ended', onGameEnded);

        return () => {
            socket.off('tickets_bought', onTicketsBought);
            socket.off('game_starting', onGameStarting);
            socket.off('game_ended', onGameEnded);
        };
    }, [socket, gameCode, queryClient, navigation, groupId]);

    // Handle initial state redirection
    useEffect(() => {
        if (!game) return;

        if (game.status === 'starting') {
            navigation.replace('HousieStarting', { gameCode, groupId });
        } else if (game.status === 'active') {
            if (isHost) {
                navigation.replace('HousieGame', { gameCode, groupId });
            } else {
                navigation.replace('HousieTicket', { gameCode, groupId });
            }
        } else if (game.status === 'ended') {
            Alert.alert('Game Over', 'This game has already ended.');
            navigation.reset({
                index: 0,
                routes: [{ name: 'HousieLobby', params: { groupId } }],
            });
        }
    }, [game?.status, isHost, navigation, gameCode, groupId]);
};

