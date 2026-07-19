export type TimelineItemType =
    | 'plan'
    | 'memory'
    | 'expense'
    | 'settlement'
    | 'housie_result'
    | 'blink_result'
    | 'milestone';

export type TimelineItem = {
    id: string;
    type: TimelineItemType;
    occurredAt: string;
    title: string;
    subtitle?: string | null;
    groupId: string;
    actor?: {
        id: string;
        name: string;
        avatarUrl?: string | null;
    } | null;
    metadata: Record<string, any>;
};
