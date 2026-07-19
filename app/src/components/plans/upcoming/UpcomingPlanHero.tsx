import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { PLAN_HERO_FALLBACK_URI } from '../../../constants/planAssets';
import type { PlanCardPlan } from '../PlanCard';

function getCountdownText(targetDateStr: string) {
    const diffMs = new Date(targetDateStr).getTime() - Date.now();
    if (diffMs <= 0) {
        return 'Live Now';
    }

    const diffMins = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

    const d = diffDays;
    const h = diffHours % 24;
    const m = diffMins % 60;

    if (d > 0) {
        return `${d}d : ${h}h : ${m}m left`;
    }
    if (h > 0) {
        return `${h}h : ${m}m left`;
    }
    return `${m}m left`;
}

const UpcomingPlanHero = ({ plan, onBack, onEdit }: { plan: PlanCardPlan; onBack: () => void; onEdit?: () => void }) => {
    const heroUri = plan.placePhotoUrl || PLAN_HERO_FALLBACK_URI;
    const [countdown, setCountdown] = useState(() => getCountdownText(plan.startsAt));

    useEffect(() => {
        setCountdown(getCountdownText(plan.startsAt));
        const interval = setInterval(() => {
            setCountdown(getCountdownText(plan.startsAt));
        }, 15000); // update every 15s for precision
        return () => clearInterval(interval);
    }, [plan.startsAt]);

    return (
        <View className="h-72 overflow-hidden">
            <Image source={{ uri: heroUri }} style={{ position: 'absolute', width: '100%', height: '100%' }} contentFit="cover" />
            <View className="absolute inset-0 bg-black/25" />
            <View className="flex-row items-center justify-between px-5 pt-4 z-10">
                <TouchableOpacity onPress={onBack} className="w-11 h-11 rounded-full bg-white/90 items-center justify-center shadow-md">
                    <MaterialIcons name="arrow-back" size={24} color="#1c1c18" />
                </TouchableOpacity>
                <View className="flex-row items-center">
                    {onEdit ? (
                        <TouchableOpacity
                            onPress={onEdit}
                            activeOpacity={0.85}
                            className="bg-white/90 px-4 py-2 rounded-full flex-row items-center border border-white/30 shadow-lg mr-2"
                        >
                            <MaterialIcons name="edit" size={14} color="#b30069" />
                            <Text className="text-[#b30069] font-body-bold text-[11px] ml-1.5 uppercase tracking-wider">Edit</Text>
                        </TouchableOpacity>
                    ) : null}
                    <View className="bg-black/50 px-4 py-2 rounded-full flex-row items-center border border-white/20 shadow-lg">
                        <MaterialIcons name="schedule" size={14} color="#ffffff" />
                        <Text className="text-white font-body-bold text-[11px] ml-1.5 uppercase tracking-wider">{countdown}</Text>
                    </View>
                </View>
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
