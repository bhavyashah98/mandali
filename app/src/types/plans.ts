export type PlanStatus = 'upcoming' | 'live' | 'past';

export interface PlanActivity {
    id: string;
    name: string;
}

export interface Plan {
    id: string;
    groupId: string;
    groupName: string;
    activityId: string;
    activityLabel: string;
    startsAt: string;
    endsAt: string;
    location?: string | null;
    status: PlanStatus;
    createdBy?: string;
    creatorName?: string;
}

export interface CreatePlanPayload {
    groupId: string;
    activityId: string;
    activityLabel: string;
    startsAt: string;
    endsAt?: string;
    location?: string;
}
