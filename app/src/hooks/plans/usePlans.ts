import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { PlanTab } from '../../components/plans/list/planTabs';
import { fetchPlans } from '../../lib/api';
import type { PlanStatus } from '../../types/plans';
import { mapPlanToCardPlan } from './planCardMapper';

function tabToApiStatus(tab: PlanTab): PlanStatus {
    return tab === 'active' ? 'upcoming' : tab;
}

export function usePlans(activeTab: PlanTab) {
    const apiStatus = tabToApiStatus(activeTab);

    const { data: plans = [], isLoading, isRefetching, refetch, error } = useQuery({
        queryKey: ['plans', apiStatus],
        queryFn: () => fetchPlans(apiStatus),
        select: (data) => data.plans.map((plan) => mapPlanToCardPlan(plan)),
    });

    const onRefresh = useCallback(async () => {
        await refetch();
    }, [refetch]);

    return { plans, isLoading, isRefetching, onRefresh, refetch, error };
}
