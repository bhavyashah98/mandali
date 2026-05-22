export type PlanTab = 'active' | 'live' | 'past';

export const PLAN_TABS: { key: PlanTab; label: string }[] = [
    { key: 'active', label: 'Active' },
    { key: 'live', label: 'Live' },
    { key: 'past', label: 'Completed' },
];
