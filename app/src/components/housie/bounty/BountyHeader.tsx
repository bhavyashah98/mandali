import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface Props {
    onBack: () => void;
    title: string;
    subtitle: string;
}

const BountyHeader: React.FC<Props> = ({ onBack, title, subtitle }) => (
    <View className="flex-row items-center px-6 py-4 border-b border-stone-100 bg-white">
        <TouchableOpacity onPress={onBack} className="w-10 h-10 items-center justify-center rounded-full bg-stone-50">
            <MaterialIcons name="arrow-back-ios" size={18} color="#b30069" style={{ marginLeft: 5 }} />
        </TouchableOpacity>
        <View className="flex-1 items-center mr-10">
            <Text className="font-headline-bold text-xl text-stone-800">{title}</Text>
            <Text className="font-body text-xs text-stone-400">{subtitle}</Text>
        </View>
    </View>
);

export default BountyHeader;
