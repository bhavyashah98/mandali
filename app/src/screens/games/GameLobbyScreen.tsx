import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';

// Hooks & Constants
import { useIsTablet } from '../../hooks/useIsTablet';
import { GAME_REGISTRY } from '../../constants/gameRegistry';
import { fetchGroupDetail } from '../../lib/api';

const GameLobbyScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute();
    const { groupId, gameType = 'housie' } = (route.params as { groupId: string; gameType: string }) || {};
    const isTablet = useIsTablet();
    
    // Get config from registry
    const config = GAME_REGISTRY[gameType] || GAME_REGISTRY.housie;
    const ContentComponent = config.Component;

    // Fetch Group Detail for Header
    const { data: groupData } = useQuery({
        queryKey: ['group', groupId],
        queryFn: () => fetchGroupDetail(groupId!),
        enabled: !!groupId,
    });

    const groupName = groupData?.group?.name || 'This Mandali';

    return (
        <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top', 'bottom']}>
            {/* Top Header Shell (Common) */}
            <View className={`flex-row items-center px-6 ${isTablet ? 'py-8' : 'py-4'}`}>
                <View style={{ width: isTablet ? 64 : 44 }}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        className={`items-center justify-center rounded-full bg-white shadow-sm border border-stone-100 ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}
                    >
                        <MaterialIcons name="arrow-back-ios" size={isTablet ? 28 : 20} color={config.primaryColor} style={{ marginLeft: isTablet ? 12 : 5 }} />
                    </TouchableOpacity>
                </View>

                <View className="flex-1 items-center">
                    <View className="flex-row items-center">
                        <FontAwesome5 
                            name={config.icon as any} 
                            size={isTablet ? 24 : 14} 
                            color={config.primaryColor} 
                            style={{ marginRight: 8 }} 
                        />
                        <Text className="font-headline-bold text-[#1c1c18] text-center" style={{ fontSize: isTablet ? 28 : 18 }} numberOfLines={1} adjustsFontSizeToFit>
                            {config.title} Lobby
                        </Text>
                    </View>
                    <Text className={`font-body-bold text-stone-400 uppercase tracking-widest ${isTablet ? 'text-lg mt-1' : 'text-[9px]'}`}>
                        {groupName} • LOBBY
                    </Text>
                </View>

                <View style={{ width: isTablet ? 64 : 44 }} className="items-end">
                    <TouchableOpacity
                        onPress={() => navigation.navigate(config.leaderboardScreen, { groupId, groupName })}
                        className={`items-center justify-center rounded-full shadow-md ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}
                        style={{ backgroundColor: config.primaryColor }}
                    >
                        <Ionicons name="trophy" size={isTablet ? 28 : 20} color="white" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Game-Specific Content Component */}
            <ContentComponent 
                groupId={groupId} 
                isTablet={isTablet} 
                primaryColor={config.primaryColor}
            />
        </SafeAreaView>
    );
};

export default GameLobbyScreen;
