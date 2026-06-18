import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import type { UpcomingRsvp } from './useUpcomingRsvp';

export default function RsvpChoiceButtons({ onSelect }: { onSelect: (status: UpcomingRsvp) => void }) {
    return (
        <View>
            <Text className="mb-3 text-center font-body-bold text-xs uppercase tracking-wider text-stone-400">
                Will you join?
            </Text>
            <View className="flex-row gap-3">
                <TouchableOpacity onPress={() => onSelect('going')} className="flex-1 flex-row items-center justify-center rounded-2xl border border-[#b30069]/20 bg-[#b30069]/5 px-2 py-3">
                    <Text className="font-body-bold text-sm text-[#b30069]">✅ Going</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onSelect('cant_go')} className="flex-1 flex-row items-center justify-center rounded-2xl border border-stone-200 bg-stone-50 px-2 py-3">
                    <Text className="font-body-bold text-sm text-[#594048]">❌ Can't go</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onSelect('maybe')} className="flex-row items-center justify-center rounded-2xl border border-stone-200 bg-stone-50 px-3 py-3">
                    <Text className="font-body-bold text-sm text-[#594048]">🤔 Maybe</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
