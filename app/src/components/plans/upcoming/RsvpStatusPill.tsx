import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { PlanRsvpStatus } from '../../../types/plans';

interface Props {
    isHost: boolean;
    status: PlanRsvpStatus | null;
    lateTag: boolean;
    onEdit: () => void;
}

export default function RsvpStatusPill({ isHost, status, lateTag, onEdit }: Props) {
    if (isHost) {
        return (
            <View className="flex-row items-center justify-center rounded-2xl bg-[#b30069]/10 px-4 py-3">
                <MaterialIcons name="star" size={16} color="#b30069" />
                <Text className="ml-2 font-body-bold text-sm text-[#b30069]">👑 You're Organizing</Text>
            </View>
        );
    }

    const label = status === 'going' ? "You're Going" : status === 'maybe' ? 'You Might Go' : "You Can't Go";
    const icon = status === 'going' ? '✅' : status === 'maybe' ? '🤔' : '❌';

    return (
        <View className="w-full flex-row items-center justify-between rounded-2xl border border-stone-100/80 bg-stone-50/70 px-4 py-3">
            <View className="flex-row items-center">
                <Text className="text-sm">{icon}</Text>
                <Text className={`ml-2 font-body-bold text-sm ${status === 'going' ? 'text-[#b30069]' : 'text-[#594048]'}`}>{label}</Text>
                {lateTag && <Text className="ml-2 rounded-full bg-[#fff0f7] px-2 py-1 font-body-bold text-[10px] text-[#b30069]">fashionably late</Text>}
            </View>
            <TouchableOpacity onPress={onEdit}>
                <Text className="font-body-bold text-xs uppercase tracking-wider text-[#b30069]/65 underline">Change mind?</Text>
            </TouchableOpacity>
        </View>
    );
}
