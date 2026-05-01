import React, { useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

// Hooks
import { useIsTablet } from '../../hooks/useIsTablet';
import { useAuthStore } from '../../stores/authStore';
import { useHousieWaitingRoomData } from '../../hooks/useHousieWaitingRoomData';
import { useHousieWaitingRoomSync } from '../../hooks/housie/useHousieWaitingRoomSync';

// Components
import WaitingRoomHeader from '../../components/housie/waiting-room/WaitingRoomHeader';
import GameModeCard from '../../components/housie/waiting-room/GameModeCard';
import WaitingRoomStats from '../../components/housie/waiting-room/WaitingRoomStats';
import ParticipantItem from '../../components/housie/waiting-room/ParticipantItem';
import WaitingRoomFooter from '../../components/housie/waiting-room/WaitingRoomFooter';

const HousieWaitingRoomScreen = () => {
    const isTablet = useIsTablet();
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const route = useRoute();
    const { gameCode, groupId } = (route.params as { gameCode: string; groupId: string }) || {};
    const { user } = useAuthStore();

    const {
        game,
        groupData,
        stats,
        isHost,
        isLoading
    } = useHousieWaitingRoomData(gameCode, groupId);

    // Handle background/foreground sync and real-time transitions
    useHousieWaitingRoomSync({
        game,
        gameCode: gameCode || '',
        groupId: groupId || '',
        isHost
    });

    const handleStartGame = useCallback(() => {
        navigation.replace('HousieDefineBounty', { gameCode, groupId });
    }, [navigation, gameCode, groupId]);

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

            <FlatList
                className="flex-1"
                data={stats?.participants || []}
                renderItem={renderParticipant}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ 
                    paddingHorizontal: isTablet ? 64 : 24, 
                    paddingTop: isTablet ? 32 : 12, 
                    paddingBottom: 40 
                }}
                ListHeaderComponent={
                    <View>
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

                        <Text className={`text-stone-400 font-body-bold uppercase tracking-[2px] mt-12 mb-6 px-4 ${isTablet ? 'text-3xl' : 'text-xs'}`}>
                            Participants List
                        </Text>
                    </View>
                }
                ListEmptyComponent={() => (
                    <View className="items-center justify-center py-20">
                        <ActivityIndicator color="#b30069" size={isTablet ? 'large' : 'small'} />
                        <Text className={`text-stone-400 font-body-medium mt-6 ${isTablet ? 'text-3xl' : 'text-base'}`}>
                            Waiting for players to join...
                        </Text>
                    </View>
                )}
                showsVerticalScrollIndicator={false}
            />

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
