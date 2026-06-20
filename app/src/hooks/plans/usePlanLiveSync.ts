import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '../useSocket';

const BRING_EVENTS = [
    'bring_item_added',
    'bring_item_claimed',
    'bring_item_unclaimed',
    'bring_item_upvoted',
    'bring_item_deleted',
    'bring_item_pinned',
] as const;

type PlanEvent = { planId?: string; id?: string; action?: string };

export function usePlanLiveSync(planId?: string) {
    const socket = useSocket();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!socket) return;

        const refreshPlan = (event: PlanEvent) => {
            const changedPlanId = event.planId || event.id;
            queryClient.invalidateQueries({ queryKey: ['plans'] });
            if (planId && changedPlanId === planId) {
                queryClient.invalidateQueries({ queryKey: ['plan', planId] });
                if (event.action === 'rsvp') {
                    queryClient.invalidateQueries({ queryKey: ['plan-hype', planId] });
                }
            }
        };

        const refreshHype = (event: PlanEvent) => {
            if (event.planId !== planId) return;
            queryClient.invalidateQueries({ queryKey: ['plan-hype', planId] });
        };

        const refreshBring = (event: PlanEvent) => {
            if (event.planId !== planId) return;
            queryClient.invalidateQueries({ queryKey: ['bring', planId] });
            queryClient.invalidateQueries({ queryKey: ['plan-hype', planId] });
        };

        socket.on('plan_updated', refreshPlan);
        socket.on('plan_hype_updated', refreshHype);
        BRING_EVENTS.forEach((eventName) => socket.on(eventName, refreshBring));

        return () => {
            socket.off('plan_updated', refreshPlan);
            socket.off('plan_hype_updated', refreshHype);
            BRING_EVENTS.forEach((eventName) => socket.off(eventName, refreshBring));
        };
    }, [planId, queryClient, socket]);
}
