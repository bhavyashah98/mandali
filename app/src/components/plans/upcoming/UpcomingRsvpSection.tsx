import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { PlanCardPlan } from '../PlanCard';
import type { PlanRsvpUser, PlanRsvpStatus } from '../../../types/plans';
import PlanGoingAvatars from '../card/PlanGoingAvatars';
import type { UpcomingRsvp } from './useUpcomingRsvp';

interface UpcomingRsvpSectionProps {
    plan: PlanCardPlan;
    going: PlanRsvpUser[];
    myRsvpStatus: PlanRsvpStatus | null;
    updateRsvpDirectly: (status: UpcomingRsvp) => void;
    isSaving: boolean;
    isHost: boolean;
}

const UpcomingRsvpSection = ({
    plan,
    going,
    myRsvpStatus,
    updateRsvpDirectly,
    isSaving,
    isHost,
}: UpcomingRsvpSectionProps) => {
    const [isEditing, setIsEditing] = useState(false);

    const totalMembers = plan.memberCount || Math.max(going.length + 5, 12);
    const goingCount = going.length;

    // Determine if we show selection mode
    const showSelection = !isHost && (myRsvpStatus === null || isEditing);

    const handleSelectOption = async (option: UpcomingRsvp) => {
        updateRsvpDirectly(option);
        setIsEditing(false);
    };

    return (
        <View 
            className="bg-white border border-stone-100 rounded-[28px] p-6 mx-6 mt-6 shadow-sm"
            style={{
                shadowColor: '#b30069',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.04,
                shadowRadius: 12,
                elevation: 2
            }}
        >
            {/* Header: Going Avatars Stack */}
            <View className="flex-row items-center justify-between mb-4">
                <PlanGoingAvatars going={going} maxVisible={5} size="md" />
                <Text className="font-body-bold text-[#b30069] text-sm">
                    {goingCount} coming
                </Text>
            </View>

            {/* Progress Bar */}
            <View className="flex-row items-center mb-6">
                <View className="flex-1 h-3 bg-stone-100/80 rounded-full overflow-hidden mr-4">
                    <View 
                        className="h-full bg-[#b30069] rounded-full" 
                        style={{ width: `${Math.min(100, (goingCount / totalMembers) * 100)}%` }} 
                    />
                </View>
                <Text className="font-body-bold text-[#594048] text-xs">
                    {goingCount} of {totalMembers}
                </Text>
            </View>

            {/* RSVP Selection or Confirmation — fixed height container prevents layout jumps */}
            <View style={{ minHeight: 88 }} className="justify-center">
                {isSaving ? (
                    <View className="items-center justify-center py-4">
                        <ActivityIndicator size="small" color="#b30069" />
                    </View>
                ) : showSelection ? (
                    <View>
                        <Text className="font-body-bold text-xs uppercase tracking-wider mb-3 text-center text-stone-400">
                            Will you join?
                        </Text>
                        <View className="flex-row gap-3">
                            <TouchableOpacity
                                onPress={() => handleSelectOption('going')}
                                className="flex-1 py-3 px-2 rounded-2xl bg-[#b30069]/5 border border-[#b30069]/20 flex-row items-center justify-center active:opacity-70"
                            >
                                <Text className="font-body-bold text-[#b30069] text-sm">✅ Going</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => handleSelectOption('cant_go')}
                                className="flex-1 py-3 px-2 rounded-2xl bg-stone-50 border border-stone-200 flex-row items-center justify-center active:opacity-70"
                            >
                                <Text className="font-body-bold text-[#594048] text-sm">❌ Can't go</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => handleSelectOption('maybe')}
                                className="py-3 px-3 rounded-2xl bg-stone-50 border border-stone-200 flex-row items-center justify-center active:opacity-70"
                            >
                                <Text className="font-body-bold text-[#594048] text-sm">🤔 Maybe</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <View>
                        {isHost ? (
                            <View className="flex-row items-center justify-center bg-[#b30069]/10 px-4 py-3 rounded-2xl">
                                <MaterialIcons name="star" size={16} color="#b30069" />
                                <Text className="font-body-bold text-[#b30069] text-sm ml-2">👑 You're Organizing</Text>
                            </View>
                        ) : (
                            <View className="flex-row items-center justify-between w-full bg-stone-50/70 px-4 py-3 rounded-2xl border border-stone-100/80">
                                <View className="flex-row items-center">
                                    {myRsvpStatus === 'going' && (
                                        <>
                                            <Text className="text-sm">✅</Text>
                                            <Text className="font-body-bold text-[#b30069] text-sm ml-2">You're Going</Text>
                                        </>
                                    )}
                                    {myRsvpStatus === 'maybe' && (
                                        <>
                                            <Text className="text-sm">🤔</Text>
                                            <Text className="font-body-bold text-[#594048] text-sm ml-2">You Might Go</Text>
                                        </>
                                    )}
                                    {myRsvpStatus === 'cant_go' && (
                                        <>
                                            <Text className="text-sm">❌</Text>
                                            <Text className="font-body-bold text-[#594048] text-sm ml-2">You Can't Go</Text>
                                        </>
                                    )}
                                </View>
                                <TouchableOpacity onPress={() => setIsEditing(true)}>
                                    <Text className="font-body-bold text-[#b30069]/65 text-xs underline uppercase tracking-wider">
                                        Change mind?
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}
            </View>
        </View>
    );
};

export default UpcomingRsvpSection;
