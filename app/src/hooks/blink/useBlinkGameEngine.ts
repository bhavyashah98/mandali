import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchBlinkGame, fetchBlinkPlayer } from '../../lib/api';
import { useSocket } from '../useSocket';
import { useSocketRoom } from '../useSocketRoom';
import { useAuthStore } from '../../stores/authStore';
import { useNavigation } from '@react-navigation/native';

export const useBlinkGameEngine = (gameCode: string, groupId?: string) => {
    const socket = useSocket();
    const queryClient = useQueryClient();
    const navigation = useNavigation<any>();
    const { user } = useAuthStore();
    const userId = user?.id;

    // ... existing room logic ...
    useSocketRoom('join_blink_game', gameCode, () => {
        if (gameCode) {
            queryClient.invalidateQueries({ queryKey: ['blinkGame', gameCode] });
            queryClient.invalidateQueries({ queryKey: ['blinkPlayer', gameCode] });
        }
    });

    const [participantsMap, setParticipantsMap] = useState<Record<string, any>>({});
    const [centerSymbols, setCenterSymbols] = useState<number[]>([]);
    const [mySymbols, setMySymbols] = useState<number[]>([]);

    // ... existing queries ...
    const { data: gameData, isLoading: isGameLoading } = useQuery({
        queryKey: ['blinkGame', gameCode],
        queryFn: () => fetchBlinkGame(gameCode),
        enabled: !!gameCode,
    });

    const { data: playerData, isLoading: isPlayerLoading } = useQuery({
        queryKey: ['blinkPlayer', gameCode],
        queryFn: () => fetchBlinkPlayer(gameCode),
        enabled: !!gameCode,
    });

    // ... hydration logic ...
    useEffect(() => {
        if (isGameLoading || isPlayerLoading || !gameData?.game || !playerData?.player) return;

        const game = gameData.game;
        const totalCards = game.cards_per_player;

        const participants = game.participants.reduce((acc: any, p: any) => ({
            ...acc,
            [p.id]: { ...p, totalCards }
        }), {});
        setParticipantsMap(participants);

        setCenterSymbols(game.centerCard);
        setMySymbols(playerData.player.currentCardSymbols);

    }, [gameData, playerData, userId, isGameLoading, isPlayerLoading]);

    // Socket Logic
    useEffect(() => {
        if (!gameCode || !socket) return;

        const onStateUpdate = (payload: any) => {
            if (payload.c) setCenterSymbols(payload.c);

            if (payload.u) {
                setParticipantsMap(prev => {
                    const player = prev[payload.u];
                    if (!player) return prev;
                    return {
                        ...prev,
                        [payload.u]: { ...player, cardsLeft: payload.l }
                    };
                });
            }
        };

        const onPersonalUpdate = (payload: any) => {
            if (payload.p) setMySymbols(payload.p);
        };

        const onWinnerFound = (payload: any) => {
            console.log(`[Blink] Winner: Rank ${payload.rank} - ${payload.userId}`);
            // You could add a toast here if you want: 
            // Toast.show({ text1: 'Winner!', text2: `${payload.userName} got Rank ${payload.rank}` });
        };

        const onGameEnded = () => {
            console.log('[Blink] Game Fully Ended!');
            navigation.replace('BlinkResults', { gameCode, groupId });
        };

        socket.on('blink_state_update', onStateUpdate);
        socket.on('blink_personal_update', onPersonalUpdate);
        socket.on('blink_winner', onWinnerFound);
        socket.on('blink_game_ended', onGameEnded);

        return () => {
            socket.off('blink_state_update', onStateUpdate);
            socket.off('blink_personal_update', onPersonalUpdate);
            socket.off('blink_winner', onWinnerFound);
            socket.off('blink_game_ended', onGameEnded);
        };
    }, [gameCode, socket, navigation, groupId]);

    const attemptMatch = useCallback((symbolId: number) => {
        socket?.emit('blink_match_attempt', { gameCode, symbolId });
    }, [gameCode, socket]);

    return {
        players: Object.values(participantsMap),
        centerSymbols,
        mySymbols,
        isLoading: isGameLoading,
        attemptMatch
    };
};
