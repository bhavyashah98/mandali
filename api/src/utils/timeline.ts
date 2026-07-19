import { TimelineItem, TimelineItemType } from '../types/timeline';

export const ALLOWED_TIMELINE_TYPES: TimelineItemType[] = [
    'plan',
    'memory',
    'expense',
    'settlement',
    'housie_result',
    'blink_result',
    'milestone',
];

export const toTimelineItemType = (value: any): TimelineItemType | null => {
    return ALLOWED_TIMELINE_TYPES.includes(value) ? value : null;
};

export const actorFromUser = (id?: string | null, user?: any) => {
    if (!id) return null;
    return {
        id,
        name: user?.name || 'Member',
        avatarUrl: user?.avatar_url ?? null,
    };
};

export const getPrimaryImageUrl = (imageUrls: any) => {
    if (!Array.isArray(imageUrls) || imageUrls.length === 0) return null;
    return imageUrls[0];
};

export const formatCurrency = (amount: any) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;

export const getTimelineSubtitle = (parts: Array<string | null | undefined>) => parts.filter(Boolean).join(' • ');

export const buildMilestoneItems = (groupId: string, group: any, stats: {
    completedPlans: any[];
    expenses: any[];
    memories: any[];
    games: any[];
}) => {
    const milestones: TimelineItem[] = [];
    const addMilestone = (id: string, occurredAt: string | null | undefined, title: string, subtitle: string, metadata: Record<string, any>) => {
        if (!occurredAt) return;
        milestones.push({
            id,
            type: 'milestone',
            occurredAt,
            title,
            subtitle,
            groupId,
            actor: null,
            metadata,
        });
    };

    const completedPlans = [...stats.completedPlans].sort((a, b) =>
        new Date(a.starts_at || a.ends_at || a.created_at).getTime() - new Date(b.starts_at || b.ends_at || b.created_at).getTime()
    );
    [5, 10, 25, 50, 100].forEach((threshold) => {
        if (completedPlans.length >= threshold) {
            const plan = completedPlans[threshold - 1];
            addMilestone(
                `milestone:${groupId}:plans:${threshold}`,
                plan.starts_at || plan.ends_at || plan.created_at,
                `${threshold}th meetup unlocked`,
                `This Mandali has planned ${threshold} moments together.`,
                {
                    milestoneType: 'plans_completed',
                    value: threshold,
                    sourcePlanId: plan.id,
                    shareText: `Our Mandali just unlocked its ${threshold}th meetup!`,
                }
            );
        }
    });

    const sortedExpenses = [...stats.expenses].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const expensesTotal = sortedExpenses.reduce((sum: number, expense: any) => sum + Number(expense.amount || 0), 0);
    [10000, 50000, 100000, 250000].forEach((threshold) => {
        if (expensesTotal >= threshold) {
            let runningTotal = 0;
            const crossedAtExpense = sortedExpenses.find((expense: any) => {
                runningTotal += Number(expense.amount || 0);
                return runningTotal >= threshold;
            });
            addMilestone(
                `milestone:${groupId}:expenses:${threshold}`,
                crossedAtExpense?.created_at,
                `${formatCurrency(threshold)} split together`,
                `This Mandali has tracked ${formatCurrency(expensesTotal)} in shared Hisaab.`,
                {
                    milestoneType: 'expenses_total',
                    value: threshold,
                    total: expensesTotal,
                    shareText: `Our Mandali has split ${formatCurrency(threshold)} together!`,
                }
            );
        }
    });

    const sortedMemories = [...stats.memories].sort((a, b) =>
        new Date(a.memory_date || a.created_at).getTime() - new Date(b.memory_date || b.created_at).getTime()
    );
    [10, 50, 100, 250].forEach((threshold) => {
        if (sortedMemories.length >= threshold) {
            const memory = sortedMemories[threshold - 1];
            addMilestone(
                `milestone:${groupId}:memories:${threshold}`,
                memory.memory_date || memory.created_at,
                `${threshold} memories saved`,
                `Your group archive now has ${sortedMemories.length} memories.`,
                {
                    milestoneType: 'memories_total',
                    value: threshold,
                    total: sortedMemories.length,
                    shareText: `Our Mandali has saved ${threshold} memories together!`,
                }
            );
        }
    });

    const sortedGames = [...stats.games].sort((a, b) =>
        new Date(a.scheduled_at || a.created_at).getTime() - new Date(b.scheduled_at || b.created_at).getTime()
    );
    [1, 10, 25, 50].forEach((threshold) => {
        if (sortedGames.length >= threshold) {
            const game = sortedGames[threshold - 1];
            addMilestone(
                `milestone:${groupId}:games:${threshold}`,
                game.scheduled_at || game.created_at,
                threshold === 1 ? 'First game played' : `${threshold} games played`,
                threshold === 1 ? 'The first Mandali game is now part of your story.' : `This Mandali has played ${threshold} games together.`,
                {
                    milestoneType: 'games_total',
                    value: threshold,
                    total: sortedGames.length,
                    shareText: threshold === 1 ? 'Our Mandali played its first game!' : `Our Mandali has played ${threshold} games together!`,
                }
            );
        }
    });

    const createdAt = group?.created_at ? new Date(group.created_at) : null;
    if (createdAt) {
        const ageDays = Math.floor((Date.now() - createdAt.getTime()) / (24 * 60 * 60 * 1000));
        [
            { days: 30, label: '1 month' },
            { days: 180, label: '6 months' },
            { days: 365, label: '1 year' },
        ].forEach((threshold) => {
            if (ageDays >= threshold.days) {
                const occurredAt = new Date(createdAt.getTime() + threshold.days * 24 * 60 * 60 * 1000).toISOString();
                addMilestone(
                    `milestone:${groupId}:age:${threshold.days}`,
                    occurredAt,
                    `${threshold.label} of this Mandali`,
                    'Your group has been building history together.',
                    {
                        milestoneType: 'group_age',
                        value: threshold.days,
                        shareText: `Our Mandali just completed ${threshold.label}!`,
                    }
                );
            }
        });
    }

    return milestones;
};
