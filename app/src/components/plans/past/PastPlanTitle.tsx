import React from 'react';
import { Text, View } from 'react-native';
import type { PlanCardPlan } from '../PlanCard';

const PastPlanTitle = ({ plan }: { plan: PlanCardPlan }) => (
    <View className="px-6 pt-6">
        <Text className="font-headline-bold text-[#1c1c18] text-3xl">
            {plan.activityLabel}
        </Text>
        <Text className="font-body-medium text-[#594048] mt-1" numberOfLines={1}>
            {plan.groupName}
        </Text>
    </View>
);

export default PastPlanTitle;
