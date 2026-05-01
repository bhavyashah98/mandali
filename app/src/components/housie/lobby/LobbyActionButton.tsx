import React, { memo } from 'react';
import { TouchableOpacity, ActivityIndicator, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LobbyActionButtonProps {
    label: string;
    icon: string;
    onPress: () => void;
    isLoading: boolean;
    disabled: boolean;
    isPrimary: boolean;
    isTablet: boolean;
}

const LobbyActionButton = ({ 
    label, 
    icon, 
    onPress, 
    isLoading, 
    disabled, 
    isPrimary, 
    isTablet 
}: LobbyActionButtonProps) => {
    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={isLoading || disabled}
            style={{ 
                height: isTablet ? 112 : 80,
                backgroundColor: isPrimary ? '#b30069' : '#fafaf9',
                borderColor: isPrimary ? 'transparent' : '#f5f5f4',
                elevation: 8,
                shadowColor: isPrimary ? '#b30069' : 'black',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: isPrimary ? 0.3 : 0.05,
                shadowRadius: 10
            }}
            className={`rounded-[32px] flex-row items-center justify-center border w-full`}
        >
            {isLoading ? (
                <ActivityIndicator color={isPrimary ? 'white' : '#31302d'} />
            ) : (
                <>
                    <Ionicons
                        name={icon as any}
                        size={isTablet ? 40 : 28}
                        color={isPrimary ? 'white' : '#31302d'}
                    />
                    <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        className={`font-headline-bold ml-3 ${isTablet ? 'text-3xl' : 'text-2xl'} ${isPrimary ? 'text-white' : 'text-[#31302d]'}`}
                    >
                        {label}
                    </Text>
                </>
            )}
        </TouchableOpacity>
    );
};

export default memo(LobbyActionButton);
