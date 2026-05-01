import React from 'react';
import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import MandaliCoin from '../../MandaliCoin';

interface BountiesListProps {
    prizes: any[];
    isTablet: boolean;
}

const BountiesList: React.FC<BountiesListProps> = ({ prizes, isTablet }) => {
    return (
        <View>
            {prizes.map((prize: any, idx: number) => (
                <View
                    key={prize.id || idx}
                    className="flex-row items-center justify-between p-4 rounded-3xl bg-stone-50 border border-stone-100 mb-4"
                >
                    <View className="flex-row items-center flex-1 mr-4">
                        <View
                            style={{ elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1 }}
                            className="rounded-2xl items-center justify-center bg-white w-12 h-12 mr-4 border border-stone-100"
                        >
                            <MaterialIcons name={(prize.icon as any) || 'emoji-events'} size={24} color="#b30069" />
                        </View>
                        <View className="flex-1">
                            <Text className="font-headline-bold text-base" style={{ color: '#1c1c18' }} numberOfLines={1}>{prize.name}</Text>
                            <Text className="text-stone-400 font-body-medium mt-0.5 text-[11px]" numberOfLines={2}>
                                {prize.description || 'Winning Category'}
                            </Text>
                        </View>
                    </View>
                    <View className="flex-row items-center bg-pink-100 rounded-2xl px-4 py-2">
                        <Text className="font-headline-bold mr-1.5 text-lg" style={{ color: '#b30069' }}>{prize.amount}</Text>
                        <MandaliCoin size={14} />
                    </View>
                </View>
            ))}
        </View>
    );
};

export default React.memo(BountiesList);
