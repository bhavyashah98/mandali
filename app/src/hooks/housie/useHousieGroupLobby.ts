import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { fetchGroupDetail, fetchHousieGroupGames, fetchActiveHousieGame } from '../../lib/api';

export const useHousieGroupLobby = (groupId: string | undefined, planId?: string) => {
    const { user } = useAuthStore();

    // 1. Fetch Group Details (Header)
    const { data: groupData, isLoading: isGroupLoading } = useQuery({
        queryKey: ['group', groupId],
        queryFn: () => fetchGroupDetail(groupId!),
        enabled: !!groupId,
    });

    // 2. Fetch All Non-Ended Games for this Group
    const {
        data: gamesData,
        isLoading: isGamesLoading,
        isFetching: isGamesFetching,
        refetch: refetchGames
    } = useQuery({
        queryKey: ['housieGroupGames', groupId, planId],
        queryFn: () => fetchHousieGroupGames(groupId!, planId),
        enabled: !!groupId,
        refetchOnWindowFocus: true,
    });

    const games = gamesData?.games || [];

    // Computed Lists
    const activeGames = useMemo(() =>
        games.filter(g => ['waiting', 'starting', 'active'].includes(g.status)),
        [games]);

    const scheduledGames = useMemo(() =>
        games.filter(g => g.status === 'scheduled'),
        [games]);

    return {
        groupName: groupData?.group?.name,
        memberCount: groupData?.members?.length || 0,
        activeGames,
        scheduledGames,

        isGroupLoading,
        isGamesLoading,
        isGamesFetching,
        refetchGames,
        userId: user?.id
    };
};
