import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
    prize: any;
    index: number;
    onUpdatePercentage: (id: string, val: string) => void;
    onRemove: (id: string) => void;
}

const PrizeCard: React.FC<Props> = ({ prize, index, onUpdatePercentage, onRemove }) => (
    <View className="bg-white p-5 rounded-[32px] mb-4 flex-row items-center border border-stone-100 shadow-sm">
        <View className="w-12 h-12 bg-stone-50 rounded-2xl items-center justify-center mr-4 border border-stone-100">
            <Text className="font-headline-bold text-[#b30069] text-lg">{index + 1}</Text>
        </View>
        <View className="flex-1">
            <Text className="font-headline-bold text-stone-800 text-base">{prize.name}</Text>
            <Text className="font-body text-stone-400 text-xs capitalize">
                {prize.category === 'bonus' ? 'Bonus Reward' : prize.category === 'fullhouse' ? 'Grand Prize' : 'Standard Reward'}
            </Text>
        </View>
        <TouchableOpacity 
            className="flex-row items-center bg-stone-50 px-4 py-2.5 rounded-2xl mr-3 border border-stone-100"
            onPress={() => {
                Alert.prompt(
                    `Set percentage`,
                    `Enter percentage of pool for ${prize.name}`,
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Update', onPress: (val) => onUpdatePercentage(prize.id, val || '0') }
                    ],
                    'plain-text',
                    prize.percentage.toString(),
                    'number-pad'
                );
            }}
        >
            <Text className="font-headline-bold text-[#b30069] text-xl">
                {prize.percentage}
            </Text>
            <Text className="font-headline-bold text-stone-400 ml-1">%</Text>
        </TouchableOpacity>
        <TouchableOpacity
            onPress={() => onRemove(prize.id)}
            className="w-10 h-10 items-center justify-center bg-red-50 rounded-2xl"
        >
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
        </TouchableOpacity>
    </View>
);

export default PrizeCard;
