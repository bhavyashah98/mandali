import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { createPlanHeaderBackShadow } from './createPlanStyles';

interface CreatePlanHeaderProps {
    isTablet: boolean;
    onBack: () => void;
}

const CreatePlanHeader = ({ isTablet, onBack }: CreatePlanHeaderProps) => (
    <View className={`flex-row items-center px-6 ${isTablet ? 'py-6' : 'py-3'}`}>
        <View style={{ width: isTablet ? 64 : 44 }}>
            <TouchableOpacity
                onPress={onBack}
                style={createPlanHeaderBackShadow}
                className={`items-center justify-center rounded-full bg-white border border-stone-100 ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}
            >
                <MaterialIcons
                    name="arrow-back-ios"
                    size={isTablet ? 28 : 18}
                    color="#594048"
                    style={{ marginLeft: isTablet ? 12 : 4 }}
                />
            </TouchableOpacity>
        </View>
        <View className="flex-1 items-center px-2">
            <Text className="font-headline-bold text-[#1c1c18] text-center" style={{ fontSize: isTablet ? 32 : 20 }} numberOfLines={1}>
                Create a Plan
            </Text>
            <Text className="font-body-bold text-[#b30069] text-center uppercase tracking-widest" style={{ fontSize: isTablet ? 14 : 9, marginTop: 2 }}>
                Let&apos;s plan something awesome!
            </Text>
        </View>
        <View style={{ width: isTablet ? 64 : 44 }} />
    </View>
);

export default CreatePlanHeader;
