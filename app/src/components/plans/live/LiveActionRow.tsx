import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface LiveActionRowProps {
    title: string;
    subtitle: string;
    icon: keyof typeof MaterialIcons.glyphMap;
    isLast?: boolean;
    onPress?: () => void;
}

const LiveActionRow = ({ title, subtitle, icon, isLast, onPress }: LiveActionRowProps) => (
    <TouchableOpacity className="flex-row items-center py-4" activeOpacity={0.85} onPress={onPress}>
        <View className="w-12 h-12 rounded-2xl bg-white border border-[#f7d7e8] items-center justify-center">
            <MaterialIcons name={icon} size={26} color="#d1007a" />
        </View>
        <View className="flex-1 ml-4">
            <Text className="font-headline-bold text-[#1c1c18] text-lg">{title}</Text>
            <Text className="font-body-medium text-stone-400 text-sm mt-0.5">{subtitle}</Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color="#594048" />
        {!isLast && <View className="absolute left-0 right-0 bottom-0 h-px bg-[#f4d6e5]" />}
    </TouchableOpacity>
);

export default LiveActionRow;
