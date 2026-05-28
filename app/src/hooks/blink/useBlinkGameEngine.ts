import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchBlinkGame, fetchBlinkPlayer } from '../../lib/api';
import { useSocket } from '../useSocket';
import { useSocketRoom } from '../useSocketRoom';
import { useAuthStore } from '../../stores/authStore';
import { useNavigation } from '@react-navigation/native';

export const useBlinkGameEngine = (gameCode: string, groupId?: string, planId?: string) => {
    const socket = useSocket();
    const queryClient = useQueryClient();
    const navigation = useNavigation<any>();
    const { user } = useAuthStore();
    const userId = user?.id;

    useSocketRoom('join_blink_game', gameCode, () => {
        if (gameCode) {
            queryClient.invalidateQueries({ queryKey: ['blinkGame', gameCode] });
            queryClient.invalidateQueries({ queryKey: ['blinkPlayer', gameCode] });
        }
    });

    const [participantsMap, setParticipantsMap] = useState<Record<string, any>>({});
    const [centerSymbols, setCenterSymbols] = useState<number[]>([]);
    const [mySymbols, setMySymbols] = useState<number[]>([]);
    const [myPrize, setMyPrize] = useState<{ rank: number; prizeName: string; prizeAmount: number } | null>(null);

    const { data: gameData, isLoading: isGameLoading } = useQuery({
        queryKey: ['blinkGame', gameCode],
        queryFn: () => fetchBlinkGame(gameCode),
        enabled: !!gameCode,
    });

    const game = gameData?.game;
    const isParticipant = game?.participants?.some((p: any) => p.id === userId) || false;

    const { data: playerData, isLoading: isPlayerLoading } = useQuery({
        queryKey: ['blinkPlayer', gameCode],
        queryFn: () => fetchBlinkPlayer(gameCode),
        enabled: !!gameCode && isParticipant,
    });

    // Hydration logic
    useEffect(() => {
        if (isGameLoading || !game) return;

        const totalCards = game.cards_per_player;

        const participants = game.participants.reduce((acc: any, p: any) => ({
            ...acc,
            [p.id]: { ...p, totalCards }
        }), {});
        setParticipantsMap(participants);

        setCenterSymbols(game.centerCard);

        if (isParticipant && playerData?.player) {
            setMySymbols(playerData.player.currentCardSymbols);
        }

    }, [gameData, playerData, userId, isGameLoading, isPlayerLoading, isParticipant]);

    // Socket Logic
    useEffect(() => {
        if (!gameCode || !socket) return;

        const onStateUpdate = (payload: any) => {
            if (payload.sd) {
                console.log(`[Blink Perf] Server processing took: ${payload.sd}ms`);
            }
            if (payload.c) setCenterSymbols(payload.c);

            if (payload.u) {
                setParticipantsMap(prev => {
                    const player = prev[payload.u];
                    if (!player) return prev;
                    const isNewlyFinished = payload.l === -1 && player.cardsLeft !== -1;
                    return {
                        ...prev,
                        [payload.u]: {
                            ...player,
                            cardsLeft: payload.l,
                            ...(isNewlyFinished ? { finishedAt: Date.now() } : {})
                        }
                    };
                });
            }
        };

        const onPersonalUpdate = (payload: any) => {
            if (payload.p) setMySymbols(payload.p);
        };

        const onWinnerFound = (payload: any) => {
            if (payload.userId === userId) {
                setMyPrize({
                    rank: payload.rank,
                    prizeName: payload.prizeName,
                    prizeAmount: payload.prizeAmount
                });
            }
        };

        const onGameEnded = () => {
            queryClient.invalidateQueries({ queryKey: ['blinkGame', gameCode] });
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
    }, [gameCode, socket, navigation, groupId, planId, userId, queryClient]);

    // Handle explicit status change (e.g. from refetching)
    useEffect(() => {
        if (game?.status === 'ended') {
            navigation.replace('BlinkResults', { gameCode, groupId, planId });
        }
    }, [game?.status, navigation, gameCode, groupId, planId]);

    const attemptMatch = useCallback((symbolId: number) => {
        if (!isParticipant) return;
        socket?.emit('blink_match_attempt', { gameCode, symbolId });
    }, [gameCode, socket, isParticipant]);

    const myProgress = participantsMap[userId!];
    const hasFinished = myProgress ? myProgress.cardsLeft === -1 : false;

    return {
        players: Object.values(participantsMap),
        centerSymbols,
        mySymbols,
        isLoading: isGameLoading,
        attemptMatch,
        isParticipant,
        hasFinished,
        myPrize
    };
};
