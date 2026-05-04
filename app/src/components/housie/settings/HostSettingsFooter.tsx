import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';

interface HostSettingsFooterProps {
    onContinue: () => void;
    isLoading: boolean;
    isScheduled: boolean;
    isTablet: boolean;
}

export const HostSettingsFooter = ({ 
    onContinue, 
    isLoading, 
    isScheduled, 
    isTablet 
}: HostSettingsFooterProps) => {
    return (
        <View className="absolute bottom-0 w-full px-6 pt-4 pb-8 bg-[#fdf9f3] border-t border-stone-100">
            <TouchableOpacity
                onPress={onContinue}
                disabled={isLoading}
                className="w-full bg-[#b30069] rounded-[32px] items-center justify-center shadow-lg"
                style={{ height: isTablet ? 80 : 64, opacity: isLoading ? 0.8 : 1 }}
            >
                {isLoading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text className="font-headline-bold text-white text-xl">
                        {isScheduled ? 'Schedule Game' : 'Create & Open Room'}
                    </Text>
                )}
            </TouchableOpacity>
        </View>
    );
};
