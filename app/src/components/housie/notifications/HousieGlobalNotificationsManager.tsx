import React from 'react';
import { useHousieNotifications } from '../../../contexts/HousieNotificationContext';
import { useHousieGlobalNotifications } from '../../../hooks/housie/useHousieGlobalNotifications';
import { HousieInAppBanner } from './HousieInAppBanner';

export const HousieGlobalNotificationsManager = () => {
    // This hook sets up the socket listeners
    useHousieGlobalNotifications();

    const { queue, removeNotification } = useHousieNotifications();

    if (queue.length === 0) return null;

    // Show only the first notification in the queue
    const currentNotification = queue[0];

    return (
        <HousieInAppBanner
            key={currentNotification.id}
            notification={currentNotification}
            onClose={() => removeNotification(currentNotification.id)}
        />
    );
};
