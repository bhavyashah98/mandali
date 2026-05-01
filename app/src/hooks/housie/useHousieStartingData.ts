import { useState, useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchHousieGame } from '../../lib/api';

const TIMER_DURATION = 15;

export const useHousieStartingData = (gameCode: string) => {
    const queryClient = useQueryClient();
    const [secondsLeft, setSecondsLeft] = useState(TIMER_DURATION);
    const progressAnim = useRef(new Animated.Value(1)).current;
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const { data: game, isLoading, refetch } = useQuery({
        queryKey: ['housieGame', gameCode],
        queryFn: () => fetchHousieGame(gameCode),
        staleTime: 0,
    });

    useEffect(() => {
        if (!game?.last_activity_at || game.status !== 'starting') return;

        const startTime = new Date(game.last_activity_at).getTime();

        const syncTimer = () => {
            const now = Date.now();
            const elapsed = Math.floor((now - startTime) / 1000);
            const remaining = Math.max(0, TIMER_DURATION - elapsed);

            setSecondsLeft(remaining);

            Animated.timing(progressAnim, {
                toValue: remaining / TIMER_DURATION,
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
    }, [game?.last_activity_at, game?.status, gameCode, queryClient]);

    return {
        game,
        isLoading,
        secondsLeft,
        progressAnim,
        refetch
    };
};
