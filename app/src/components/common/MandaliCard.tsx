import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useIsTablet } from '../../hooks/useIsTablet';
import { getOptimizedImageUrl } from '../../lib/api';

interface MandaliCardProps {
    item: {
        id?: string;
        groupId?: string;
        name: string;
        cover_photo_url?: string;
        avatar?: string | null;
        is_admin?: boolean;
        memberCount?: number;
        unseenCount?: number;
    };
    onPress: (id: string, name: string) => void;
    customSubtitle?: React.ReactNode;
    customBottomNode?: React.ReactNode;
}

export const MandaliCard: React.FC<MandaliCardProps> = ({ item, onPress, customSubtitle, customBottomNode }) => {
    const isTablet = useIsTablet();
    
    // Some screens pass 'id', others pass 'groupId'
    const id = item.id || item.groupId || '';
    const avatarUrl = item.cover_photo_url || item.avatar;

    return (
        <TouchableOpacity
            onPress={() => onPress(id, item.name)}
            activeOpacity={0.7}
            className={`bg-white rounded-[24px] px-${isTablet ? '6' : '4'} py-${isTablet ? '6' : '4'} flex-row items-center border border-stone-100 shadow-sm`}
            style={{ elevation: 2 }}
        >
            {/* Group Avatar (Squared-bordered) */}
            <View className={`rounded-[20px] overflow-hidden bg-stone-50 border border-stone-100 ${isTablet ? 'w-24 h-24' : 'w-16 h-16'}`}>
                {avatarUrl ? (
                    <Image
                        source={{ uri: getOptimizedImageUrl(avatarUrl, 'w_300,q_auto,f_auto') }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                    />
                ) : (
                    <View style={{ backgroundColor: 'rgba(179, 0, 105, 0.05)' }} className="w-full h-full items-center justify-center">
                        <Text className={`font-headline-bold text-primary opacity-30 ${isTablet ? 'text-4xl' : 'text-2xl'}`}>
                            {item.name?.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                )}
            </View>

            {/* Group Details */}
            <View className="flex-1 ml-5 justify-center">
                <Text className={`font-headline-bold text-[#1c1c18] mb-1.5 ${isTablet ? 'text-3xl' : 'text-lg'}`} numberOfLines={1}>
                    {item.name}
                </Text>
                {customSubtitle !== undefined ? (
                    customSubtitle
                ) : (
                    <View className="flex-row items-center">
                        <View style={{ backgroundColor: 'rgba(179, 0, 105, 0.4)' }} className={`rounded-full mr-3 ${isTablet ? 'w-2.5 h-2.5' : 'w-1.5 h-1.5'}`} />
                        <Text className={`font-body-bold text-[#594048] opacity-60 ${isTablet ? 'text-2xl' : 'text-[13px]'}`}>
                            {item.is_admin ? 'Admin • ' : ''}{item.memberCount || 0} Members
                        </Text>
                        {item.unseenCount != null && item.unseenCount > 0 && (
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#b30069', marginLeft: 8 }} />
                        )}
                    </View>
                )}
                {customBottomNode}
            </View>

            {/* Navigation Icon */}
            <MaterialIcons name="chevron-right" size={isTablet ? 42 : 24} color="#b3006969" />
        </TouchableOpacity>
    );
};
