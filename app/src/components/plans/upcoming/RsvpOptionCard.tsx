import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { UpcomingRsvp } from './useUpcomingRsvp';

interface RsvpOptionCardProps {
    option: { key: UpcomingRsvp; title: string; subtitle: string; icon: keyof typeof MaterialIcons.glyphMap };
    selected: boolean;
    onPress: () => void;
    disabled?: boolean;
}

const RsvpOptionCard = ({ option, selected, onPress, disabled }: RsvpOptionCardProps) => (
    <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.85}
        className={`mb-3 rounded-[18px] border px-4 py-4 flex-row items-center ${selected ? 'border-[#42a55b] bg-[#eefaf0]' : 'border-stone-100 bg-white'}`}
    >
        <MaterialIcons
            name={option.icon}
            size={24}
            color={selected ? '#2f9b47' : option.key === 'cant_go' ? '#ef4444' : '#8a7a80'}
        />
        <View className="flex-1 ml-4">
            <Text className="font-body-bold text-[#1c1c18]">{option.title}</Text>
            <Text className="font-body-medium text-stone-400 text-xs mt-0.5">{option.subtitle}</Text>
        </View>
        {selected && <MaterialIcons name="check" size={22} color="#2f9b47" />}
    </TouchableOpacity>
);

export default RsvpOptionCard;
