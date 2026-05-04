import React, { useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// Hooks
import { useIsTablet } from '../../hooks/useIsTablet';
import { useAuthStore } from '../../stores/authStore';
import { useHousieWaitingRoomData } from '../../hooks/useHousieWaitingRoomData';
import { useHousieWaitingRoomSync } from '../../hooks/housie/useHousieWaitingRoomSync';

// API
import { activateHousieGame } from '../../lib/api';

// Components
import WaitingRoomHeader from '../../components/housie/waiting-room/WaitingRoomHeader';
import GameModeCard from '../../components/housie/waiting-room/GameModeCard';
import WaitingRoomStats from '../../components/housie/waiting-room/WaitingRoomStats';
import ParticipantItem from '../../components/housie/waiting-room/ParticipantItem';
import WaitingRoomFooter from '../../components/housie/waiting-room/WaitingRoomFooter';
import WaitingRoomPrizes from '../../components/housie/waiting-room/WaitingRoomPrizes';

const HousieWaitingRoomScreen = ({ navigation, route }: any) => {
    const isTablet = useIsTablet();
    const insets = useSafeAreaInsets();
    const { gameCode, groupId } = (route.params as { gameCode: string; groupId: string }) || {};
    const { user } = useAuthStore();

    const {
        game,
        groupData,
        stats,
        isHost,
        isLoading
    } = useHousieWaitingRoomData(gameCode, groupId);

    const [activeTab, setActiveTab] = React.useState<'players' | 'prizes'>('players');

    // Handle background/foreground sync and real-time transitions
    useHousieWaitingRoomSync({
        game,
        gameCode: gameCode || '',
        groupId: groupId || '',
        isHost
    });

    const handleStartGame = useCallback(async () => {
        try {
            await activateHousieGame(gameCode, game?.prizes);
        } catch (err) {
            console.error("Failed to start game:", err);
        }
    }, [gameCode, game?.prizes]);

    const renderParticipant = useCallback(({ item }: { item: any }) => (
        <ParticipantItem
            participant={item}
            hostId={game?.host_id}
            isTablet={isTablet}
        />
    ), [game?.host_id, isTablet]);

    if (!user || (isLoading && !game)) {
        return (
            <SafeAreaView className="flex-1 bg-[#fdf9f3] items-center justify-center">
                <ActivityIndicator size="large" color="#b30069" />
            </SafeAreaView>
        );
    }

    const horizontalPadding = isTablet ? 64 : 24;

    return (
        <View className="flex-1 bg-[#fdf9f3]" style={{ paddingTop: insets.top }}>
            <WaitingRoomHeader
                groupName={groupData?.group?.name}
                hostName={game?.hostName}
                isHost={isHost}
                gameCode={gameCode || ''}
                groupId={groupId || ''}
                isTablet={isTablet}
                onBack={() => navigation.goBack()}
            />

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
            >
                <View style={{ paddingHorizontal: horizontalPadding }}>
                    <GameModeCard
                        gameCode={gameCode || ''}
                        settings={game?.settings}
                        isTablet={isTablet}
                    />

                    <WaitingRoomStats
                        playerCount={stats?.participants?.length || 0}
                        ticketCount={stats?.totalTickets || 0}
                        isTablet={isTablet}
                    />
                </View>

                {/* Premium Tabs */}
                <View className="mt-8 mb-6" style={{ paddingHorizontal: horizontalPadding }}>
                    <View className="flex-row bg-stone-100 p-2 rounded-[24px]">
                        <TouchableOpacity
                            onPress={() => setActiveTab('players')}
                            className={`flex-1 py-3 rounded-[20px] items-center ${activeTab === 'players' ? 'bg-white shadow-sm' : ''}`}
                        >
                            <Text className={`font-headline-bold ${activeTab === 'players' ? 'text-primary' : 'text-stone-400'}`}>
                                Players ({stats?.participants?.length || 0})
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setActiveTab('prizes')}
                            className={`flex-1 py-3 rounded-[20px] items-center ${activeTab === 'prizes' ? 'bg-white shadow-sm' : ''}`}
                        >
                            <Text className={`font-headline-bold ${activeTab === 'prizes' ? 'text-primary' : 'text-stone-400'}`}>
                                Prizes ({game?.prizes?.length || 0})
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {activeTab === 'players' ? (
                    <View style={{ paddingHorizontal: horizontalPadding }}>
                        {game?.status === 'scheduled' && (
                            <View className="bg-white p-6 rounded-[32px] mb-8 items-center border border-stone-100 shadow-sm">
                                <Ionicons name="time-outline" size={24} color="#b30069" />
                                <Text className="text-stone-800 font-headline-bold text-center mt-2">
                                    Scheduled For:
                                </Text>
                                <Text className="text-primary font-headline-bold text-xl">
                                    {new Date(game.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </View>
                        )}

                        {(stats?.participants || []).length > 0 ? (
                            (stats?.participants || []).map(participant => (
                                <ParticipantItem
                                    key={participant.id}
                                    participant={participant}
                                    hostId={game?.host_id}
                                    isTablet={isTablet}
                                />
                            ))
                        ) : (
                            <View className="items-center justify-center py-20">
                                <ActivityIndicator color="#b30069" size={isTablet ? 'large' : 'small'} />
                                <Text className={`text-stone-400 font-body-medium mt-6 ${isTablet ? 'text-3xl' : 'text-base'}`}>
                                    Waiting for players to join...
                                </Text>
                            </View>
                        )}
                    </View>
                ) : (
                    <View style={{ paddingHorizontal: horizontalPadding }}>
                        <WaitingRoomPrizes
                            prizes={game?.prizes || []}
                            ticketPrice={100}
                            totalTickets={stats?.totalTickets || 0}
                            isTablet={isTablet}
                        />
                    </View>
                )}
            </ScrollView>

            <WaitingRoomFooter
                isHost={isHost}
                onStart={handleStartGame}
                totalTickets={stats?.totalTickets || 0}
                isTablet={isTablet}
            />
        </View>
    );
};

export default HousieWaitingRoomScreen;
