export const NOTIFICATION_TYPES = {
    // Pulse
    PULSE_INCREASED: 'pulse_increased',
    // Plans
    PLAN_CREATED: 'plan_created',
    PLAN_UPDATED: 'plan_updated',
    PLAN_RSVP: 'plan_rsvp',
    PLAN_CANCELLED: 'plan_cancelled',
    // Memories
    MEMORY_ADDED: 'memory_added',
    MEMORY_COMMENT: 'memory_comment',
    MEMORY_REACTION: 'memory_reaction',
    // Streak
    STREAK_UPDATED: 'streak_updated',
    // Hisaab
    HISAAB_ADDED: 'hisaab_added',
    HISAAB_SETTLED: 'hisaab_settled',
    // Games
    HOUSIE_CREATED: 'housie_created',
    BLINK_CREATED: 'blink_created',
    // Birthdays
    BIRTHDAY_WISH: 'birthday_wish',
    BIRTHDAY_TODAY: 'birthday_today',
    BIRTHDAY_UPCOMING: 'birthday_upcoming',
} as const;

export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];
