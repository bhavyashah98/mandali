import React from 'react';
import { GroupTimelineItem } from '../../lib/api';
import { MilestoneTimelineCard } from './MilestoneTimelineCard';
import { StandardTimelineCard } from './StandardTimelineCard';

export const TimelineItemCard = ({
    item,
    isTablet,
    onShareMilestone,
}: {
    item: GroupTimelineItem;
    isTablet: boolean;
    onShareMilestone: (item: GroupTimelineItem) => void;
}) => {
    if (item.type === 'milestone') {
        return (
            <MilestoneTimelineCard
                item={item}
                isTablet={isTablet}
                onShareMilestone={onShareMilestone}
            />
        );
    }
    return <StandardTimelineCard item={item} isTablet={isTablet} />;
};
