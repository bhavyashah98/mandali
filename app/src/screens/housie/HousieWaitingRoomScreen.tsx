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

import TicketUpdateModal from '../../components/housie/waiting-room/TicketUpdateModal';

const HousieWaitingRoomScreen = ({ navigation, route }: any) => {
    const isTablet = useIsTablet();
    const insets = useSafeAreaInsets();
    const { gameCode, groupId } = (route.params as { gameCode: string; groupId: string }) || {};
    const { user } = useAuthStore();

    const [activeTab, setActiveTab] = React.useState<'players' | 'prizes'>('players');
    const [isEditModalVisible, setIsEditModalVisible] = React.useState(false);

    const {
        game,
        groupData,
        stats,
        isHost,
        isLoading
    } = useHousieWaitingRoomData(gameCode, groupId);

    const hasTickets = stats?.participants?.some(p => p.id === user?.id && p.ticketCount > 0) || false;
    const currentUserStats = stats?.participants?.find(p => p.id === user?.id);
    const userTicketCount = currentUserStats?.ticketCount || 0;

    // Handle background/foreground sync and real-time transitions
    useHousieWaitingRoomSync({
        game,
        gameCode: gameCode || '',
        groupId: groupId || '',
        isHost,
        hasTickets
    });

    const handleStartGame = useCallback(async () => {
        try {
            await activateHousieGame(gameCode, game?.prizes);
        } catch (err) {
            console.error("Failed to start game:", err);
        }
    }, [gameCode, game?.prizes]);

    const horizontalPadding = isTablet ? 64 : 24;

    if (!user || (isLoading && !game)) {
        return (
            <SafeAreaView className="flex-1 bg-[#fdf9f3] items-center justify-center">
                <ActivityIndicator size="large" color="#b30069" />
            </SafeAreaView>
        );
    }

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
                    <View className="flex-row bg-stone-100 p-2 rounded-2xl">
                        <TouchableOpacity
                            onPress={() => setActiveTab('players')}
                            className={`flex-1 py-3 rounded-2xl items-center ${activeTab === 'players' ? 'bg-white' : ''}`}
                        >
                            <Text className={`font-headline-bold ${activeTab === 'players' ? 'text-primary' : 'text-stone-400'}`}>
                                Players ({stats?.participants?.length || 0})
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setActiveTab('prizes')}
                            className={`flex-1 py-3 rounded-2xl items-center ${activeTab === 'prizes' ? 'bg-white' : ''}`}
                        >
                            <Text className={`font-headline-bold ${activeTab === 'prizes' ? 'text-primary' : 'text-stone-400'}`}>
                                Prizes ({game?.prizes?.length || 0})
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {activeTab === 'players' ? (
                    <View style={{ paddingHorizontal: horizontalPadding }}>
                        {(stats?.participants || []).length > 0 ? (
                            (stats?.participants || []).map(participant => (
                                <ParticipantItem
                                    key={participant.id}
                                    participant={participant}
                                    hostId={game?.host_id}
                                    isTablet={isTablet}
                                    isCurrentUser={participant.id === user?.id}
                                    onEdit={() => setIsEditModalVisible(true)}
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
                userTicketCount={userTicketCount}
                isTablet={isTablet}
                gameStatus={game?.status}
                scheduledAt={game?.scheduled_at}
            />

            <TicketUpdateModal
                visible={isEditModalVisible}
                onClose={() => setIsEditModalVisible(false)}
                currentCount={userTicketCount}
                gameCode={gameCode || ''}
            />
        </View>
    );
};

export default HousieWaitingRoomScreen;
