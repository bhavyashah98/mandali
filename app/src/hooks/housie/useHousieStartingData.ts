import { useState, useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchHousieGame } from '../../lib/api';

export const useHousieStartingData = (gameCode: string) => {
    const queryClient = useQueryClient();
    const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
    const progressAnim = useRef(new Animated.Value(1)).current;
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const { data: game, isLoading, refetch } = useQuery({
        queryKey: ['housieGame', gameCode],
        queryFn: () => fetchHousieGame(gameCode),
        staleTime: 0,
    });

    useEffect(() => {
        if (!game?.activation_at || game.status !== 'starting') return;

        const activationTime = new Date(game.activation_at).getTime();

        const syncTimer = () => {
            const now = Date.now();
            const remaining = Math.max(0, Math.floor((activationTime - now) / 1000));
            
            // Total duration for the progress bar (usually 60s, but dynamic if they join late)
            const totalDuration = 60; 

            setSecondsLeft(remaining);

            Animated.timing(progressAnim, {
                toValue: Math.min(1, remaining / totalDuration),
                duration: 300,
                useNativeDriver: false,
            }).start();

            if (remaining === 0 && game.status === 'starting') {
                queryClient.invalidateQueries({ queryKey: ['housieGame', gameCode] });
            }
        };

        syncTimer();
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(syncTimer, 1000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [game?.activation_at, game?.status, gameCode, queryClient]);

    return {
        game,
        isLoading,
        secondsLeft,
        progressAnim,
        refetch
    };
};
