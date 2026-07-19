import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { createPlanFooterShadow } from './createPlanStyles';

interface CreatePlanFooterProps {
    isPending: boolean;
    isTablet: boolean;
    bottomPad: number;
    onCreate: () => void;
    label?: string;
}

const CreatePlanFooter = ({ isPending, isTablet, bottomPad, onCreate, label = 'Create Plan' }: CreatePlanFooterProps) => (
    <View
        className="absolute left-0 right-0 bg-[#fdf9f3] border-t border-stone-100/80 px-6 pt-3"
        style={{ bottom: 0, paddingBottom: bottomPad, ...createPlanFooterShadow }}
    >
        <TouchableOpacity
            onPress={onCreate}
            disabled={isPending}
            activeOpacity={0.9}
            className="bg-[#b30069] rounded-[28px] items-center justify-center flex-row"
            style={{ minHeight: isTablet ? 60 : 54, opacity: isPending ? 0.75 : 1 }}
        >
            {isPending ? (
                <ActivityIndicator color="#fff" />
            ) : (
                <Text className="font-headline-bold text-white text-lg">{label}</Text>
            )}
        </TouchableOpacity>
    </View>
);

export default CreatePlanFooter;
