import React from 'react';
import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import MandaliCoin from '../../MandaliCoin';

interface RewardPoolTrackerProps {
    prizes: any[];
    winners: any;
    calledNumbersCount: number;
    getParticipantName: (userId: string) => string;
    isTablet: boolean;
}

const RewardPoolTracker: React.FC<RewardPoolTrackerProps> = ({
    prizes,
    winners: allWinners,
    calledNumbersCount,
    getParticipantName,
    isTablet
}) => {
    return (
        <View className={`mt-8 pt-12 border-t border-stone-100 ${isTablet ? 'px-12' : ''}`}>
            <Text className={`text-stone-400 font-body-bold uppercase tracking-[4px] mb-8 text-center ${isTablet ? 'text-xl' : 'text-[10px]'}`}>
                Reward Pool Tracker
            </Text>
            <View className="gap-3">
                {(prizes || []).map((prize: any) => {
                    const winnerList = allWinners?.[prize.id];
                    const winners = Array.isArray(winnerList) ? winnerList : (winnerList ? [winnerList] : []);
                    const isGlobalClosed = winners.length > 0 && winners[0].claimedOnIndex < calledNumbersCount;
                    const isPendingShare = winners.length > 0 && !isGlobalClosed;
                    const individualAmount = winners.length > 0 ? (prize.amount / winners.length).toFixed(0) : prize.amount;
                    
                    return (
                        <View 
                            key={prize.id}
                            style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}
                            className={`flex-row items-center rounded-[24px] ${isGlobalClosed ? 'bg-stone-100' : 'bg-white border border-stone-100'} mb-2 ${isTablet ? 'p-8' : 'p-4'}`}
                        >
                            <View 
                                style={{ backgroundColor: isGlobalClosed ? undefined : isPendingShare ? undefined : 'rgba(179, 0, 105, 0.05)' }}
                                className={`${isTablet ? 'w-20 h-20' : 'w-10 h-10'} rounded-full ${isGlobalClosed ? 'bg-stone-200' : isPendingShare ? 'bg-orange-50' : ''} items-center justify-center mr-4`}
                            >
                                <MaterialIcons 
                                    name={prize.icon || 'stars'} 
                                    size={isTablet ? 36 : 20} 
                                    color={isGlobalClosed ? '#a8a29e' : isPendingShare ? '#f97316' : '#b30069'} 
                                />
                            </View>
                            <View className="flex-1">
                                <Text className={`font-headline-bold ${isGlobalClosed ? 'text-stone-400 line-through' : 'text-[#31302d]'} ${isTablet ? 'text-3xl' : 'text-base'}`}>
                                    {prize.name}
                                </Text>
                                {winners.length > 0 && (
                                    <Text className={`uppercase font-body-bold mt-1 ${isGlobalClosed ? 'text-stone-400' : 'text-orange-500'} ${isTablet ? 'text-lg' : 'text-[9px]'}`}>
                                        {isGlobalClosed ? (winners.length > 1 ? `${winners.length} WINNERS CHECKED` : `Winner: ${getParticipantName(winners[0].userId)}`) : 'Verification in progress...'}
                                    </Text>
                                )}
                            </View>
                            <View className="flex-row items-center">
                                <Text className={`font-headline-bold ${isGlobalClosed ? 'text-stone-400' : 'text-[#b30069]'} ${isTablet ? 'text-4xl' : 'text-lg'}`}>
                                    {individualAmount}
                                </Text>
                                <MandaliCoin size={isTablet ? 32 : 14} style={{ marginLeft: 6 }} />
                            </View>
                        </View>
                    );
                })}
            </View>
        </View>
    );
};

export default React.memo(RewardPoolTracker);
