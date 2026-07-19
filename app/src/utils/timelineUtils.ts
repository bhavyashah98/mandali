import { GroupTimelineItem, GroupTimelineItemType } from '../lib/api';

export const getTimelineTone = (type: GroupTimelineItemType) => {
    switch (type) {
        case 'plan':
            return { bg: '#f3e8ff', color: '#7c3aed', icon: 'calendar' };
        case 'memory':
            return { bg: '#fff0f5', color: '#b30069', icon: 'images' };
        case 'expense':
            return { bg: '#ecfdf5', color: '#059669', icon: 'receipt' };
        case 'settlement':
            return { bg: '#f0fdfa', color: '#0f766e', icon: 'checkmark-done' };
        case 'housie_result':
        case 'blink_result':
            return { bg: '#eff6ff', color: '#2563eb', icon: 'game-controller' };
        case 'milestone':
        default:
            return { bg: '#fff7ed', color: '#ea580c', icon: 'sparkles' };
    }
};

export const getTypeLabel = (type: GroupTimelineItemType) => {
    switch (type) {
        case 'housie_result':
            return 'Housie';
        case 'blink_result':
            return 'Blink';
        case 'milestone':
            return 'Milestone';
        default:
            return type.charAt(0).toUpperCase() + type.slice(1);
    }
};

export const formatTimelineDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const getTimelineImage = (item: GroupTimelineItem) => {
    if (item.metadata?.thumbnailUrl) return item.metadata.thumbnailUrl;
    if (item.metadata?.placePhotoUrl) return item.metadata.placePhotoUrl;
    if (Array.isArray(item.metadata?.imageUrls) && item.metadata.imageUrls.length > 0) return item.metadata.imageUrls[0];
    return null;
};
