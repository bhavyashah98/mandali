import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface BountyHeaderProps {
    onBack: () => void;
    isTablet: boolean;
}

const BountyHeader: React.FC<BountyHeaderProps> = ({ onBack, isTablet }) => {
    return (
        <View className="bg-[#fdf9f3]">
            <View className="flex-row items-center px-6 py-4">
                <View style={{ width: isTablet ? 64 : 44 }}>
                    <TouchableOpacity
                        onPress={onBack}
                        className="items-center justify-center rounded-full bg-white border border-stone-100"
                        style={{ width: isTablet ? 60 : 40, height: isTablet ? 60 : 40, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}
                    >
                        <MaterialIcons name="arrow-back-ios" size={isTablet ? 26 : 18} color="#b30069" style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                </View>

                <View className="flex-1 items-center">
                    <Text
                        className="font-headline-bold uppercase"
                        style={{ fontSize: isTablet ? 28 : 17, color: '#1c1c18', letterSpacing: 1.5 }}
                    >
                        Define Rewards
                    </Text>
                    <Text
                        className="font-body-bold text-stone-400 uppercase tracking-widest mt-0.5"
                        style={{ fontSize: isTablet ? 14 : 9 }}
                    >
                        Set the stage
                    </Text>
                </View>
                <View style={{ width: isTablet ? 64 : 44 }} />
            </View>
        </View>
    );
};

export default React.memo(BountyHeader);
