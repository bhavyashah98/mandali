import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const addButtonStyle = {
    shadowColor: '#b30069',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
};

const PlansHeader = ({ isTablet, onCreate }: { isTablet: boolean; onCreate: () => void }) => (
    <View className={`flex-row items-center justify-between px-6 ${isTablet ? 'pt-8 pb-5' : 'pt-4 pb-4'}`}>
        <View>
            <Text className="font-headline-bold text-[#1c1c18]" style={{ fontSize: isTablet ? 40 : 30 }}>
                Plans
            </Text>
            <Text className="font-body-medium text-[#594048] mt-1" style={{ fontSize: isTablet ? 18 : 14 }}>
                See what&apos;s coming up with your Mandali
            </Text>
        </View>
        <TouchableOpacity
            onPress={onCreate}
            activeOpacity={0.9}
            className="rounded-full bg-[#b30069] items-center justify-center"
            style={{ width: isTablet ? 64 : 52, height: isTablet ? 64 : 52, ...addButtonStyle }}
        >
            <MaterialIcons name="add" size={isTablet ? 34 : 28} color="white" />
        </TouchableOpacity>
    </View>
);

export default PlansHeader;
