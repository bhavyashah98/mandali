import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useIsTablet } from '../../hooks/useIsTablet';
import { getOptimizedImageUrl } from '../../lib/api';

interface HisaabGroupItemProps {
    item: {
        groupId: string;
        name: string;
        netBalance: number;
        avatar: string | null;
    };
    onPress: (groupId: string, name: string) => void;
}

const HisaabGroupItem = ({ item, onPress }: HisaabGroupItemProps) => {
    const isTablet = useIsTablet();
    const isSettled = item.netBalance === 0;
    const isOwed = item.netBalance > 0;

    return (
        <TouchableOpacity
            onPress={() => onPress(item.groupId, item.name)}
            activeOpacity={0.7}
            style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}
            className={`bg-white rounded-[32px] flex-row items-center border border-stone-100 mb-4 ${isTablet ? 'px-10 py-8' : 'px-4 py-4'}`}
        >
            <View className={`rounded-2xl overflow-hidden bg-stone-50 border border-stone-100 ${isTablet ? 'w-24 h-24' : 'w-16 h-16'}`}>
                {item.avatar ? (
                    <Image
                        source={{ uri: getOptimizedImageUrl(item.avatar, 'w_300,q_auto,f_auto') }}
                        className="w-full h-full"
                        resizeMode="cover"
                    />
                ) : (
                    <View 
                        style={{ backgroundColor: 'rgba(179, 0, 105, 0.05)' }}
                        className="w-full h-full items-center justify-center"
                    >
                        <Text
                            className="font-headline-bold text-primary opacity-30"
                            style={{ fontSize: isTablet ? 42 : 24 }}
                        >
                            {item.name.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                )}
            </View>

            <View className="flex-1 ml-6 justify-center">
                <Text
                    className="font-headline-bold text-[#1c1c18] mb-1.5"
                    style={{ fontSize: isTablet ? 36 : 18 }}
                    numberOfLines={1}
                >
                    {item.name}
                </Text>
                <View className="flex-row items-center">
                    <View 
                        style={{ backgroundColor: isSettled ? 'rgba(168, 162, 158, 0.4)' : isOwed ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)' }}
                        className={`rounded-full mr-3 ${isTablet ? 'w-2.5 h-2.5' : 'w-1.5 h-1.5'}`} 
                    />
                    <Text className={`font-body-bold text-[#594048] opacity-60 ${isTablet ? 'text-2xl' : 'text-[13px]'}`}>
                        {isSettled ? 'Settled Up' : isOwed ? `₹${item.netBalance.toLocaleString()} Owed` : `₹${Math.abs(item.netBalance).toLocaleString()} You Owe`}
                    </Text>
                </View>
            </View>

            <MaterialIcons name="chevron-right" size={isTablet ? 42 : 24} color="#b3006969" />
        </TouchableOpacity>
    );
};

export default HisaabGroupItem;
