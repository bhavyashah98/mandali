import { useMemo } from 'react';
import type { PlanCardPlan } from '../PlanCard';

function buildSections(plans: PlanCardPlan[]) {
    const grouped = plans.reduce<Record<string, PlanCardPlan[]>>((acc, plan) => {
        const section = plan.section || 'Plans';
        acc[section] = [...(acc[section] || []), plan];
        return acc;
    }, {});

    return Object.entries(grouped).map(([title, data]) => ({ title, data }));
}

export function usePlanSections(plans: PlanCardPlan[]) {
    return useMemo(() => buildSections(plans), [plans]);
}
