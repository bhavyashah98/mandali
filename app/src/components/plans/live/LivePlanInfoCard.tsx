import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { PlanCardPlan } from '../PlanCard';
import { formatLiveDate, formatLiveTime } from './livePlanFormat';
import { openPlanLocationInMaps } from '../../../lib/planMaps';

const cardStyle = {
    shadowColor: '#b30069',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
};

const LivePlanInfoCard = ({ plan }: { plan: PlanCardPlan }) => (
    <View className="mx-6 mt-6 bg-white border border-stone-100 rounded-[20px] px-5 py-5" style={cardStyle}>
        <View className="flex-row items-center">
            <MaterialIcons name="calendar-today" size={18} color="#594048" />
            <Text className="font-body-bold text-[#594048] ml-3 flex-1">
                {formatLiveDate(plan.startsAt)}
            </Text>
            <MaterialIcons name="schedule" size={18} color="#594048" />
            <Text className="font-body-bold text-[#594048] ml-2">
                {formatLiveTime(plan.startsAt)}
            </Text>
        </View>

        <View className="flex-row items-start mt-4">
            <MaterialIcons name="place" size={20} color="#594048" />
            <View className="flex-1 ml-3">
                <Text className="font-body-bold text-[#594048]">{plan.location}</Text>
                <Text className="font-body-medium text-stone-400 mt-0.5">
                    {plan.locationDetail}
                </Text>
            </View>
            <TouchableOpacity onPress={() => openPlanLocationInMaps(plan)} disabled={!plan.location}>
                <Text className="font-body-bold text-[#b30069] text-xs">View on Map</Text>
            </TouchableOpacity>
        </View>
    </View>
);

export default LivePlanInfoCard;
