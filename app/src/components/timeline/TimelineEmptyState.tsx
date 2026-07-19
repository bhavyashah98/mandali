import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const TimelineEmptyState = ({ isTablet }: { isTablet: boolean }) => (
    <View className="items-center justify-center py-20 px-8">
        <View className="w-20 h-20 rounded-full bg-white border border-stone-100 items-center justify-center mb-5">
            <Ionicons name="albums-outline" size={32} color="#b3006955" />
        </View>
        <Text className={`font-headline-bold text-[#1c1c18] text-center ${isTablet ? 'text-3xl' : 'text-lg'}`}>
            No history yet
        </Text>
        <Text className={`font-body-medium text-[#594048]/50 text-center mt-2 ${isTablet ? 'text-xl leading-8' : 'text-sm leading-6'}`}>
            Make a plan, split Hisaab, play a game, or save a memory. The story starts there.
        </Text>
    </View>
);
