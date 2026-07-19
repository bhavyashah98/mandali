export type PlanStatus = 'upcoming' | 'live' | 'past';
export type PlanRsvpStatus = 'going' | 'maybe' | 'cant_go';

export interface PlanActivity {
    id: string;
    name: string;
}

export interface PlanRsvpUser {
    userId: string;
    name: string;
    avatarUrl?: string | null;
    status: PlanRsvpStatus;
    note?: string | null;
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
    creatorName?: string | null;
    creatorAvatarUrl?: string | null;
    placeId?: string | null;
    placePhotoUrl?: string | null;
    groupDescription?: string | null;
    groupCoverUrl?: string | null;
    going?: PlanRsvpUser[];
    goingCount?: number;
    myRsvp?: { status: PlanRsvpStatus; note?: string | null } | null;
    isHost?: boolean;
    hasRsvp?: boolean;
    description?: string | null;
    memberCount?: number;
}

export interface CreatePlanPayload {
    groupId: string;
    activityId: string;
    activityLabel: string;
    startsAt: string;
    endsAt?: string;
    location?: string;
    placeId?: string;
    placePhotoUrl?: string;
    description?: string;
}

export type UpdatePlanPayload = Omit<CreatePlanPayload, 'groupId'>;

export interface SubmitPlanRsvpPayload {
    status: PlanRsvpStatus;
    note?: string;
}

export interface BringItem {
    id: string;
    planId: string;
    name: string;
    addedBy: string;
    addedByName: string;
    isPinned: boolean;
    claimedBy: string | null;
    claimedByName: string | null;
    claimedByAvatar: string | null;
    upvoteCount: number;
    hasUpvoted: boolean;
    createdAt: string;
}

export interface AddBringItemPayload {
    name: string;
    autoClaim?: boolean;
}
