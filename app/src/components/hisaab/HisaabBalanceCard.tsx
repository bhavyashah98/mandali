import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useIsTablet } from '../../hooks/useIsTablet';

interface HisaabBalanceCardProps {
    totalBalance: number;
}

const HisaabBalanceCard = ({ totalBalance }: HisaabBalanceCardProps) => {
    const isTablet = useIsTablet();
    const isSettled = totalBalance === 0;
    const isOwed = totalBalance > 0;

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => Alert.alert(
                "Total Net Balance",
                "This is the sum of what you owe and what others owe you across all your Mandali groups."
            )}
            style={{ elevation: 10, shadowColor: '#b30069', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 }}
            className={`bg-[#b30069] rounded-[40px] overflow-hidden ${isTablet ? 'p-12' : 'p-6'}`}
        >
            <LinearGradient
                colors={['rgba(255,255,255,0.15)', 'transparent']}
                className="absolute inset-0"
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
            <View className="flex-row items-center justify-between">
                <View className="flex-1">
                    <Text className={`text-white/70 font-body-bold uppercase tracking-widest ${isTablet ? 'text-2xl mb-4' : 'text-[10px] mb-1'}`}>Total Net Balance</Text>
                    <View className="flex-row items-center">
                        <Text className={`text-white font-headline-bold ${isTablet ? 'text-7xl' : 'text-3xl'}`}>
                            {isSettled ? 'Settled Up' : `₹${Math.abs(totalBalance).toLocaleString()}`}
                        </Text>
                    </View>
                    {!isSettled && (
                        <Text className={`font-body-bold mt-1 text-white/90 ${isTablet ? 'text-2xl' : 'text-[10px]'} uppercase tracking-wider`}>
                            {isOwed ? 'Overall, you are owed' : 'Overall, you owe'}
                        </Text>
                    )}
                </View>
                <View
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                    className={`rounded-[28px] items-center justify-center ${isTablet ? 'w-24 h-24' : 'w-12 h-12'}`}
                >
                    <MaterialIcons
                        name={isSettled ? "account-balance-wallet" : isOwed ? "trending-up" : "trending-down"}
                        size={isTablet ? 48 : 24}
                        color="white"
                    />
                </View>
            </View>
        </TouchableOpacity>
    );
};

export default HisaabBalanceCard;
