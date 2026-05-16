import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { useSocket } from '../useSocket';
import { useSocketRoom } from '../useSocketRoom';
import { Alert } from 'react-native';

interface UseBlinkWaitingRoomSyncProps {
    game: any;
    gameCode: string;
    groupId: string;
    isParticipant: boolean;
}

export const useBlinkWaitingRoomSync = ({
    game,
    gameCode,
    groupId,
    isParticipant
}: UseBlinkWaitingRoomSyncProps) => {
    const socket = useSocket();
    const queryClient = useQueryClient();
    const navigation = useNavigation<any>();

    const invalidateGame = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['blinkGame', gameCode] });
    }, [queryClient, gameCode]);

    // useSocketRoom handles room joining and AppState recovery
    useSocketRoom('join_blink_game', gameCode, invalidateGame);

    useEffect(() => {
        if (!socket || !gameCode) return;

        // Listen for game status changes
        const handleGameUpdate = () => invalidateGame();
        const handleGameStarting = (data: any) => invalidateGame();

        const handleError = (data: any) => {
            Alert.alert('Game Error', data.message || 'An error occurred.');
        };

        socket.on('blink_game_updated', handleGameUpdate);
        socket.on('blink_player_joined', handleGameUpdate);
        socket.on('blink_game_starting', handleGameStarting);
        socket.on('blink_error', handleError);

        return () => {
            socket.off('blink_game_updated', handleGameUpdate);
            socket.off('blink_player_joined', handleGameUpdate);
            socket.off('blink_game_starting', handleGameStarting);
            socket.off('blink_error', handleError);
        };
    }, [socket, gameCode, invalidateGame, navigation, groupId]);

    // Host-specific: Auto-navigate to starting screen when game starts
    useEffect(() => {
        if (!game) return;

        if (game.status === 'starting') {
            navigation.replace('BlinkStarting', { gameCode, groupId });
        } else if (game.status === 'active') {
            if (isParticipant) {
                navigation.replace('BlinkGame', { gameCode, groupId });
            } else {
                // Handle Spectate later
            }
        } else if (game.status === 'ended') {
            navigation.goBack();
        }
    }, [game?.status, isParticipant, navigation, gameCode, groupId]);
};
