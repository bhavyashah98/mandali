import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useIsTablet } from '../../../hooks/useIsTablet';
import MandaliCoin from '../../MandaliCoin';

interface TotalGloryCardProps {
    totalGlory: number;
    hasGroups: boolean;
}

export const TotalGloryCard: React.FC<TotalGloryCardProps> = ({ totalGlory, hasGroups }) => {
    const isTablet = useIsTablet();

    if (!hasGroups) {
        return <View className="h-4" />;
    }

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => Alert.alert(
                "Mandali Glory",
                "This represents your total social points won across all groups. These points are virtual and have no cash value."
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
                <View>
                    <Text className={`text-white/70 font-body-bold uppercase tracking-widest ${isTablet ? 'text-2xl mb-4' : 'text-[10px] mb-1'}`}>Total Mandali Glory</Text>
                    <View className="flex-row items-center">
                        <Text className={`text-white font-headline-bold ${isTablet ? 'text-7xl' : 'text-3xl'}`}>
                            {totalGlory.toLocaleString()}
                        </Text>
                        <MandaliCoin size={isTablet ? 48 : 24} style={{ marginLeft: 12 }} />
                    </View>
                </View>
                <View
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                    className={`rounded-[28px] items-center justify-center ${isTablet ? 'w-24 h-24' : 'w-12 h-12'}`}
                >
                    <MaterialIcons name="emoji-events" size={isTablet ? 48 : 24} color="white" />
                </View>
            </View>
        </TouchableOpacity>
    );
};
