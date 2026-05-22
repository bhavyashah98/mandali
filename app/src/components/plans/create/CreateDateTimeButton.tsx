import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { createPlanCardShadow } from './createPlanStyles';

interface CreateDateTimeButtonProps {
    icon: keyof typeof MaterialIcons.glyphMap;
    label: string | null;
    placeholder: string;
    onPress: () => void;
    grow?: boolean;
}

const CreateDateTimeButton = ({ icon, label, placeholder, onPress, grow }: CreateDateTimeButtonProps) => (
    <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        className={`${grow ? 'flex-1' : ''} bg-white border border-stone-100 rounded-[18px] px-4 py-4 flex-row items-center`}
        style={createPlanCardShadow}
    >
        <MaterialIcons name={icon} size={22} color="#b30069" />
        <Text className={`font-body-bold ml-3 ${grow ? 'flex-1' : ''} ${label ? 'text-[#1c1c18]' : 'text-stone-400'}`}>
            {label || placeholder}
        </Text>
    </TouchableOpacity>
);

export default CreateDateTimeButton;
