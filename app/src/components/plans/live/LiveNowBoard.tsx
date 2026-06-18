import React from 'react';
import { Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { PlanCardPlan } from '../PlanCard';
import type { PlanRsvpUser } from '../../../types/plans';

const shadow = {
    shadowColor: '#b30069',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
};

export default function LiveNowBoard({ plan, going }: { plan: PlanCardPlan; going: PlanRsvpUser[] }) {
    const leadNames = going.slice(0, 3).map((p) => p.name).join(', ');

    return (
        <View className="mx-6 mt-6 rounded-[28px] border border-[#f7cfe3] bg-[#fff0f7] p-5" style={shadow}>
            <View className="mb-4 flex-row items-center justify-between">
                <View>
                    <Text className="font-body-bold text-[10px] uppercase tracking-[3px] text-[#b30069]">Live Pulse</Text>
                    <Text className="mt-1 font-headline-bold text-2xl text-[#1c1c18]">Plan is happening</Text>
                </View>
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white">
                    <MaterialIcons name="bolt" size={26} color="#b30069" />
                </View>
            </View>
            <View className="flex-row gap-3">
                <View className="flex-1 rounded-2xl bg-white/75 p-4">
                    <Text className="font-body-bold text-[10px] uppercase tracking-widest text-[#8b6b73]">In</Text>
                    <Text className="mt-1 font-headline-bold text-2xl text-[#1c1c18]">{going.length}</Text>
                </View>
                <View className="flex-[1.6] rounded-2xl bg-white/75 p-4">
                    <Text className="font-body-bold text-[10px] uppercase tracking-widest text-[#8b6b73]">Signal</Text>
                    <Text className="mt-1 font-body-bold text-sm text-[#594048]" numberOfLines={2}>
                        {leadNames ? `${leadNames} are already in.` : `${plan.groupName} is waiting for the first check-in.`}
                    </Text>
                </View>
            </View>
        </View>
    );
}
