import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSocket } from '../../hooks/useSocket';
import { useSocketRoom } from '../../hooks/useSocketRoom';

export const useHousieStartingSync = (gameCode: string, game: any, user: any, refetch: () => void, groupId?: string, planId?: string) => {
    const socket = useSocket();
    const queryClient = useQueryClient();
    const navigation = useNavigation<any>();

    // 1. Manage Socket Room & AppState Sync
    useSocketRoom('join_game', gameCode, refetch);

    // 2. Navigation Focus Effect
    useFocusEffect(
        useCallback(() => {
            refetch();
        }, [refetch])
    );

    useEffect(() => {
        if (!socket) return;

        const handleGameActivated = () => {
            queryClient.setQueryData(['housieGame', gameCode], (old: any) => {
                if (!old) return old;
                return { ...old, status: 'active' };
            });
        };

        socket.on('game_activated', handleGameActivated);
        return () => {
            socket.off('game_activated', handleGameActivated);
        };
    }, [socket, gameCode, queryClient]);

    // Handle initial state redirection - Single Source of Truth
    useEffect(() => {
        if (!game || game.status !== 'active') return;

        const isHost = game.host_id === user?.id;
        const hasTickets = game.participants?.some(
            (p: any) => p.id === user?.id && p.ticketCount > 0
        );

        if (isHost) {
            if (game.settings?.callingMode === 'auto') {
                if (hasTickets) {
                    navigation.replace('HousieTicket', { gameCode, groupId, planId });
                } else {
                    navigation.replace('HousieSpectator', { gameCode, groupId, planId });
                }
            } else {
                navigation.replace('HousieGame', { gameCode, groupId, planId });
            }
        } else if (hasTickets) {
            navigation.replace('HousieTicket', { gameCode, groupId, planId });
        } else {
            navigation.replace('HousieSpectator', { gameCode, groupId, planId });
        }
    }, [game?.status, user?.id, gameCode, groupId, planId, navigation]);
};
