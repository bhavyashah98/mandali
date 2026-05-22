import { MaterialIcons } from '@expo/vector-icons';

export type PlanActivityIconName = keyof typeof MaterialIcons.glyphMap;

/** Keyword → icon; first match wins (order matters for overlaps). */
const ACTIVITY_ICON_RULES: { keywords: string[]; icon: PlanActivityIconName }[] = [
    { keywords: ['party', 'celebration', 'birthday'], icon: 'celebration' },
    { keywords: ['trip', 'travel', 'vacation', 'holiday', 'tour'], icon: 'flight' },
    { keywords: ['hotel', 'stay', 'resort', 'lodging'], icon: 'hotel' },
    { keywords: ['movie', 'film', 'cinema', 'watch'], icon: 'local-movies' },
    { keywords: ['dinner', 'lunch', 'brunch', 'food', 'restaurant', 'eat'], icon: 'restaurant' },
    { keywords: ['coffee', 'cafe', 'tea'], icon: 'local-cafe' },
    { keywords: ['cricket', 'football', 'soccer', 'sport', 'match', 'game night'], icon: 'sports-cricket' },
    { keywords: ['game', 'gaming', 'housie', 'blink'], icon: 'sports-esports' },
    { keywords: ['kitty', 'cards', 'poker'], icon: 'casino' },
    { keywords: ['get-together', 'get together', 'meetup', 'gathering', 'reunion'], icon: 'groups' },
    { keywords: ['wedding', 'engagement', 'sangeet'], icon: 'favorite' },
    { keywords: ['concert', 'music', 'gig'], icon: 'music-note' },
    { keywords: ['beach', 'pool'], icon: 'beach-access' },
    { keywords: ['shop', 'shopping', 'mall'], icon: 'shopping-bag' },
    { keywords: ['hike', 'trek', 'camp', 'outdoor'], icon: 'terrain' },
    { keywords: ['meeting', 'office', 'work'], icon: 'work' },
    { keywords: ['puja', 'temple', 'religious'], icon: 'auto-awesome' },
];

/** Quick-pick labels shown when a group has no activities yet (user taps to add). */
export const PLAN_ACTIVITY_SUGGESTIONS = [
    'Party',
    'Trip',
    'Hotel',
    'Movie',
    'Dinner',
    'Coffee',
    'Cricket',
    'Get-together',
] as const;

export function getActivityIcon(activityName: string): PlanActivityIconName {
    const lower = activityName.trim().toLowerCase();
    for (const rule of ACTIVITY_ICON_RULES) {
        if (rule.keywords.some((kw) => lower.includes(kw))) {
            return rule.icon;
        }
    }
    return 'event';
}
