import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { PLAN_HERO_FALLBACK_URI } from '../../../constants/planAssets';
import type { PlanCardPlan } from '../PlanCard';

const UpcomingPlanHero = ({ plan, onBack }: { plan: PlanCardPlan; onBack: () => void }) => {
    const heroUri = plan.placePhotoUrl || PLAN_HERO_FALLBACK_URI;

    return (
        <View className="h-72 overflow-hidden">
            <Image source={{ uri: heroUri }} style={{ position: 'absolute', width: '100%', height: '100%' }} contentFit="cover" />
            <View className="absolute inset-0 bg-black/25" />
            <View className="flex-row items-center justify-between px-5 pt-4">
                <TouchableOpacity onPress={onBack} className="w-11 h-11 rounded-full bg-white/90 items-center justify-center">
                    <MaterialIcons name="arrow-back" size={24} color="#1c1c18" />
                </TouchableOpacity>
            </View>
            <View className="absolute left-6 bottom-4 right-6">
                <Text className="font-body-bold text-white/80 text-xs uppercase tracking-widest mb-1" numberOfLines={1}>
                    {plan.groupName}
                </Text>
                {plan.creatorName ? (
                    <Text className="font-body-bold text-white/90 text-sm mb-1" numberOfLines={1}>
                        Organizer {plan.creatorName}
                    </Text>
                ) : null}
                <Text className="font-headline-bold text-white text-2xl" numberOfLines={2}>
                    {plan.activityLabel}
                </Text>
            </View>
        </View>
    );
};

export default UpcomingPlanHero;
