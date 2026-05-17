import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useIsTablet } from '../../../hooks/useIsTablet';
import { getOptimizedImageUrl } from '../../../lib/api';
import MandaliCoin from '../../MandaliCoin';

interface GroupItemProps {
    item: {
        id: string;
        name: string;
        cover_photo_url?: string;
        is_admin?: boolean;
        memberCount?: number;
        totalWinnings?: number;
    };
}

export const GroupItem: React.FC<GroupItemProps> = ({ item }) => {
    const navigation = useNavigation<any>();
    const isTablet = useIsTablet();

    return (
        <TouchableOpacity
            onPress={() => navigation.navigate('GameSelection', { groupId: item.id })}
            activeOpacity={0.7}
            style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}
            className={`bg-white rounded-[32px] flex-row items-center border border-stone-100 mb-4 ${isTablet ? 'px-10 py-8' : 'px-4 py-4'}`}
        >
            {/* Group Avatar */}
            <View className={`rounded-2xl overflow-hidden bg-stone-50 border border-stone-100 ${isTablet ? 'w-24 h-24' : 'w-16 h-16'}`}>
                {item.cover_photo_url ? (
                    <Image
                        source={{ uri: getOptimizedImageUrl(item.cover_photo_url, 'w_300,q_auto,f_auto') }}
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

            {/* Group Details */}
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
                        style={{ backgroundColor: 'rgba(179, 0, 105, 0.4)' }}
                        className={`rounded-full mr-3 ${isTablet ? 'w-2.5 h-2.5' : 'w-1.5 h-1.5'}`} 
                    />
                    <Text className={`font-body-bold text-[#594048] opacity-60 ${isTablet ? 'text-2xl' : 'text-[13px]'}`}>
                        {item.is_admin ? 'Admin • ' : ''}{item.memberCount || 0} Members
                    </Text>
                </View>
                {item.totalWinnings !== undefined && item.totalWinnings > 0 && (
                    <View className="flex-row items-center mt-1">
                        <Text className={`font-headline-bold text-[#d97706] ${isTablet ? 'text-2xl' : 'text-[14px]'}`}>
                            {item.totalWinnings.toLocaleString()}
                        </Text>
                        <MandaliCoin size={isTablet ? 24 : 14} style={{ marginLeft: 4 }} />
                        <Text className={`font-body-bold text-[#d97706] ${isTablet ? 'text-2xl' : 'text-[14px]'}`} style={{ marginLeft: 4 }}>Won</Text>
                    </View>
                )}
            </View>

            {/* Navigation Icon */}
            <MaterialIcons name="chevron-right" size={isTablet ? 42 : 24} color="#b3006969" />
        </TouchableOpacity>
    );
};
