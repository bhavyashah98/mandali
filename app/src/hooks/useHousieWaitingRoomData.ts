import { useQuery } from '@tanstack/react-query';
import { fetchHousieGame, fetchGroupDetail, fetchHousieParticipants } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

export const useHousieWaitingRoomData = (gameCode: string | undefined, groupId: string | undefined) => {
    const { user } = useAuthStore();

    const { data: game, isLoading: isGameLoading } = useQuery({
        queryKey: ['housieGame', gameCode],
        queryFn: () => fetchHousieGame(gameCode!),
        enabled: !!gameCode,
        staleTime: 5000,
    });

    const { data: groupData, isLoading: isGroupLoading } = useQuery({
        queryKey: ['groupDetail', groupId],
        queryFn: () => fetchGroupDetail(groupId!),
        enabled: !!groupId,
    });

    const { data: stats, isLoading: isStatsLoading } = useQuery({
        queryKey: ['housieParticipants', gameCode],
        queryFn: () => fetchHousieParticipants(gameCode!),
        enabled: !!gameCode,
        staleTime: 5000,
    });

    const isHost = game?.host_id === user?.id;
    const hasBoughtTickets = !!stats?.participants?.some((p: any) => p.id === user?.id && p.ticketCount > 0);
    const isLoading = isGameLoading || isGroupLoading || isStatsLoading;

    return {
        game,
        groupData,
        stats,
        isHost,
        hasBoughtTickets,
        isLoading
    };
};
