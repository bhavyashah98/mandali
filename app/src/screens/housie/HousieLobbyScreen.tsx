import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// Hooks
import { useHousieGroupLobby } from '../../hooks/housie/useHousieGroupLobby';
import { useHousieLobbySync } from '../../hooks/housie/useHousieLobbySync';

// Components
import { LobbyTabSwitcher } from '../../components/games/lobby/LobbyTabSwitcher';
import { HousieLobbyCard } from '../../components/games/lobby/HousieLobbyCard';
import { LobbyScheduledCard } from '../../components/games/lobby/LobbyScheduledCard';
import { LobbyEmptyState } from '../../components/games/lobby/LobbyEmptyState';

interface LobbyProps {
    groupId: string;
    planId?: string;
    isTablet: boolean;
    primaryColor: string;
}

export const HousieLobbyScreen = ({ groupId, planId, isTablet, primaryColor }: LobbyProps) => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState<'active' | 'scheduled'>('active');

    // Housie Specific Hooks
    const data = useHousieGroupLobby(groupId, planId);
    useHousieLobbySync(groupId);

    const handleAction = useCallback((game: any) => {
        const { game_code, status, myTicketCount, host_id } = game;
        const isHost = host_id === data.userId;

        if (status === 'waiting' || status === 'scheduled') {
            if (myTicketCount > 0 || isHost) {
                navigation.navigate('HousieWaitingRoom', { gameCode: game_code, groupId, planId });
            } else {
                navigation.navigate('HousieJoinGame', { gameCode: game_code, groupId, planId });
            }
        } else if (status === 'starting') {
            navigation.navigate('HousieStarting', { gameCode: game_code, groupId, planId });
        } else if (status === 'active') {
            if (myTicketCount > 0) {
                navigation.navigate('HousieTicket', { gameCode: game_code, groupId, planId });
            } else if (isHost && game.settings?.callingMode === 'manual') {
                navigation.navigate('HousieGame', { gameCode: game_code, groupId, planId });
            } else {
                navigation.navigate('HousieSpectator', { gameCode: game_code, groupId, planId });
            }
        }
    }, [navigation, data.userId, groupId, planId]);

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
                onPress={() => navigation.navigate('HousieHostSettings', { groupId, planId })}
                activeOpacity={0.9}
                style={{ height: isTablet ? 180 : 84, backgroundColor: primaryColor }}
                className="w-full mt-4 mb-10 rounded-[32px] flex-row items-center px-6 shadow-lg"
            >
                <View className={`bg-white rounded-[24px] items-center justify-center mr-6 ${isTablet ? 'w-24 h-24' : 'w-12 h-12'}`}>
                    <MaterialIcons name="add" size={isTablet ? 48 : 28} color={primaryColor} />
                </View>
                <View className="flex-1">
                    <Text className="font-headline-bold text-white" style={{ fontSize: isTablet ? 36 : 18 }} adjustsFontSizeToFit numberOfLines={1}>
                        Host Housie
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
                            ? <HousieLobbyCard key={game.id} game={game} memberCount={data.memberCount} onPress={handleAction} activeColor={primaryColor} />
                            : <LobbyScheduledCard key={game.id} game={game} memberCount={data.memberCount} onPress={handleAction} activeColor={primaryColor} />
                    ))
                ) : (
                    <LobbyEmptyState type={activeTab} />
                )}
            </View>
        </ScrollView>
    );
};
