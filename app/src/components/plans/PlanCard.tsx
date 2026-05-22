import React from 'react';
import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { Plan } from '../../types/plans';

interface PlanCardProps {
    plan: Plan;
    isTablet: boolean;
    showLiveBadge?: boolean;
}

function formatPlanDateTime(startsAt: string) {
    const d = new Date(startsAt);
    const day = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
    const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return `${day} · ${time}`;
}

const PlanCard = ({ plan, isTablet, showLiveBadge }: PlanCardProps) => {
    return (
        <View
            className="bg-white border border-stone-100 rounded-[24px] mb-4 overflow-hidden"
            style={{
                elevation: 3,
                shadowColor: '#b30069',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
            }}
        >
            <View className={`${isTablet ? 'p-8' : 'p-5'}`}>
                <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-row items-center flex-1 mr-2">
                        <View
                            className={`rounded-2xl items-center justify-center mr-3 ${isTablet ? 'w-14 h-14' : 'w-11 h-11'} bg-[#b30069]/10`}
                        >
                            <MaterialIcons name="event" size={isTablet ? 28 : 22} color="#b30069" />
                        </View>
                        <View className="flex-1">
                            <Text
                                className="font-headline-bold text-[#1c1c18]"
                                style={{ fontSize: isTablet ? 26 : 18 }}
                                numberOfLines={1}
                            >
                                {plan.activityLabel}
                            </Text>
                            <Text
                                className="font-body-medium text-[#594048] mt-0.5"
                                style={{ fontSize: isTablet ? 16 : 13 }}
                            >
                                {formatPlanDateTime(plan.startsAt)}
                            </Text>
                        </View>
                    </View>
                    {showLiveBadge && plan.status === 'live' && (
                        <View className="bg-[#b30069] px-3 py-1 rounded-full">
                            <Text className="font-body-bold text-white text-[10px] uppercase tracking-widest">Live</Text>
                        </View>
                    )}
                </View>

                {plan.location ? (
                    <View className="flex-row items-center mb-3">
                        <MaterialIcons name="place" size={isTablet ? 20 : 16} color="#a8a29e" />
                        <Text
                            className="font-body-regular text-[#594048] ml-1.5 flex-1"
                            style={{ fontSize: isTablet ? 15 : 13 }}
                            numberOfLines={1}
                        >
                            {plan.location}
                        </Text>
                    </View>
                ) : null}

                <View className="flex-row">
                    <View className="bg-[#fdf9f3] border border-stone-100 px-3 py-1.5 rounded-full">
                        <Text className="font-body-bold text-[#b30069] text-[11px] uppercase tracking-wider">
                            {plan.groupName}
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
};

export default PlanCard;
