//hooks
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAuthStore } from '../stores/authStore';

//api
import { fetchGroupDetail, fetchActiveHousieGame, fetchHousieTickets } from '../lib/api';

//utils
import { INACTIVITY_LIMITS_MINS, getInactiveMinutes } from '../utils/housieUtils';

export const useHousieLobbyData = (groupId: string | undefined) => {
    const { user } = useAuthStore();

    // 1. Fetch Group Details
    const { data: groupData, isLoading: isGroupLoading } = useQuery({
        queryKey: ['group', groupId],
        queryFn: () => fetchGroupDetail(groupId!),
        enabled: !!groupId,
    });

    // 2. Fetch Active/Last Game
    const { data: activeGameData, isLoading: isActiveGameLoading, isFetching: isActiveGameFetching } = useQuery({
        queryKey: ['activeHousieGame', groupId],
        queryFn: () => fetchActiveHousieGame(groupId!),
        enabled: !!groupId,
        refetchOnWindowFocus: true,
    });

    const activeGame = activeGameData?.activeGame;
    const lastGame = activeGameData?.lastGame;

    // 3. Fetch User Tickets for Active Game
    const { data: ticketData, isLoading: isTicketsLoading } = useQuery({
        queryKey: ['housieTickets', activeGame?.game_code],
        queryFn: () => fetchHousieTickets(activeGame?.game_code!),
        enabled: !!activeGame?.game_code,
        staleTime: 0,
    });

    // Computed Properties
    const groupName = groupData?.group?.name || 'Your';
    
    const isHostOfActiveGame = !!(activeGame && activeGame.host_id === user?.id && activeGame.status !== 'ended');

    const hasTickets = isHostOfActiveGame ? false : !!(ticketData?.tickets && ticketData.tickets.length > 0);

    const isStuck = !!(
        activeGame &&
        activeGame.status !== 'ended' &&
        INACTIVITY_LIMITS_MINS[activeGame.status] !== undefined &&
        getInactiveMinutes(activeGame) > INACTIVITY_LIMITS_MINS[activeGame.status]
    );

    const showCancelCTA = isStuck && !isHostOfActiveGame;

    return {
        activeGame,
        lastGame,
        groupName,
        hasTickets,
        isHostOfActiveGame,
        showCancelCTA,
        isGroupLoading,
        isGameLoading: isActiveGameLoading || isTicketsLoading || isActiveGameFetching,
        isFetching: isActiveGameFetching,
    };
};
