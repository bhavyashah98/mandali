import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchPlanHype } from '../../lib/planHypeApi';
import { useSocket } from '../useSocket';

export function usePlanHype(planId: string) {
    const queryClient = useQueryClient();
    const socket = useSocket();
    const queryKey = ['plan-hype', planId];
    const query = useQuery({
        queryKey,
        queryFn: () => fetchPlanHype(planId),
        staleTime: 20_000,
    });

    useEffect(() => {
        if (!socket) return;
        const onUpdated = (payload: { planId: string }) => {
            if (payload.planId === planId) queryClient.invalidateQueries({ queryKey });
        };
        socket.on('plan_hype_updated', onUpdated);
        return () => socket.off('plan_hype_updated', onUpdated);
    }, [planId, queryClient, socket]);

    return query;
}
