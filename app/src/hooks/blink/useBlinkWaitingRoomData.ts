import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchBlinkGame, fetchGroupDetail } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

export const useBlinkWaitingRoomData = (gameCode: string | undefined, groupId: string | undefined) => {
    const { user } = useAuthStore();

    // 1. Fetch Game Details
    const {
        data: gameData,
        isLoading: isGameLoading,
        error: gameError
    } = useQuery({
        queryKey: ['blinkGame', gameCode],
        queryFn: () => fetchBlinkGame(gameCode!),
        enabled: !!gameCode,
    });

    // 2. Fetch Group Details (for member list/admin status)
    const {
        data: groupData,
        isLoading: isGroupLoading
    } = useQuery({
        queryKey: ['group', groupId],
        queryFn: () => fetchGroupDetail(groupId!),
        enabled: !!groupId,
    });

    const game = gameData?.game;
    const isHost = user?.id === game?.host_id;

    const isParticipant = game?.participants?.some((p: any) => p.user_id === user?.id);

    // For now, let's assume we don't have a separate "stats" endpoint for Blink yet
    // and just use the game object which should contain participants
    console.log(game?.participants);
    const participants = game?.participants || [];

    return {
        game,
        groupData,
        participants,
        isHost,
        isParticipant,
        isLoading: isGameLoading || isGroupLoading,
        gameError
    };
};
