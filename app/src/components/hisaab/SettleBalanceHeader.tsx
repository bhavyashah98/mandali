import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useIsTablet } from '../../hooks/useIsTablet';
import { useNavigation } from '@react-navigation/native';

interface SettleBalanceHeaderProps {
    groupName: string;
}

const SettleBalanceHeader = ({ groupName }: SettleBalanceHeaderProps) => {
    const isTablet = useIsTablet();
    const navigation = useNavigation();

    return (
        <View className={`px-6 ${isTablet ? 'py-8' : 'py-4'} flex-row items-center justify-between`}>
            <TouchableOpacity 
                onPress={() => navigation.goBack()}
                className={`${isTablet ? 'w-16 h-16' : 'w-10 h-10'} bg-white rounded-full items-center justify-center shadow-sm border border-stone-100`}
            >
                <MaterialIcons name="close" size={isTablet ? 32 : 24} color="#b30069" />
            </TouchableOpacity>
            <View className="items-center">
                <Text className={`font-headline-bold text-[#1c1c18] ${isTablet ? 'text-4xl' : 'text-xl'}`}>Settle Up</Text>
                <Text className={`font-body-bold text-[#b30069] uppercase tracking-widest ${isTablet ? 'text-lg' : 'text-[9px]'}`}>{groupName}</Text>
            </View>
            <View className={isTablet ? 'w-16' : 'w-10'} />
        </View>
    );
};

export default SettleBalanceHeader;
