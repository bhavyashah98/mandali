import React from 'react';
import { View, Text } from 'react-native';

interface PlanCardBadgeProps {
    label?: string;
    live?: boolean;
}

const PlanCardBadge = ({ label, live }: PlanCardBadgeProps) => {
    if (!label) return null;

    return (
        <View className={`${live ? 'bg-[#b30069]' : 'bg-[#fff0f7]'} px-3 py-1.5 rounded-full`}>
            <Text className={`font-body-bold text-[10px] ${live ? 'text-white' : 'text-[#b30069]'}`}>
                {live ? 'Live' : label}
            </Text>
        </View>
    );
};

export default PlanCardBadge;
