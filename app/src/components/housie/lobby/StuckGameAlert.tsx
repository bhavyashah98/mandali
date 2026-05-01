import React, { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StuckGameAlertProps {
    onCancel: () => void;
    isLoading: boolean;
    isTablet: boolean;
}

const StuckGameAlert = ({ onCancel, isLoading, isTablet }: StuckGameAlertProps) => {
    return (
        <View className={`mt-6 w-full bg-amber-50 border border-amber-200 rounded-[32px] ${isTablet ? 'p-10' : 'p-5'}`}>
            <View className="flex-row items-center mb-4">
                <Ionicons name="warning-outline" size={isTablet ? 32 : 20} color="#d97706" />
                <Text className={`ml-3 text-amber-700 font-body-bold ${isTablet ? 'text-2xl' : 'text-sm'}`}>Host seems unavailable</Text>
            </View>
            <Text className={`text-amber-600 font-body-medium leading-relaxed mb-8 ${isTablet ? 'text-xl' : 'text-sm'}`}>
                The game has been idle for too long. You can cancel it so anyone can host a new game.
            </Text>
            <TouchableOpacity
                onPress={onCancel}
                disabled={isLoading}
                className={`bg-amber-600 rounded-[20px] flex-row items-center justify-center ${isTablet ? 'h-24' : 'h-14'}`}
            >
                <Ionicons name="close-circle-outline" size={isTablet ? 32 : 22} color="white" />
                <Text className={`text-white font-headline-bold ml-3 ${isTablet ? 'text-2xl' : 'text-base'}`}>Cancel This Game</Text>
            </TouchableOpacity>
        </View>
    );
};

export default memo(StuckGameAlert);
