import React from 'react';
import { Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { PlanCardPlan } from '../PlanCard';

const shadow = {
    shadowColor: '#1c1c18',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
};

export default function PastAfterglowCard({ plan, goingCount }: { plan: PlanCardPlan; goingCount: number }) {
    const host = plan.creatorName || 'Someone';

    return (
        <View className="mx-6 mt-7 rounded-[28px] border border-[#f7d7e8] bg-[#fff8fb] p-5" style={shadow}>
            <View className="mb-4 flex-row items-center">
                <View className="mr-3 h-12 w-12 items-center justify-center rounded-2xl bg-white">
                    <MaterialIcons name="auto-awesome" size={25} color="#b30069" />
                </View>
                <View className="flex-1">
                    <Text className="font-headline-bold text-xl text-[#1c1c18]">Afterglow</Text>
                    <Text className="font-body-medium text-xs text-[#8a7a80]">The plan is sealed into the Mandali timeline.</Text>
                </View>
            </View>
            <View className="rounded-2xl bg-white/75 px-4 py-3">
                <Text className="font-body-bold text-sm leading-5 text-[#594048]">
                    {host} pulled off {plan.activityLabel}. {goingCount} people made it real.
                </Text>
            </View>
        </View>
    );
}
