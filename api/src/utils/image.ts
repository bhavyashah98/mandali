/**
 * Helper to sanitize incoming image URLs (handles legacy client objects/strings)
 */
export const sanitizeImageUrl = (url: any) => {
    if (!url) return null;
    // If it's the full Cloudinary object { url, publicId }
    if (typeof url === 'object' && url.url) return url.url;
    // If it's a string (could be a plain URL or a stringified JSON)
    if (typeof url === 'string') {
        if (url === '[object Object]') return null;
        try {
            // Check if it's a stringified JSON object
            if (url.startsWith('{')) {
                const parsed = JSON.parse(url);
                if (parsed.url) return parsed.url;
            }
        } catch (e) {
            // Not JSON, treat as plain string
        }
        return url;
    }
    return null;
};
