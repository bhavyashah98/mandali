import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Dimensions, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useIsFocused } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { fetchGroupDetail, fetchActiveHousieGame, API_URL } from '../../lib/api';
import { getSocket } from '../../lib/socketService';

const { width } = Dimensions.get('window');

const HousieLobbyScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute();
    const isFocused = useIsFocused(); // Track if we are currently looking at the lobby
    const { groupId } = (route.params as { groupId: string }) || {};
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useAuthStore();

    // Fetch active group detail
    const { data: groupData, isLoading: isGroupLoading } = useQuery({
        queryKey: ['group', groupId],
        queryFn: () => fetchGroupDetail(groupId!),
        enabled: !!groupId
    });

    const queryClient = useQueryClient();

    // Fetch if there's an ACTIVE game for this group right now — once only
    const { data: activeGameData, isFetching: isGameFetching } = useQuery({
        queryKey: ['activeHousieGame', groupId],
        queryFn: () => fetchActiveHousieGame(groupId!),
        enabled: !!groupId && isFocused,
        staleTime: 0,
        // NO refetchInterval — socket handles live updates
    });

    // Socket: join group room and listen for new game creation
    useEffect(() => {
        if (!groupId) return;
        const socket = getSocket();
        socket.emit('join_group', groupId);

        const onGameCreated = () => {
            queryClient.invalidateQueries({ queryKey: ['activeHousieGame', groupId] });
        };

        socket.on('game_created', onGameCreated);

        return () => {
            socket.off('game_created', onGameCreated);
        };
    }, [groupId]);

    const activeGame = activeGameData?.game;
    const groupName = groupData?.group?.name || 'Your';

    // AUTO-REDIRECT LOGIC: Smart redirect only when session is found and we aren't "returning"
    React.useEffect(() => {
        // Only redirect if the screen is focused and we are the host
        // Players will handle their own navigation via socket in the waiting room
        if (isFocused && activeGame && !isGameFetching && user && activeGame.host_id === user.id) {
            const status = activeGame.status;
            
            // If we are already in a state that should be elsewhere, move there
            if (status === 'waiting') {
                navigation.replace('HousieWaitingRoom', { 
                    gameCode: activeGame.game_code,
                    groupId: groupId
                });
            } else if (status === 'active') {
                navigation.replace('HousieGame', { 
                    gameCode: activeGame.game_code,
                    groupId: groupId
                });
            }
        }
    }, [activeGame?.id, activeGame?.status, user?.id, isFocused, groupId]);

    if (!user || isGroupLoading) {
        return (
            <SafeAreaView className="flex-1 bg-[#fdf9f3] items-center justify-center">
                <ActivityIndicator size="large" color="#b30069" />
            </SafeAreaView>
        );
    }

    const handleStartGame = () => {
        navigation.navigate('HousieCreateGame', { groupId });
    };

    const handleJoinGame = () => {
        if (!activeGame) {
            navigation.navigate('HousieJoinGame', { groupId });
        } else {
            navigation.navigate('HousieJoinGame', { 
                gameCode: activeGame.game_code,
                groupId: groupId
            });
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top', 'bottom']}>
            <ScrollView
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 24 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Main Card */}
                <View
                    className="bg-white rounded-[40px] p-8 w-full items-center shadow-2xl shadow-black/5 border border-black/5"
                    style={{ elevation: 12 }}
                >
                    <Text className="text-[#b30069] font-body-bold tracking-[2px] text-xs mb-4 uppercase">
                        {groupName} Family
                    </Text>

                    <Text className="text-[#31302d] text-[42px] font-headline-bold leading-[48px] text-center mb-6">
                        {"Housie\nGathering"}
                    </Text>

                    <Text className="text-stone-400 text-center text-lg font-body-medium leading-6 mb-12">
                        Grab your tickets and get ready for a night of numbers, laughter, and high-stakes excitement.
                    </Text>

                    {/* Action Buttons */}
                    <View className="w-full gap-4">
                        <TouchableOpacity
                            onPress={handleStartGame}
                            disabled={isLoading}
                            className="bg-[#b30069] h-20 rounded-[32px] flex-row items-center justify-center shadow-lg shadow-[#b30069]/30"
                        >
                            <Ionicons name="play" size={28} color="white" />
                            <Text className="text-white font-headline-bold text-2xl ml-3">Start Game</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleJoinGame}
                            className="bg-stone-50 h-20 rounded-[32px] flex-row items-center justify-center border border-stone-100"
                        >
                            <Ionicons name="ticket" size={28} color="#31302d" />
                            <Text className="text-[#31302d] font-headline-bold text-2xl ml-3">Join Game</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Active Game Info */}
                {activeGame && (
                    <View className="mt-6 items-center bg-white p-6 rounded-[32px] border border-stone-100 shadow-sm w-full">
                        <Text className="text-stone-400 font-body-bold text-xs uppercase tracking-widest mb-2">Live Game Code</Text>
                        <Text className="text-[#b30069] font-headline-bold text-3xl mb-1">{activeGame.game_code}</Text>
                        <Text className="text-stone-400 font-body-medium text-center">Share this code with your Mandali.</Text>
                    </View>
                )}

                {/* Leaderboard Button */}
                <TouchableOpacity
                    onPress={() => navigation.navigate('HousieLeaderboard', { groupId, groupName })}
                    className="h-20 rounded-[32px] mt-6 flex-row items-center justify-center border border-primary/20 bg-primary/5 w-full"
                >
                    <MaterialIcons name="emoji-events" size={28} color="#b30069" />
                    <Text className="text-primary font-headline-bold text-2xl ml-3">Leaderboard</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Back Button */}
            <TouchableOpacity
                onPress={() => navigation.goBack()}
                className="absolute top-16 left-8 w-12 h-12 items-center justify-center bg-white rounded-full shadow-md z-10 border border-stone-50"
            >
                <MaterialIcons name="arrow-back" size={28} color="#31302d" />
            </TouchableOpacity>
        </SafeAreaView>
    );
};

export default HousieLobbyScreen;
