import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
    planFieldContainerStyle,
    planFieldHorizontalPadding,
    planFieldIconSize,
} from './planFieldStyles';

interface PlanPickerRowProps {
    label: string;
    icon: keyof typeof MaterialIcons.glyphMap;
    value: string | null;
    placeholder: string;
    onPress: () => void;
    isTablet: boolean;
}

const PlanPickerRow = ({ label, icon, value, placeholder, onPress, isTablet }: PlanPickerRowProps) => {
    const iconSize = planFieldIconSize(isTablet);
    const padH = planFieldHorizontalPadding(isTablet);
    const filled = !!value;

    return (
        <View>
            <Text
                className={`font-body-bold text-[#594048] uppercase tracking-wider mb-2.5 ml-1 ${isTablet ? 'text-xl' : 'text-[12px]'}`}
            >
                {label}
            </Text>
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.88}
                className="flex-row items-center"
                style={[
                    planFieldContainerStyle(isTablet, { filled }),
                    { paddingLeft: padH, paddingRight: padH - 4, paddingVertical: isTablet ? 12 : 9 },
                ]}
            >
                <View
                    className="rounded-[18px] items-center justify-center mr-3.5"
                    style={{
                        width: iconSize,
                        height: iconSize,
                        backgroundColor: filled ? 'rgba(179, 0, 105, 0.12)' : '#fafaf9',
                        borderWidth: 1,
                        borderColor: filled ? 'rgba(179, 0, 105, 0.15)' : '#f5f5f4',
                    }}
                >
                    <MaterialIcons
                        name={icon}
                        size={isTablet ? 30 : 26}
                        color={filled ? '#b30069' : '#a8a29e'}
                    />
                </View>
                <Text
                    className={`flex-1 font-headline-bold ${isTablet ? 'text-xl' : 'text-lg'} ${
                        filled ? 'text-[#1c1c18]' : 'text-stone-400'
                    }`}
                    numberOfLines={2}
                >
                    {value || placeholder}
                </Text>
                <View
                    className={`rounded-full items-center justify-center ${isTablet ? 'w-12 h-12' : 'w-11 h-11'} bg-[#fdf9f3]`}
                    style={{ borderWidth: 1, borderColor: '#f5f5f4' }}
                >
                    <MaterialIcons name="keyboard-arrow-down" size={isTablet ? 28 : 26} color="#a8a29e" />
                </View>
            </TouchableOpacity>
        </View>
    );
};

export default PlanPickerRow;
