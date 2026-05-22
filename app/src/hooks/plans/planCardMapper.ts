import type { PlanCardPlan } from '../../components/plans/PlanCard';
import { getActivityIcon } from '../../constants/planActivityIcons';
import type { Plan, PlanStatus } from '../../types/plans';
import { resolvePlanGoing } from './planGoing';

function formatDaysLabel(status: PlanStatus, startsAt: string): string {
    if (status === 'live') return 'Live now';
    if (status === 'past') return 'Completed';
    const start = new Date(startsAt);
    const now = new Date();
    const diffMs = start.getTime() - now.getTime();
    if (diffMs < 1000 * 60 * 60 * 24) return 'Today';
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (days <= 0) return 'Today';
    if (days === 1) return '1 day left';
    return `${days} days left`;
}

function startOfDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

function sectionForPlan(status: PlanStatus, startsAt: string): string {
    if (status === 'live') return 'Happening Now';
    if (status === 'past') return 'Earlier';

    const start = startOfDay(new Date(startsAt));
    const today = startOfDay(new Date());
    const diffDays = Math.round((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Earlier';
    if (diffDays <= 6) return 'This Week';
    if (diffDays <= 13) return 'Next Week';
    if (diffDays <= 30) return 'This Month';
    return 'Later';
}

export function mapPlanToCardPlan(plan: Plan): PlanCardPlan {
    const { going, goingCount } = resolvePlanGoing(plan);

    return {
        id: plan.id,
        groupId: plan.groupId,
        activityLabel: plan.activityLabel,
        activityIcon: getActivityIcon(plan.activityLabel),
        startsAt: plan.startsAt,
        location: plan.location,
        locationDetail: plan.location ?? undefined,
        placeId: plan.placeId ?? null,
        status: plan.status,
        groupName: plan.groupName,
        groupCoverUrl: plan.groupCoverUrl ?? null,
        going,
        goingCount,
        placePhotoUrl: plan.placePhotoUrl ?? null,
        groupDescription: plan.groupDescription ?? null,
        createdBy: plan.createdBy,
        creatorName: plan.creatorName ?? null,
        creatorAvatarUrl: plan.creatorAvatarUrl ?? null,
        isHost: plan.isHost,
        hasRsvp: plan.hasRsvp,
        myRsvp: plan.myRsvp ?? null,
        daysLabel: formatDaysLabel(plan.status, plan.startsAt),
        section: sectionForPlan(plan.status, plan.startsAt),
    };
}
