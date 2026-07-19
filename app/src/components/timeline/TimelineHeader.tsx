import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export const TimelineHeader = ({ isTablet }: { isTablet: boolean }) => (
    <View className={`bg-[#1c1c18] rounded-[36px] overflow-hidden ${isTablet ? 'p-10 mb-10' : 'p-6 mb-7'}`}>
        <LinearGradient
            colors={['rgba(179,0,105,0.18)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <View className={`bg-white/10 rounded-full items-center justify-center mb-5 ${isTablet ? 'w-20 h-20' : 'w-14 h-14'}`}>
            <Ionicons name="albums" size={isTablet ? 36 : 24} color="white" />
        </View>
        <Text className={`font-headline-bold text-white ${isTablet ? 'text-5xl leading-tight' : 'text-2xl leading-8'}`}>
            Your Mandali's living archive
        </Text>
        <Text className={`font-body-medium text-white/65 mt-3 ${isTablet ? 'text-xl leading-8' : 'text-sm leading-6'}`}>
            Plans, memories, Hisaab, games, and milestones stitched into one history.
        </Text>
    </View>
);
