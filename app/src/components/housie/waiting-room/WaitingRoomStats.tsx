import React from 'react';
import { View, Text } from 'react-native';

interface WaitingRoomStatsProps {
    playerCount: number;
    ticketCount: number;
    isTablet: boolean;
}

const WaitingRoomStats: React.FC<WaitingRoomStatsProps> = ({ playerCount, ticketCount, isTablet }) => {
    return (
        <View 
            style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}
            className={`bg-white rounded-3xl border border-stone-100 items-center ${isTablet ? 'p-12' : 'p-6'}`}
        >
            <View className={`flex-row justify-between w-full ${isTablet ? 'px-16' : 'px-4'}`}>
                <View className="items-center">
                    <Text className={`text-stone-400 uppercase font-body-bold mb-1 ${isTablet ? 'text-lg' : 'text-2xs'}`}>Players</Text>
                    <Text className={`font-headline-bold text-primary ${isTablet ? 'text-5xl' : 'text-xl'}`}>{playerCount}</Text>
                </View>
                <View className="items-center">
                    <Text className={`text-stone-400 uppercase font-body-bold mb-1 ${isTablet ? 'text-lg' : 'text-2xs'}`}>Total Tickets</Text>
                    <Text className={`font-headline-bold text-primary ${isTablet ? 'text-5xl' : 'text-xl'}`}>{ticketCount}</Text>
                </View>
            </View>
        </View>
    );
};

export default React.memo(WaitingRoomStats);
