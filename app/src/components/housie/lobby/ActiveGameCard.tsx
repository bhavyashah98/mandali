import React, { memo } from 'react';
import { View, Text } from 'react-native';

interface ActiveGameCardProps {
    gameCode: string;
    hostName: string;
    isTablet: boolean;
}

const ActiveGameCard = ({ gameCode, hostName, isTablet }: ActiveGameCardProps) => {
    return (
        <View 
            style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}
            className={`mt-8 items-center bg-white rounded-[40px] border border-stone-100 w-full ${isTablet ? 'p-12' : 'p-6'}`}
        >
            <Text className={`text-stone-400 font-body-bold uppercase tracking-widest mb-3 ${isTablet ? 'text-xl' : 'text-xs'}`}>Live Game Code</Text>
            <Text className={`text-[#b30069] font-headline-bold mb-2 ${isTablet ? 'text-7xl' : 'text-4xl'}`}>{gameCode}</Text>
            <Text className={`text-stone-400 font-body-bold text-center ${isTablet ? 'text-2xl mt-2' : ''}`}>
                Hosted by: <Text className="text-stone-600">{hostName || 'MANDALI'}</Text>
            </Text>
        </View>
    );
};

export default memo(ActiveGameCard);
