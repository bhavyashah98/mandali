import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { PlanCardPlan } from '../PlanCard';
import { formatLiveDate, formatLiveTime } from '../live/livePlanFormat';
import { openPlanLocationInMaps } from '../../../lib/planMaps';

const UpcomingPlanInfo = ({ plan }: { plan: PlanCardPlan }) => (
    <View className="px-6 pt-6">
        <Text className="font-headline-bold text-[#1c1c18] text-3xl">{plan.activityLabel}</Text>
        <View className="mt-5">
            <View className="flex-row items-center">
                <MaterialIcons name="calendar-today" size={18} color="#594048" />
                <Text className="font-body-bold text-[#594048] ml-3 flex-1">{formatLiveDate(plan.startsAt)}</Text>
                <MaterialIcons name="schedule" size={18} color="#594048" />
                <Text className="font-body-bold text-[#594048] ml-2">{formatLiveTime(plan.startsAt)}</Text>
            </View>
            <View className="flex-row items-start mt-4">
                <MaterialIcons name="place" size={20} color="#594048" />
                <View className="ml-3 flex-1">
                    <Text className="font-body-bold text-[#594048]">{plan.location}</Text>
                    <Text className="font-body-medium text-stone-400 mt-0.5">{plan.locationDetail}</Text>
                </View>
                <TouchableOpacity onPress={() => openPlanLocationInMaps(plan)} disabled={!plan.location}>
                    <Text className="font-body-bold text-[#b30069] text-xs">View on Map</Text>
                </TouchableOpacity>
            </View>
        </View>
    </View>
);

export default UpcomingPlanInfo;
