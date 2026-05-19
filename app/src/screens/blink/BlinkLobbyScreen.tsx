import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// Hooks
import { useBlinkGroupLobby } from '../../hooks/blink/useBlinkGroupLobby';
import { useBlinkLobbySync } from '../../hooks/blink/useBlinkLobbySync';

// Components
import { LobbyTabSwitcher } from '../../components/games/lobby/LobbyTabSwitcher';
import { BlinkLobbyCard } from '../../components/games/lobby/BlinkLobbyCard';
import { BlinkScheduledCard } from '../../components/games/lobby/BlinkScheduledCard';
import { LobbyEmptyState } from '../../components/games/lobby/LobbyEmptyState';

interface LobbyProps {
    groupId: string;
    isTablet: boolean;
    primaryColor: string;
}

export const BlinkLobbyScreen = ({ groupId, isTablet, primaryColor }: LobbyProps) => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState<'active' | 'scheduled'>('active');

    // Blink Specific Hooks
    const data = useBlinkGroupLobby(groupId);

    useBlinkLobbySync(groupId);

    const handleAction = useCallback((game: any) => {
        const { game_code, status, host_id, blink_players = [] } = game;
        const isHost = host_id === data.userId;
        const isParticipant = blink_players.some((p: any) => p.user_id === data.userId);

        if (status === 'waiting' || status === 'scheduled') {
            if (isParticipant || isHost) {
                navigation.navigate('BlinkWaitingRoom', { gameCode: game_code, groupId });
            } else {
                navigation.navigate('BlinkJoin', { gameCode: game_code, groupId });
            }
        } else if (status === 'starting') {
            navigation.navigate('BlinkStarting', { gameCode: game_code, groupId });
        } else if (status === 'active') {
            navigation.navigate('BlinkGame', { gameCode: game_code, groupId });
        }
    }, [navigation, data.userId, groupId]);

    const currentGames = useMemo(() =>
        activeTab === 'active' ? data.activeGames : data.scheduledGames,
        [activeTab, data.activeGames, data.scheduledGames]
    );

    if (data.isGroupLoading || (data.isGamesLoading && !data.isGamesFetching)) {
        return (
            <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color={primaryColor} />
            </View>
        );
    }

    return (
        <ScrollView
            className="flex-1"
            contentContainerStyle={{
                paddingHorizontal: 24,
                paddingTop: 10,
                paddingBottom: Math.max(insets.bottom + 24, 40)
            }}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl refreshing={data.isGamesFetching} onRefresh={data.refetchGames} tintColor={primaryColor} />
            }
        >
            {/* Host Card */}
            <TouchableOpacity
                onPress={() => navigation.navigate('BlinkHostSettings', { groupId })}
                activeOpacity={0.9}
                style={{ height: isTablet ? 180 : 84, backgroundColor: primaryColor }}
                className="w-full mt-4 mb-10 rounded-[32px] flex-row items-center px-6 shadow-lg"
            >
                <View className={`bg-white rounded-[24px] items-center justify-center mr-6 ${isTablet ? 'w-24 h-24' : 'w-12 h-12'}`}>
                    <MaterialIcons name="add" size={isTablet ? 48 : 28} color={primaryColor} />
                </View>
                <View className="flex-1">
                    <Text className="font-headline-bold text-white" style={{ fontSize: isTablet ? 36 : 18 }} adjustsFontSizeToFit numberOfLines={1}>
                        Host Blink
                    </Text>
                    <Text className={`text-white/60 font-body-medium ${isTablet ? 'text-xl mt-1.5' : 'text-xs'}`}>
                        Start a live game or schedule for later
                    </Text>
                </View>
                <MaterialIcons name="chevron-right" size={isTablet ? 42 : 20} color="white" style={{ opacity: 0.6 }} />
            </TouchableOpacity>

            <LobbyTabSwitcher
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                activeCount={data.activeGames.length}
                activeColor={primaryColor}
            />

            <View className="w-full">
                {currentGames.length > 0 ? (
                    currentGames.map((game: any) => (
                        activeTab === 'active'
                            ? <BlinkLobbyCard key={game.id} game={game} memberCount={data.memberCount} onPress={handleAction} activeColor={primaryColor} />
                            : <BlinkScheduledCard key={game.id} game={game} memberCount={data.memberCount} onPress={handleAction} activeColor={primaryColor} />
                    ))
                ) : (
                    <LobbyEmptyState type={activeTab} />
                )}
            </View>
        </ScrollView>
    );
};
