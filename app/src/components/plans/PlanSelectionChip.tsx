import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

type ChipVariant = 'date' | 'time' | 'custom';

interface PlanSelectionChipProps {
    selected: boolean;
    onPress: () => void;
    isTablet: boolean;
    variant: ChipVariant;
    weekday?: string;
    primary?: string;
    secondary?: string;
    customIcon?: keyof typeof MaterialIcons.glyphMap;
    customLabel?: string;
}

const PlanSelectionChip = ({
    selected,
    onPress,
    isTablet,
    variant,
    weekday,
    primary,
    secondary,
    customIcon = 'calendar-today',
    customLabel = 'Custom',
}: PlanSelectionChipProps) => {
    const sizeClass = isTablet ? 'w-24 h-24' : 'w-[72px] h-[80px]';

    if (variant === 'custom' && !weekday) {
        return (
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.85}
                className={`mr-3 items-center justify-center border rounded-2xl ${sizeClass} ${
                    selected ? 'bg-[#b30069] border-[#b30069]' : 'bg-white border-stone-200'
                }`}
            >
                <MaterialIcons name={customIcon} size={isTablet ? 28 : 22} color={selected ? '#fff' : '#b30069'} />
                <Text
                    className={`font-body-bold mt-1 ${isTablet ? 'text-sm' : 'text-[10px]'} ${
                        selected ? 'text-white' : 'text-[#594048]'
                    }`}
                >
                    {customLabel}
                </Text>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.85}
            className={`mr-3 items-center justify-center border rounded-2xl ${sizeClass} ${
                selected ? 'bg-[#b30069] border-[#b30069]' : 'bg-white border-stone-200'
            }`}
        >
            <Text
                className={`font-body-bold uppercase ${isTablet ? 'text-sm' : 'text-[10px]'} ${
                    selected ? 'text-white/90' : 'text-[#594048]'
                }`}
            >
                {weekday}
            </Text>
            <Text
                className={`font-headline-bold mt-1 ${isTablet ? 'text-lg' : 'text-sm'} ${
                    selected ? 'text-white' : 'text-[#1c1c18]'
                }`}
            >
                {primary}
            </Text>
            <Text
                className={`font-body-medium ${isTablet ? 'text-xs' : 'text-[9px]'} ${
                    selected ? 'text-white/80' : 'text-stone-400'
                }`}
            >
                {secondary}
            </Text>
        </TouchableOpacity>
    );
};

export default PlanSelectionChip;
