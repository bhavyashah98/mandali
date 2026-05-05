import React from 'react';
import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import MandaliCoin from '../../MandaliCoin';

interface Props {
    prizes: any[];
    ticketPrice: number;
    totalTickets: number;
    isTablet: boolean;
}

const WaitingRoomPrizes: React.FC<Props> = ({ prizes, ticketPrice, totalTickets, isTablet }) => {
    const totalPool = ticketPrice * totalTickets;

    if (!prizes || prizes.length === 0) return null;

    return (
        <View>
            {prizes.map((prize, index) => {
                const amount = Math.floor((totalPool * (prize.percentage || 0)) / 100);
                return (
                    <View
                        key={prize.id || index}
                        style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}
                        className={`flex-row items-center bg-white border border-stone-100 mb-4 ${isTablet ? 'rounded-3xl p-8' : 'rounded-2xl p-4'}`}
                    >
                        <View className={`rounded-full bg-stone-50 items-center justify-center border border-stone-100 ${isTablet ? 'w-24 h-24' : 'w-12 h-12'}`}>
                            <MaterialIcons name={prize.icon || 'stars'} size={isTablet ? 36 : 24} color="#b30069" />
                        </View>
                        <View className="ml-4 flex-1">
                            <Text className={`font-headline-bold text-[#594048] ${isTablet ? 'text-3xl' : 'text-base'}`}>{prize.name}</Text>
                            <Text className={`text-stone-400 font-body-medium ${isTablet ? 'text-xl mt-1' : 'text-xs'}`}>
                                {prize.percentage}% share
                            </Text>
                        </View>
                        <View className="items-end">
                            <View className="flex-row items-center">
                                <Text className={`font-headline-bold text-[#b30069] ${isTablet ? 'text-4xl' : 'text-xl'}`}>
                                    {amount}
                                </Text>
                                <MandaliCoin size={isTablet ? 28 : 16} style={{ marginLeft: 4 }} />
                            </View>
                            <Text className="text-stone-400 font-body-bold text-2xs uppercase">Est. Prize</Text>
                        </View>
                    </View>
                );
            })}
        </View>
    );
};

export default WaitingRoomPrizes;
