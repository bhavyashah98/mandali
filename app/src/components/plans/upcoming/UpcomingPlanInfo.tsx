import React from 'react';
import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { PlanCardPlan } from '../PlanCard';
import { formatLiveDate, formatLiveTime } from '../live/livePlanFormat';

const UpcomingPlanInfo = ({ plan }: { plan: PlanCardPlan }) => (
    <View className="px-6">
        <View className="mt-4 flex-row items-center bg-stone-50/50 border border-stone-100 rounded-2xl p-4">
            <MaterialIcons name="calendar-today" size={18} color="#594048" />
            <Text className="font-body-bold text-[#594048] ml-3 flex-1">{formatLiveDate(plan.startsAt)}</Text>
            <MaterialIcons name="schedule" size={18} color="#594048" />
            <Text className="font-body-bold text-[#594048] ml-2">{formatLiveTime(plan.startsAt)}</Text>
        </View>
    </View>
);

export default UpcomingPlanInfo;
