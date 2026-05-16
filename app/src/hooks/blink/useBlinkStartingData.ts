import { useState, useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchBlinkGame } from '../../lib/api';

export const useBlinkStartingData = (gameCode: string) => {
    const queryClient = useQueryClient();
    const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
    const progressAnim = useRef(new Animated.Value(1)).current;
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const { data: gameData, isLoading, refetch } = useQuery({
        queryKey: ['blinkGame', gameCode],
        queryFn: () => fetchBlinkGame(gameCode),
        staleTime: 0,
    });

    // fetchBlinkGame returns { game: {..., participants: [...], prizes: [...], activation_at: '...' } }
    const game = gameData?.game;

    useEffect(() => {
        if (!game?.activation_at || game.status !== 'starting') return;

        const activationTime = new Date(game.activation_at).getTime();

        // Determine total countdown duration from game state
        // Manual games = 15s, scheduled = 60s. We calculate it dynamically from timestamps.
        const startingAt = game.starting_at ? new Date(game.starting_at).getTime() : activationTime - 15000;
        const totalDuration = Math.max(1, Math.round((activationTime - startingAt) / 1000));

        const syncTimer = () => {
            const now = Date.now();
            const remaining = Math.max(0, Math.floor((activationTime - now) / 1000));

            setSecondsLeft(remaining);

            Animated.timing(progressAnim, {
                toValue: Math.min(1, remaining / totalDuration),
                duration: 300,
                useNativeDriver: false,
            }).start();

            if (remaining === 0 && game.status === 'starting') {
                queryClient.invalidateQueries({ queryKey: ['blinkGame', gameCode] });
            }
        };

        syncTimer();
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(syncTimer, 1000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [game?.activation_at, game?.status, game?.starting_at, gameCode, queryClient]);

    return {
        game,
        isLoading,
        secondsLeft,
        progressAnim,
        refetch
    };
};
