import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

// Hooks
import { useIsTablet } from '../../hooks/useIsTablet';
import { useHousieGroupLobby } from '../../hooks/housie/useHousieGroupLobby';
import { useHousieLobbySync } from '../../hooks/housie/useHousieLobbySync';

// Components
import { LobbyTabSwitcher } from '../../components/housie/lobby/LobbyTabSwitcher';
import { LobbyGameCard } from '../../components/housie/lobby/LobbyGameCard';
import { LobbyScheduledCard } from '../../components/housie/lobby/LobbyScheduledCard';
import { LobbyEmptyState } from '../../components/housie/lobby/LobbyEmptyState';

const HousieLobbyScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute();
    const { groupId } = (route.params as { groupId: string }) || {};
    const isTablet = useIsTablet();

    const [activeTab, setActiveTab] = useState<'active' | 'scheduled'>('active');

    const {
        groupName,
        activeGames,
        scheduledGames,
        isGroupLoading,
        isGamesLoading,
        isGamesFetching,
        refetchGames,
        userId
    } = useHousieGroupLobby(groupId);

    // Sync listeners
    useHousieLobbySync(groupId);

    const handleGameAction = (game: any) => {
        const { game_code, status, myTicketCount, host_id } = game;
        const isHost = host_id === userId;

        if (status === 'waiting') {
            if (myTicketCount > 0 || isHost) {
                navigation.navigate('HousieWaitingRoom', { gameCode: game_code, groupId });
            } else {
                navigation.navigate('HousieJoinGame', { gameCode: game_code, groupId });
            }
        } else if (status === 'starting') {
            navigation.navigate('HousieStarting', { gameCode: game_code, groupId });
        } else if (status === 'active') {
            if (myTicketCount > 0) {
                navigation.navigate('HousieTicket', { gameCode: game_code, groupId });
            } else {
                navigation.navigate('HousieSpectator', { gameCode: game_code, groupId });
            }
        }
    };

    if (isGroupLoading || (isGamesLoading && !isGamesFetching)) {
        return (
            <SafeAreaView className="flex-1 bg-[#fdf9f3] items-center justify-center">
                <ActivityIndicator size="large" color="#b30069" />
            </SafeAreaView>
        );
    }

    const currentGames = activeTab === 'active' ? activeGames : scheduledGames;

    return (
        <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top', 'bottom']}>
            {/* Minimalist Top Header - Synchronized with MemoryScreen */}
            <View className={`flex-row items-center px-6 ${isTablet ? 'py-8' : 'py-4'}`}>
                <View style={{ width: isTablet ? 64 : 44 }}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        className={`items-center justify-center rounded-full bg-white shadow-sm border border-stone-100 ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}
                    >
                        <MaterialIcons name="arrow-back-ios" size={isTablet ? 28 : 20} color="#b30069" style={{ marginLeft: isTablet ? 12 : 5 }} />
                    </TouchableOpacity>
                </View>

                <View className="flex-1 items-center">
                    <Text className="font-headline-bold text-[#1c1c18] text-center" style={{ fontSize: isTablet ? 28 : 18 }} numberOfLines={1} adjustsFontSizeToFit>
                        {groupName || 'Game Lobby'}
                    </Text>
                </View>

                <View style={{ width: isTablet ? 64 : 44 }} className="items-end">
                    <TouchableOpacity
                        onPress={() => navigation.navigate('HousieLeaderboard', { groupId, groupName })}
                        className={`items-center justify-center rounded-full bg-[#b30069] shadow-md ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}
                    >
                        <Ionicons name="trophy" size={isTablet ? 28 : 20} color="white" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 10, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={isGamesFetching} onRefresh={refetchGames} color="#b30069" />
                }
            >


                {/* MATCHED HERO: HOST ROOM (GroupDetail Style) */}
                <TouchableOpacity
                    onPress={() => navigation.navigate('HousieHostSettings', { groupId })}
                    activeOpacity={0.9}
                    style={{ height: isTablet ? 180 : 84 }}
                    className="w-full mt-4 mb-10 bg-[#b30069] rounded-[32px] flex-row items-center px-6 shadow-lg shadow-[#b30069]/25"
                >
                    <View className={`bg-white rounded-[24px] items-center justify-center mr-6 ${isTablet ? 'w-24 h-24' : 'w-12 h-12'}`}>
                        <MaterialIcons name="add" size={isTablet ? 48 : 28} color="#b30069" />
                    </View>
                    <View className="flex-1">
                        <Text
                            className="font-headline-bold text-white"
                            style={{ fontSize: isTablet ? 36 : 18 }}
                            adjustsFontSizeToFit
                            numberOfLines={1}
                        >Host a Room</Text>
                        <Text className={`text-white/60 font-body-medium ${isTablet ? 'text-xl mt-1.5' : 'text-xs'}`}>
                            Start a live game or schedule for later
                        </Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={isTablet ? 42 : 20} color="white" style={{ opacity: 0.6 }} />
                </TouchableOpacity>

                {/* Tab Switcher - Now gets more focus */}
                <LobbyTabSwitcher
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    activeCount={activeGames.length}
                />

                {/* List View - Full height focus */}
                <View className="w-full">
                    {currentGames.length > 0 ? (
                        currentGames.map(game => (
                            activeTab === 'active'
                                ? <LobbyGameCard key={game.id} game={game} onPress={handleGameAction} />
                                : <LobbyScheduledCard key={game.id} game={game} onPress={handleGameAction} />
                        ))
                    ) : (
                        <LobbyEmptyState type={activeTab} />
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default HousieLobbyScreen;
