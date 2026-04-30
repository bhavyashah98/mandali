import React, { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { fetchHousieGame, updateHousieStatus, callHousieNumber } from '../../lib/api';
import { useSocket } from '../useSocket';

import * as Speech from 'expo-speech';

import { announceHousieNumber } from '../../utils/housieVoice';

export const useHousieGameEngine = (gameCode: string, groupId: string) => {
    const queryClient = useQueryClient();
    const navigation = useNavigation<any>();
    const [secondsSinceLastCall, setSecondsSinceLastCall] = useState(0);
    const [claimingPlayers, setClaimingPlayers] = useState<Set<string>>(new Set());
    const socket = useSocket();

    // 1. Fetch live game data
    const { data: game, isLoading } = useQuery({
        queryKey: ['housieGame', gameCode],
        queryFn: () => fetchHousieGame(gameCode),
        enabled: !!gameCode,
        staleTime: 0,
        refetchOnMount: true,
    });

    // 2. Call Number Mutation
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
    
    // 3. End Game Mutation
    const endGameMutation = useMutation({
        mutationFn: () => updateHousieStatus(gameCode, 'ended'),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['activeHousieGame', groupId] });
            await queryClient.invalidateQueries({ queryKey: ['housieGame', gameCode] });
            // Redirection is handled by the 'game_ended' socket event for both host and players
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.error || err?.message || 'Failed to end session.';
            Alert.alert('Error ending game', msg);
        }
    });

    // 4. Timer Logic
    useEffect(() => {
        if (!game?.last_activity_at || game?.status !== 'active') return;

        const updateTimer = () => {
            const lastCall = new Date(game.last_activity_at).getTime();
            const now = Date.now();
            setSecondsSinceLastCall(Math.floor((now - lastCall) / 1000));
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [game?.last_activity_at, game?.status]);

    // 5. Socket Listener for Global Game Events
    useEffect(() => {
        if (!gameCode || !socket) return;
        socket.emit('join_game', gameCode);

        const onNumberCalled = (data: any) => {
            const numbers = data.calledNumbers || [];
            const latest = numbers[numbers.length - 1];

            if (latest) {
                announceHousieNumber(latest);
            }

            queryClient.setQueryData(['housieGame', gameCode], (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    called_numbers: data.calledNumbers,
                    last_activity_at: data.lastActivityAt
                };
            });
        };

        const onGameEnded = () => {
            navigation.replace('HousieResults', { gameCode, groupId });
        };

        const onPlayerClaimingOpen = ({ userId }: { userId?: string }) => {
            if (userId) {
                setClaimingPlayers(prev => new Set(prev).add(userId));
            }
        };
        const onPlayerClaimingClosed = ({ userId }: { userId?: string }) => {
            if (userId) {
                setClaimingPlayers(prev => {
                    const next = new Set(prev);
                    next.delete(userId);
                    return next;
                });
            }
        };

        const onClaimResult = (data: any) => {
            if (data?.userId) {
                setClaimingPlayers(prev => {
                    const next = new Set(prev);
                    next.delete(data.userId);
                    return next;
                });
            }
        };

        socket.on('number_called', onNumberCalled);
        socket.on('game_ended', onGameEnded);
        socket.on('player_claiming_open', onPlayerClaimingOpen);
        socket.on('player_claiming_closed', onPlayerClaimingClosed);
        socket.on('claim_result', onClaimResult);

        return () => {
            socket.off('number_called', onNumberCalled);
            socket.off('game_ended', onGameEnded);
            socket.off('player_claiming_open', onPlayerClaimingOpen);
            socket.off('player_claiming_closed', onPlayerClaimingClosed);
            socket.off('claim_result', onClaimResult);
        };
    }, [gameCode]);

    // Determine if we should block calling numbers
    const hasPendingClaims = !!game?.winners?.['__pending']?.length;
    const effectivelyClaiming = claimingPlayers.size > 0 || hasPendingClaims;

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
