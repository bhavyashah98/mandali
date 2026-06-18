import React from 'react';
import { Text, View } from 'react-native';

export default function RsvpProgress({ goingCount, totalMembers }: { goingCount: number; totalMembers: number }) {
    return (
        <View className="mb-6 flex-row items-center">
            <View className="mr-4 h-3 flex-1 overflow-hidden rounded-full bg-stone-100/80">
                <View
                    className="h-full rounded-full bg-[#b30069]"
                    style={{ width: `${Math.min(100, (goingCount / totalMembers) * 100)}%` }}
                />
            </View>
            <Text className="font-body-bold text-xs text-[#594048]">{goingCount} of {totalMembers}</Text>
        </View>
    );
}
