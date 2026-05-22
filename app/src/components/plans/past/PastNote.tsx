import React from 'react';
import { Text, View } from 'react-native';
import type { PlanCardPlan } from '../PlanCard';

const PastNote = ({ plan }: { plan: PlanCardPlan }) => (
    <View className="px-6 mt-7">
        <Text className="font-body-bold text-[#1c1c18] mb-2">Summary</Text>
        <Text className="font-body-medium text-[#1c1c18] leading-5">
            {plan.creatorName ? `${plan.creatorName} completed this plan` : 'This plan is completed'}
            {plan.groupName ? ` for ${plan.groupName}.` : '.'}
        </Text>
    </View>
);

export default PastNote;
