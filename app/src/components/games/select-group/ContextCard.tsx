import React from 'react';
import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useIsTablet } from '../../../hooks/useIsTablet';

interface ContextCardProps {
    icon: keyof typeof MaterialIcons.glyphMap;
    title: string;
    description: string;
}

export const ContextCard: React.FC<ContextCardProps> = ({ icon, title, description }) => {
    const isTablet = useIsTablet();

    return (
        <View 
            style={{ backgroundColor: 'rgba(179, 0, 105, 0.05)' }}
            className={`rounded-[32px] ${isTablet ? 'p-12' : 'p-5'}`}
        >
            <MaterialIcons name={icon} size={isTablet ? 48 : 24} color="#b30069" className="mb-4" />
            <Text className={`font-headline-bold text-[#1c1c18] mb-2 ${isTablet ? 'text-3xl' : 'text-[15px]'}`}>{title}</Text>
            <Text className={`font-body-medium text-stone-500 leading-relaxed ${isTablet ? 'text-2xl' : 'text-[13px]'}`}>
                {description}
            </Text>
        </View>
    );
};

export const ContextCardsContainer: React.FC = () => {
    const isTablet = useIsTablet();

    return (
        <View className={`gap-4 flex-1 w-full pb-12 ${isTablet ? 'mt-12' : 'mt-4'}`}>
            <View 
                style={{ backgroundColor: 'rgba(231, 229, 228, 0.8)' }}
                className={`h-[1px] w-full mb-${isTablet ? '12' : '4'} mt-2`} 
            />
            <ContextCard 
                icon="sports-esports"
                title="Multiplayer Fun"
                description="Play classic games like Housie and Blink live with your Mandali circle."
            />
            <ContextCard 
                icon="emoji-events"
                title="Group Rewards"
                description="Compete for glory and climb the leaderboard in every group you join."
            />
            <ContextCard 
                icon="notifications-active"
                title="Real-time Play"
                description="Get notified as soon as a game starts and jump right into the action."
            />
        </View>
    );
};
