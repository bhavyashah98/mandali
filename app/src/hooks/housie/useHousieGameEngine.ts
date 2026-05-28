import React, { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { fetchHousieGame, updateHousieStatus, callHousieNumber } from '../../lib/api';
import { useSocket } from '../useSocket';
import { useSocketRoom } from '../useSocketRoom';
import { useHousieStore } from '../../stores/housieStore';

import * as Speech from 'expo-speech';

import { announceHousieNumber } from '../../utils/housieVoice';

export const useHousieGameEngine = (gameCode: string, groupId: string, planId?: string) => {
    const queryClient = useQueryClient();
    const navigation = useNavigation<any>();
    const [secondsSinceLastCall, setSecondsSinceLastCall] = useState(0);
    const [lastRestartTime, setLastRestartTime] = useState<number | null>(null);
    
    const { 
        setActiveGame, 
        isGameEnded, 
        claimingPlayers: storeClaimingPlayers,
        reset: resetStore 
    } = useHousieStore();

    // 1. Fetch live game data
    const { data: game, isLoading, refetch } = useQuery({
        queryKey: ['housieGame', gameCode],
        queryFn: () => fetchHousieGame(gameCode),
        enabled: !!gameCode,
        staleTime: 0,
        refetchOnMount: true,
    });

    // 2. Manage Global Sync Lifecycle
    useEffect(() => {
        if (gameCode) {
            setActiveGame(gameCode);
        }
        // We don't resetStore here because we might want to keep data for Results screen
    }, [gameCode, setActiveGame]);

    // Determine if we should block calling numbers
    const hasPendingClaims = !!game?.winners?.['__pending']?.length;
    const effectivelyClaiming = storeClaimingPlayers.size > 0 || hasPendingClaims;

    // 3. Timer Reference Logic (Restart timer when claim ends)
    const prevEffectivelyClaiming = useRef(effectivelyClaiming);
    useEffect(() => {
        if (prevEffectivelyClaiming.current && !effectivelyClaiming) {
            setLastRestartTime(Date.now());
        }
        prevEffectivelyClaiming.current = effectivelyClaiming;
    }, [effectivelyClaiming]);

    useEffect(() => {
        setLastRestartTime(null);
    }, [game?.last_activity_at]);

    // 4. Call Number Mutation
    const callNumberMutation = useMutation({
        mutationFn: () => callHousieNumber(gameCode),
        onSuccess: (data: any) => {
            if (data.success && data.game) {
                queryClient.setQueryData(['housieGame', gameCode], data.game);
            }
        },
        onError: (err: any) => {
            Alert.alert('Error', err.response?.data?.error || 'Failed to call number');
        }
    });
    
    // 5. End Game Mutation
    const endGameMutation = useMutation({
        mutationFn: () => updateHousieStatus(gameCode, 'ended'),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['activeHousieGame', groupId] });
            await queryClient.invalidateQueries({ queryKey: ['housieGame', gameCode] });
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.error || err?.message || 'Failed to end session.';
            Alert.alert('Error ending game', msg);
        }
    });

    // 6. Timer Logic
    useEffect(() => {
        if (!game?.last_activity_at || game?.status !== 'active' || game?.settings?.isPaused || effectivelyClaiming) {
            setSecondsSinceLastCall(0);
            return;
        }

        const updateTimer = () => {
            const baseTime = lastRestartTime || new Date(game.last_activity_at).getTime();
            const now = Date.now();
            const diff = Math.max(0, Math.floor((now - baseTime) / 1000));
            setSecondsSinceLastCall(diff);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [game?.last_activity_at, game?.status, game?.settings?.isPaused, effectivelyClaiming, lastRestartTime]);

    // Background Sync & Room Management
    useSocketRoom('join_game', gameCode, () => {
        console.log('[HousieGameEngine] 🔄 Syncing on foreground/reconnect');
        refetch();
    });

    // 7. Navigation logic for game end
    useEffect(() => {
        if (isGameEnded || game?.status === 'ended') {
            navigation.replace('HousieResults', { gameCode, groupId, planId });
            // Clean up global sync only after we move to results or leave
            setActiveGame(null); 
        }
    }, [isGameEnded, game?.status, gameCode, groupId, planId, navigation, setActiveGame]);

    return {
        game,
        isLoading,
        secondsSinceLastCall,
        isPlayerClaiming: effectivelyClaiming,
        callNumber: callNumberMutation.mutate,
        isCallingNumber: callNumberMutation.isPending,
        endGame: endGameMutation.mutate,
        isEndingGame: endGameMutation.isPending
    };
};
