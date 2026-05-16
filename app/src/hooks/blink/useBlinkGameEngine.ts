import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchBlinkGame, fetchBlinkPlayers, fetchBlinkPlayer } from '../../lib/api';
import { useSocket } from '../useSocket';
import { useSocketRoom } from '../useSocketRoom';
import { useAuthStore } from '../../stores/authStore';

export const useBlinkGameEngine = (gameCode: string) => {
    const socket = useSocket();
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const userId = user?.id;

    // Join the game socket room and auto-refetch data on reconnect
    useSocketRoom('join_blink_game', gameCode, () => {
        if (gameCode) {
            queryClient.invalidateQueries({ queryKey: ['blinkGame', gameCode] });
            queryClient.invalidateQueries({ queryKey: ['blinkPlayer', gameCode] });
        }
    });

    const [participantsMap, setParticipantsMap] = useState<Record<string, any>>({});
    const [centerSymbols, setCenterSymbols] = useState<number[]>([]);
    const [mySymbols, setMySymbols] = useState<number[]>([]);

    // 1. Parallel Queries
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

    // 2. Hydrate Progress Rings
    useEffect(() => {
        if (isGameLoading || isPlayerLoading) return;

        console.log("gameData", gameData);
        console.log("playerData", playerData);

        const game = gameData!.game;

        const totalCards = game.cards_per_player;

        const particpants = game.participants.reduce((acc, p) => ({
            ...acc,
            [p.id]: {
                ...p,
                totalCards
            }
        }), {});
        setParticipantsMap(particpants);

        setCenterSymbols(game.centerCard);

        setMySymbols(playerData!.player.currentCardSymbols);

    }, [gameData, playerData, userId, isGameLoading, isPlayerLoading]);

    // 4. Socket Logic
    useEffect(() => {
        if (!gameCode || !socket) return;

        const onStateUpdate = (payload: any) => {
            console.log("payload", payload);
            if (payload.c) setCenterSymbols(payload.c);

            if (payload.u) {
                setParticipantsMap(prev => {
                    const player = prev[payload.u];
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

        const onGameEnded = (payload: any) => {
            console.log('[Blink] Game Ended! Winner:', payload.winner);
            // We could set a winner state here, or the UI could listen to the game status changing on next fetch
        };

        socket.on('blink_state_update', onStateUpdate);
        socket.on('blink_personal_update', onPersonalUpdate);
        socket.on('blink_game_ended', onGameEnded);

        return () => {
            socket.off('blink_state_update', onStateUpdate);
            socket.off('blink_personal_update', onPersonalUpdate);
            socket.off('blink_game_ended', onGameEnded);
        };
    }, [gameCode, socket]);

    const attemptMatch = (symbolId: number) => {
        socket?.emit('blink_match_attempt', { gameCode, symbolId });
    };

    return {
        players: Object.values(participantsMap),
        centerSymbols,
        mySymbols,
        isLoading: isGameLoading,
        attemptMatch
    };
};
