import { useQuery } from '@tanstack/react-query';
import { fetchPlanById } from '../../lib/api';
import { mapPlanToCardPlan } from './planCardMapper';

export const livePlanActions = [
    { id: 'games', title: 'Games', subtitle: 'Play fun games together', icon: 'sports-esports' },
    { id: 'memories', title: 'Memories', subtitle: 'Add photos & videos', icon: 'photo-library' },
    { id: 'hisaab', title: 'Hisaab', subtitle: 'Track & settle expenses', icon: 'account-balance-wallet' },
] as const;

export function usePlanDetails(planId?: string) {
    return useQuery({
        queryKey: ['plan', planId],
        queryFn: () => fetchPlanById(planId!),
        enabled: !!planId,
        select: (data) => mapPlanToCardPlan(data.plan) as ReturnType<typeof mapPlanToCardPlan>,
    });
}
