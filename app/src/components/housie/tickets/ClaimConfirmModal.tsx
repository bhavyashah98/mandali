import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

interface ClaimConfirmModalProps {
    visible: boolean;
    prizeName: string;
    claimCountdown: number;
    isTablet: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

const ClaimConfirmModal: React.FC<ClaimConfirmModalProps> = ({
    visible,
    prizeName,
    claimCountdown,
    isTablet,
    onConfirm,
    onCancel
}) => {
    if (!visible) return null;

    return (
        <View
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)' }}
            className="absolute top-0 left-0 right-0 bottom-0 rounded-[40px] items-center justify-center p-8 z-50"
        >
            <View
                style={{ backgroundColor: 'rgba(179, 0, 105, 0.1)' }}
                className={`rounded-full items-center justify-center mb-6 ${isTablet ? 'w-24 h-24' : 'w-20 h-20'}`}
            >
                <FontAwesome5 name="trophy" size={isTablet ? 48 : 36} color="#b30069" />
            </View>
            <Text className={`text-[#1c1c18] font-headline-bold text-center mb-2 ${isTablet ? 'text-4xl' : 'text-2xl'}`}>
                Confirm Claim?
            </Text>
            <Text className={`text-stone-400 font-body-medium text-center mb-8 ${isTablet ? 'text-xl' : 'text-sm'}`}>
                Are you sure you want to claim {prizeName}?
            </Text>
            <View className="w-full gap-4">
                <TouchableOpacity onPress={onConfirm} className={`bg-primary rounded-full items-center justify-center ${isTablet ? 'h-20' : 'h-14'}`}>
                    <Text className={`text-white font-headline-bold ${isTablet ? 'text-3xl' : 'text-lg'}`}>
                        Yes, Claim Now ({claimCountdown}s)
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onCancel} className={`bg-stone-100 rounded-full items-center justify-center ${isTablet ? 'h-20' : 'h-14'}`}>
                    <Text className={`text-stone-500 font-headline-bold ${isTablet ? 'text-3xl' : 'text-lg'}`}>
                        Cancel
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default React.memo(ClaimConfirmModal);
