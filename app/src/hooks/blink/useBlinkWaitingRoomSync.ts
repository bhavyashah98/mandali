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
    isHost: boolean;
}

export const useBlinkWaitingRoomSync = ({
    game,
    gameCode,
    groupId,
    isHost
}: UseBlinkWaitingRoomSyncProps) => {
    const socket = useSocket();
    const queryClient = useQueryClient();
    const navigation = useNavigation<any>();

    const invalidateGame = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['blinkGame', gameCode] });
    }, [queryClient, gameCode]);

    // useSocketRoom handles room joining and AppState recovery
    useSocketRoom(gameCode, undefined, invalidateGame);

    useEffect(() => {
        if (!socket || !gameCode) return;

        // Listen for game status changes
        const handleGameUpdate = () => invalidateGame();
        
        const handleGameStarted = (data: any) => {
            if (data.gameCode === gameCode) {
                navigation.replace('BlinkGame', { gameCode, groupId });
            }
        };

        const handleError = (data: any) => {
            Alert.alert('Game Error', data.message || 'An error occurred.');
        };

        socket.on('blink_game_updated', handleGameUpdate);
        socket.on('blink_player_joined', handleGameUpdate);
        socket.on('blink_game_started', handleGameStarted);
        socket.on('blink_error', handleError);

        return () => {
            socket.off('blink_game_updated', handleGameUpdate);
            socket.off('blink_player_joined', handleGameUpdate);
            socket.off('blink_game_started', handleGameStarted);
            socket.off('blink_error', handleError);
        };
    }, [socket, gameCode, invalidateGame, navigation, groupId]);

    // Host-specific: Join the game room automatically
    useEffect(() => {
        if (socket && gameCode) {
            socket.emit('join_blink_game', gameCode);
        }
    }, [socket, gameCode]);
};
