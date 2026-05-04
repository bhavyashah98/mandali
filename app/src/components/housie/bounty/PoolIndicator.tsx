import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
    totalPercentage: number;
    isValid: boolean;
}

const PoolIndicator: React.FC<Props> = ({ totalPercentage, isValid }) => (
    <View className={`p-6 rounded-[32px] mb-6 flex-row items-center justify-between ${isValid ? 'bg-green-50 border border-green-100' : 'bg-orange-50 border border-orange-100'}`}>
        <View>
            <Text className={`font-headline-bold text-2xl ${isValid ? 'text-green-700' : 'text-orange-700'}`}>{totalPercentage}%</Text>
            <Text className="font-body text-stone-500 text-sm">Total Allocated</Text>
        </View>
        <View className={`w-12 h-12 rounded-full items-center justify-center ${isValid ? 'bg-green-500' : 'bg-orange-500'}`}>
            <Ionicons name={isValid ? "checkmark" : "warning"} size={24} color="white" />
        </View>
    </View>
);

export default PoolIndicator;
