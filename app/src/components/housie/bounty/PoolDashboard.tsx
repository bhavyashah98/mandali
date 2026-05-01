import React from 'react';
import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import MandaliCoin from '../../MandaliCoin';

interface Props {
    totalPrizePool: number;
    totalAllocated: number;
    isBalanced: boolean;
    participantCount: number;
    isTablet: boolean;
}

const PoolDashboard: React.FC<Props> = ({
    totalPrizePool, totalAllocated, isBalanced, participantCount, isTablet,
}) => {
    const overAllocated = totalAllocated > totalPrizePool;
    const fillPercent = Math.min((totalAllocated / Math.max(totalPrizePool, 1)) * 100, 100);

    return (
        <View 
            className="bg-white rounded-[40px] border border-stone-100"
            style={{ padding: isTablet ? 40 : 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}
        >

            <View className="flex-row items-center justify-between">
                {/* Left: total allocated (The HERO now) */}
                <View className="flex-1 mr-3">
                    <Text className="font-body-bold text-stone-400 uppercase tracking-wider"
                        style={{ fontSize: isTablet ? 16 : 9 }}>
                        Total Allocated
                    </Text>
                    <View className="flex-row items-center mt-1">
                        <Text
                            className="font-headline-bold"
                            style={{ fontSize: isTablet ? 52 : 28, color: '#b30069' }}
                            adjustsFontSizeToFit
                            numberOfLines={1}
                        >
                            {totalAllocated.toLocaleString()}
                        </Text>
                        <MandaliCoin size={isTablet ? 34 : 20} style={{ marginLeft: 8 }} />
                    </View>
                </View>

                {/* Right: stats and Total Match Pool (The secondary now) */}
                <View className="items-end">
                    <View className="flex-row items-center mb-2">
                        <View className="w-2 h-2 rounded-full bg-green-500 mr-1.5" />
                        <Text className="font-body-bold text-stone-400 uppercase"
                            style={{ fontSize: isTablet ? 14 : 10 }}>
                            {participantCount} Players
                        </Text>
                    </View>
                    
                    <View 
                        className="bg-stone-50 border border-stone-100 rounded-xl px-3 py-1.5 flex-row items-center"
                        style={{ elevation: 1 }}
                    >
                        <Text
                            className="font-body-bold text-stone-400 uppercase mr-2"
                            style={{ fontSize: isTablet ? 14 : 9 }}
                        >
                            Match Pool:
                        </Text>
                        <Text
                            className="font-headline-bold"
                            style={{ fontSize: isTablet ? 20 : 14, color: '#b30069' }}
                        >
                            {totalPrizePool.toLocaleString()}
                        </Text>
                        <MandaliCoin size={isTablet ? 16 : 12} style={{ marginLeft: 4 }} />
                    </View>
                </View>
            </View>

            {/* Progress bar */}
            <View className="h-1.5 bg-stone-100 rounded-full overflow-hidden mt-4 border border-stone-200">
                <View
                    className="h-full rounded-full"
                    style={{ width: `${fillPercent}%`, backgroundColor: isBalanced ? '#22c55e' : '#b30069' }}
                />
            </View>

            {/* Over-allocated warning */}
            {overAllocated && (
                <View className="flex-row items-center bg-orange-50 rounded-2xl px-3 py-2 mt-3">
                    <MaterialIcons name="warning" size={isTablet ? 22 : 14} color="#c2410c" />
                    <Text className="font-body-regular text-orange-800 ml-2 flex-1"
                        style={{ fontSize: isTablet ? 15 : 10 }}>
                        Allocated rewards exceed total collection.
                    </Text>
                </View>
            )}
        </View>
    );
};

export default PoolDashboard;
