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
        pulseScore?: number;
        pulseRank?: string;
    };
    onPress: (id: string, name: string) => void;
    customSubtitle?: React.ReactNode;
    customBottomNode?: React.ReactNode;
    showUnseenBadge?: boolean;
    showPulse?: boolean;
}

export const MandaliCard: React.FC<MandaliCardProps> = ({ 
    item, 
    onPress, 
    customSubtitle, 
    customBottomNode, 
    showUnseenBadge,
    showPulse = true
}) => {
    const isTablet = useIsTablet();
    
    // Some screens pass 'id', others pass 'groupId'
    const id = item.id || item.groupId || '';
    const avatarUrl = item.cover_photo_url || item.avatar;
    const pulseScore = item.pulseScore ?? 78;
    const pulseRank = item.pulseRank ?? 'Top 15%';

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
                    <View className="flex-col">
                        <View className="flex-row items-center">
                            <View style={{ backgroundColor: '#b30069' }} className={`rounded-full mr-2 ${isTablet ? 'w-2.5 h-2.5' : 'w-1.5 h-1.5'}`} />
                            <Text className={`font-body-bold text-[#594048] opacity-60 ${isTablet ? 'text-2xl' : 'text-[13px]'}`}>
                                {item.is_admin ? 'Admin • ' : ''}{item.memberCount || 0} Members
                            </Text>
                        </View>
                        
                        <View className="flex-row items-center mt-1">
                            <Text className={`font-body-bold text-[#16a34a] ${isTablet ? 'text-[20px] mt-1.5' : 'text-[12px]'} flex-row items-center`}>
                                ↗ {pulseRank} ⬆
                            </Text>
                        </View>
                    </View>
                )}
                {customBottomNode}
            </View>

            {/* Pulse Badge */}
            {showPulse && (
                <View className={`items-center ${isTablet ? 'mr-5' : 'mr-2.5'}`}>
                    <View 
                        className="bg-[#fdf0f5] items-center justify-center"
                        style={{
                            width: isTablet ? 72 : 48,
                            height: isTablet ? 72 : 48,
                            borderRadius: isTablet ? 20 : 14,
                        }}
                    >
                        <Text 
                            className={`font-headline-bold text-[#b30069] ${isTablet ? 'text-[24px]' : 'text-[17px]'}`}
                        >
                            {pulseScore}
                        </Text>
                    </View>
                    <Text 
                        className={`font-body-medium text-[#594048] opacity-75 mt-1 text-center ${isTablet ? 'text-base mt-2' : 'text-[10px]'}`}
                    >
                        Pulse
                    </Text>
                </View>
            )}

            {/* WhatsApp-style Unseen Badge */}
            {showUnseenBadge && item.unseenCount != null && item.unseenCount > 0 && (
                <View 
                    style={{ 
                        backgroundColor: '#b30069', 
                        minWidth: isTablet ? 36 : 22, 
                        height: isTablet ? 36 : 22, 
                        borderRadius: isTablet ? 18 : 11, 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        paddingHorizontal: isTablet ? 8 : 6,
                        marginRight: isTablet ? 16 : 8,
                    }}
                >
                    <Text 
                        style={{ 
                            color: 'white', 
                            fontSize: isTablet ? 16 : 11,
                            fontWeight: 'bold',
                            textAlign: 'center',
                        }}
                    >
                        {item.unseenCount}
                    </Text>
                </View>
            )}

            {/* Navigation Icon */}
            <MaterialIcons name="chevron-right" size={isTablet ? 42 : 24} color="#b3006969" />
        </TouchableOpacity>
    );
};
