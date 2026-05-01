import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

interface ClaimConfirmModalProps {
    visible: boolean;
    prizeName: string;
    claimCountdown: number;
    isTablet: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    isNested?: boolean; // New prop
}

const ClaimConfirmModal: React.FC<ClaimConfirmModalProps> = ({
    visible,
    prizeName,
    claimCountdown,
    isTablet,
    onConfirm,
    onCancel,
    isNested = false
}) => {
    if (!visible) return null;

    const content = (
        <View
            style={{ backgroundColor: 'rgba(89, 64, 72, 0.95)' }}
            className="flex-1 items-center justify-center p-8"
        >
            <View 
                style={{ elevation: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.4, shadowRadius: 24 }}
                className={`bg-[#FDF9F3] rounded-[40px] w-full max-w-md items-center p-10 border border-white/20`}
            >
                <View
                    style={{ backgroundColor: 'rgba(179, 0, 105, 0.1)' }}
                    className={`rounded-full items-center justify-center mb-6 ${isTablet ? 'w-24 h-24' : 'w-20 h-20'}`}
                >
                    <FontAwesome5 name="trophy" size={isTablet ? 48 : 36} color="#b30069" />
                </View>
                <Text className={`text-[#594048] font-headline-bold text-center mb-2 ${isTablet ? 'text-4xl' : 'text-2xl'}`}>
                    Confirm Claim?
                </Text>
                <Text className={`text-stone-400 font-body-medium text-center mb-8 ${isTablet ? 'text-xl' : 'text-sm'}`}>
                    Are you sure you want to claim {prizeName}?
                </Text>
                <View className="w-full gap-4">
                    <TouchableOpacity 
                        activeOpacity={0.8}
                        onPress={onConfirm} 
                        className={`bg-[#b30069] rounded-full items-center justify-center shadow-lg shadow-[#b30069]/30 ${isTablet ? 'h-20' : 'h-14'}`}
                    >
                        <Text className={`text-white font-headline-bold ${isTablet ? 'text-3xl' : 'text-lg'}`}>
                            Yes, Claim Now ({claimCountdown}s)
                        </Text>
                        <Text className="text-white/60 font-body-bold text-[10px] uppercase tracking-widest mt-0.5">Timer Paused</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        activeOpacity={0.8}
                        onPress={onCancel} 
                        className={`bg-stone-100 rounded-full items-center justify-center ${isTablet ? 'h-20' : 'h-14'}`}
                    >
                        <Text className={`text-stone-500 font-headline-bold ${isTablet ? 'text-3xl' : 'text-lg'}`}>
                            Cancel
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    if (isNested) return content;

    return (
        <Modal
            transparent={true}
            visible={visible}
            animationType="fade"
            onRequestClose={onCancel}
        >
            {content}
        </Modal>
    );
};

export default React.memo(ClaimConfirmModal);
