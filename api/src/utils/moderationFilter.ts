/**
 * UGC Content Filtering Utility
 * Case-insensitive, whole-word matching, whitespace trimming, collapsing multiple spaces.
 */
export const BANNED_KEYWORDS = [
    'hate',
    'kill',
    'terrorist',
    'porn',
    'nude',
    'sex',
    'racial slurs',
    'abusive',
    'suicide',
    'bully',
    'harass',
    'spam',
    'threaten'
];

/**
 * Checks if text contains any banned keywords.
 * Returns true if objectionable content is detected, false otherwise.
 */
export const containsObjectionableContent = (text: string | null | undefined): boolean => {
    if (!text || typeof text !== 'string') return false;

    // Trim and collapse multiple spaces into single space, make lowercase
    const cleanText = text.trim().replace(/\s+/g, ' ').toLowerCase();

    for (const word of BANNED_KEYWORDS) {
        // Escape regex special chars to prevent syntax issues
        const escapedWord = word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        // Whole-word matching via word boundary regex
        const regex = new RegExp(`\\b${escapedWord}\\b`, 'i');
        if (regex.test(cleanText)) {
            return true;
        }
    }

    return false;
};
