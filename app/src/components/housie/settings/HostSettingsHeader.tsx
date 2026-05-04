import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface HostSettingsHeaderProps {
    onBack: () => void;
    isTablet: boolean;
}

export const HostSettingsHeader = ({ onBack, isTablet }: HostSettingsHeaderProps) => {
    return (
        <View className="flex-row items-center px-6 py-4 border-b border-stone-100">
            <TouchableOpacity
                onPress={onBack}
                className="w-10 h-10 items-center justify-center rounded-full bg-white border border-stone-100"
                style={{ elevation: 2 }}
            >
                <MaterialIcons name="arrow-back-ios" size={20} color="#b30069" style={{ marginLeft: 5 }} />
            </TouchableOpacity>
            <View className="flex-1 items-center" style={{ marginRight: 40 }}>
                <Text className="font-headline-bold text-[#1c1c18]" style={{ fontSize: isTablet ? 32 : 22 }}>
                    New Room
                </Text>
            </View>
        </View>
    );
};
