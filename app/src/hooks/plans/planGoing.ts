import type { PlanRsvpUser } from '../../types/plans';

type PlanGoingSource = {
    going?: PlanRsvpUser[];
    goingCount?: number;
};

/** Only members with an explicit "going" RSVP are shown as going. */
export function resolvePlanGoing(plan: PlanGoingSource): { going: PlanRsvpUser[]; goingCount: number } {
    const going = (plan.going ?? []).filter((g) => g.status === 'going');
    const goingCount = going.length;
    return { going, goingCount };
}
