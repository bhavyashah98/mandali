import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import type { PlanRsvpUser } from '../../../types/plans';
import PlanGoingAvatars from '../card/PlanGoingAvatars';

interface Props {
    going: PlanRsvpUser[];
    goingCount: number;
    keyWaitingName?: string | null;
    onPress: () => void;
}

export default function RsvpSocialHeader({ going, goingCount, keyWaitingName, onPress }: Props) {
    return (
        <TouchableOpacity activeOpacity={0.88} onPress={onPress} className="mb-4">
            <View className="flex-row items-center justify-between">
                <PlanGoingAvatars going={going} maxVisible={5} size="md" />
                <View className="items-end">
                    <Text className="font-headline-bold text-[#1c1c18] text-lg">{goingCount} people are in</Text>
                    <Text className="font-body-bold text-[#b30069] text-xs">are you?</Text>
                </View>
            </View>
            {!!keyWaitingName && (
                <View className="mt-4 rounded-2xl bg-[#fff8fb] px-4 py-3">
                    <Text className="font-body-bold text-[#b30069] text-sm">Waiting for {keyWaitingName}...</Text>
                </View>
            )}
        </TouchableOpacity>
    );
}
