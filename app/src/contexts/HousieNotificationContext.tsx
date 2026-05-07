import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface HousieNotification {
    id: string;
    gameCode: string;
    groupId: string;
    title: string;
}

interface HousieNotificationContextType {
    queue: HousieNotification[];
    addNotification: (notification: Omit<HousieNotification, 'id'>) => void;
    removeNotification: (id: string) => void;
}

const HousieNotificationContext = createContext<HousieNotificationContextType | undefined>(undefined);

export const HousieNotificationProvider = ({ children }: { children: ReactNode }) => {
    const [queue, setQueue] = useState<HousieNotification[]>([]);

    const addNotification = useCallback((notification: Omit<HousieNotification, 'id'>) => {
        const id = Math.random().toString(36).substring(7);
        setQueue(prev => [...prev, { ...notification, id }]);
    }, []);

    const removeNotification = useCallback((id: string) => {
        setQueue(prev => prev.filter(n => n.id !== id));
    }, []);

    return (
        <HousieNotificationContext.Provider value={{ queue, addNotification, removeNotification }}>
            {children}
        </HousieNotificationContext.Provider>
    );
};

export const useHousieNotifications = () => {
    const context = useContext(HousieNotificationContext);
    if (!context) {
        throw new Error('useHousieNotifications must be used within a HousieNotificationProvider');
    }
    return context;
};
