import React from 'react';
import { Text, View } from 'react-native';
import type { PlanCardPlan } from '../PlanCard';
import { formatLiveTime } from '../live/livePlanFormat';

const cardStyle = {
    shadowColor: '#b30069',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
};

const PastStatsCard = ({ plan, goingCount }: { plan: PlanCardPlan; goingCount: number }) => (
    <View className="mx-6 mt-7 rounded-[20px] bg-[#fff0f8] flex-row overflow-hidden" style={cardStyle}>
        <View className="flex-1 items-center py-5">
            <Text className="font-body-bold text-[#594048] text-xs">Went</Text>
            <Text className="font-headline-bold text-[#1c1c18] text-xl mt-2">{goingCount}</Text>
        </View>
        <View className="w-px bg-[#f7cfe3]" />
        <View className="flex-1 items-center py-5">
            <Text className="font-body-bold text-[#594048] text-xs">Started</Text>
            <Text className="font-headline-bold text-[#1c1c18] text-xl mt-2">{formatLiveTime(plan.startsAt)}</Text>
        </View>
        <View className="w-px bg-[#f7cfe3]" />
        <View className="flex-1 items-center py-5">
            <Text className="font-body-bold text-[#594048] text-xs">Status</Text>
            <Text className="font-headline-bold text-[#1c1c18] text-xl mt-2">Done</Text>
        </View>
    </View>
);

export default PastStatsCard;
