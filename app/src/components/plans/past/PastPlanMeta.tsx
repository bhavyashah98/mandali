import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { PlanCardPlan } from '../PlanCard';
import { formatLiveDate, formatLiveTime } from '../live/livePlanFormat';
import { openPlanLocationInMaps } from '../../../lib/planMaps';

const cardStyle = {
    shadowColor: '#b30069',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
};

const PastPlanMeta = ({ plan }: { plan: PlanCardPlan }) => (
    <View className="mx-6 mt-6 bg-white border border-stone-100 rounded-[20px] px-5 py-5" style={cardStyle}>
        <View className="flex-row items-center">
            <MaterialIcons name="calendar-today" size={18} color="#594048" />
            <Text className="font-body-bold text-[#594048] ml-3 flex-1">{formatLiveDate(plan.startsAt)}</Text>
            <MaterialIcons name="schedule" size={18} color="#594048" />
            <Text className="font-body-bold text-[#594048] ml-2">{formatLiveTime(plan.startsAt)}</Text>
        </View>
        <View className="flex-row items-start mt-4">
            <MaterialIcons name="place" size={20} color="#594048" />
            <View className="ml-3 flex-1">
                <Text className="font-body-bold text-[#594048]">{plan.location || 'Location not added'}</Text>
                {plan.locationDetail ? (
                    <Text className="font-body-medium text-stone-400 mt-0.5">{plan.locationDetail}</Text>
                ) : null}
            </View>
            <TouchableOpacity onPress={() => openPlanLocationInMaps(plan)} disabled={!plan.location}>
                <Text className="font-body-bold text-[#b30069] text-xs">View on Map</Text>
            </TouchableOpacity>
        </View>
    </View>
);

export default PastPlanMeta;
