import React from 'react';
import { View, Text } from 'react-native';
import MandaliCoin from '../../MandaliCoin';

interface StartingStatsProps {
    participantsCount: number;
    totalPrizePool: number;
    isTablet: boolean;
}

const StartingStats: React.FC<StartingStatsProps> = ({
    participantsCount,
    totalPrizePool,
    isTablet
}) => {
    return (
        <View className={`flex-row items-center justify-between px-8 ${isTablet ? 'mb-8' : 'mb-6'}`}>
            <View 
                style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}
                className="bg-white rounded-3xl p-4 flex-1 mr-4 border border-stone-100 items-center"
            >
                <Text className="text-stone-400 font-body-bold uppercase text-[9px] mb-1 tracking-widest text-center">Confirmed Players</Text>
                <Text className="font-headline-bold text-xl" style={{ color: '#1c1c18' }}>{participantsCount}</Text>
            </View>
            <View 
                style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}
                className="bg-white rounded-3xl p-4 flex-1 border border-stone-100 items-center"
            >
                <Text className="text-stone-400 font-body-bold uppercase text-[9px] mb-1 tracking-widest text-center">Total Reward</Text>
                <View className="flex-row items-center">
                    <Text className="font-headline-bold text-xl mr-1" style={{ color: '#1c1c18' }}>{totalPrizePool}</Text>
                    <MandaliCoin size={14} />
                </View>
            </View>
        </View>
    );
};

export default React.memo(StartingStats);
