import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Dimensions, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useIsFocused } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { fetchGroupDetail, fetchActiveHousieGame, fetchHousieTickets, createHousieGame, cancelHousieGame, API_URL } from '../../lib/api';
import { getSocket } from '../../lib/socketService';

const { width } = Dimensions.get('window');

const HousieLobbyScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute();
    const isFocused = useIsFocused(); // Track if we are currently looking at the lobby
    const { groupId } = (route.params as { groupId: string }) || {};
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useAuthStore();

    const { data: groupData, isLoading: isGroupLoading } = useQuery({
        queryKey: ['group', groupId],
        queryFn: () => fetchGroupDetail(groupId!),
        enabled: !!groupId
    });

    const queryClient = useQueryClient();

    const { data: activeGameData, isFetching: isGameFetching } = useQuery({
        queryKey: ['activeHousieGame', groupId],
        queryFn: () => fetchActiveHousieGame(groupId!),
        enabled: !!groupId && isFocused,
        staleTime: 0,
    });

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

    console.log(activeGameData);

    const activeGame = activeGameData?.game;
    const groupName = groupData?.group?.name || 'Your';

    // Fetch if the active user already successfully purchased tickets for the active game
    const { data: ticketData } = useQuery({
        queryKey: ['housieTickets', activeGame?.game_code],
        queryFn: () => fetchHousieTickets(activeGame?.game_code!),
        enabled: !!activeGame?.game_code && isFocused,
        staleTime: 0
    });

    const hasTickets = ticketData?.tickets && ticketData.tickets.length > 0;

    // --- Stuck game escape hatch logic ---
    const INACTIVITY_LIMITS_MINS: Record<string, number> = {
        not_started: 2,
        waiting: 30,
        bounty: 15,
        active: 60,
    };

    const getInactiveMinutes = (game: any): number => {
        const refTime = game.status === 'active'
            ? (game.last_number_called_at || game.last_activity_at || game.created_at)
            : (game.last_activity_at || game.created_at);
        return (Date.now() - new Date(refTime).getTime()) / 1000 / 60;
    };

    const isStuck = activeGame &&
        activeGame.status !== 'ended' &&
        INACTIVITY_LIMITS_MINS[activeGame.status] !== undefined &&
        getInactiveMinutes(activeGame) > INACTIVITY_LIMITS_MINS[activeGame.status];

    const showCancelCTA = isStuck;

    if (!user || isGroupLoading) {
        return (
            <SafeAreaView className="flex-1 bg-[#fdf9f3] items-center justify-center">
                <ActivityIndicator size="large" color="#b30069" />
            </SafeAreaView>
        );
    }

    const handleStartGame = async () => {
        if (!activeGame || activeGame.status === 'ended') {
            try {
                setIsLoading(true);
                const result = await createHousieGame(groupId!);
                navigation.navigate('HousieCreateGame', { groupId, gameCode: result.game.game_code });
            } catch (err: any) {
                Alert.alert('Error', err?.response?.data?.error || 'Failed to initialize staging game.');
            } finally {
                setIsLoading(false);
            }
            return;
        }

        if (activeGame && activeGame.host_id === user?.id) {
            switch (activeGame.status) {
                case 'not_started': navigation.navigate('HousieCreateGame', { groupId, gameCode: activeGame.game_code }); break;
                case 'waiting': navigation.navigate('HousieWaitingRoom', { gameCode: activeGame.game_code, groupId }); break;
                case 'bounty': navigation.navigate('HousieDefineBounty', { gameCode: activeGame.game_code, groupId }); break;
                case 'active': navigation.navigate('HousieGame', { gameCode: activeGame.game_code, groupId }); break;
            }
        }
    };

    const handleCancelStuckGame = () => {
        Alert.alert(
            'Cancel This Game?',
            'The host seems unavailable. Cancelling will end the game so anyone can host a new one.',
            [
                { text: 'Keep Waiting', style: 'cancel' },
                {
                    text: 'Cancel Game',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setIsLoading(true);
                            await cancelHousieGame(activeGame!.game_code);
                            queryClient.invalidateQueries({ queryKey: ['activeHousieGame', groupId] });
                        } catch (err: any) {
                            Alert.alert('Error', err?.response?.data?.error || 'Could not cancel game.');
                        } finally {
                            setIsLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const getJoinButtonConfig = () => {
        if (!activeGame || activeGame.status === 'ended') return { label: 'Join Game', action: () => navigation.navigate('HousieJoinGame', { groupId }), icon: 'ticket', disabled: false };

        if (hasTickets) {
            switch (activeGame.status) {
                case 'not_started': return { label: 'Setting prices...', action: () => { }, icon: 'hourglass', disabled: true };
                case 'waiting': return { label: 'Go to Waiting Room', action: () => navigation.navigate('HousieWaitingRoom', { gameCode: activeGame.game_code, groupId }), icon: 'arrow-redo', disabled: false };
                case 'bounty': return { label: 'Waiting for host to start...', action: () => { }, icon: 'hourglass', disabled: true };
                case 'active': return { label: 'Resume Game', action: () => navigation.navigate('HousieTicket', { gameCode: activeGame.game_code, groupId }), icon: 'play', disabled: false };
                default: return { label: 'Resume', action: () => { }, icon: 'arrow-redo', disabled: false };
            }
        } else {
            switch (activeGame.status) {
                case 'not_started': return { label: 'Setting prices...', action: () => { }, icon: 'hourglass', disabled: true };
                case 'waiting': return { label: 'Join Game', action: () => navigation.navigate('HousieJoinGame', { gameCode: activeGame.game_code, groupId }), icon: 'ticket', disabled: false };
                case 'bounty': return { label: 'Watch Live', action: () => navigation.navigate('HousieSpectator', { gameCode: activeGame.game_code, groupId }), icon: 'eye', disabled: false };
                case 'active': return { label: 'Watch Live', action: () => navigation.navigate('HousieSpectator', { gameCode: activeGame.game_code, groupId }), icon: 'eye', disabled: false };
                default: return { label: 'Join Game', action: () => { }, icon: 'ticket', disabled: false };
            }
        }
    };

    const joinConfig = getJoinButtonConfig();

    // UI Helpers
    const isHostOfActiveGame = activeGame && activeGame.host_id === user?.id && activeGame.status !== 'ended';
    const hasEndedGame = activeGame?.status === 'ended';

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
                        {groupName}
                    </Text>

                    <Text className="text-[#31302d] text-[42px] font-headline-bold leading-[48px] text-center mb-6">
                        {"Housie\nGathering"}
                    </Text>

                    <Text className="text-stone-400 text-center text-lg font-body-medium leading-6 mb-12">
                        Grab your tickets and get ready for a night of numbers, laughter, and high-stakes excitement.
                    </Text>

                    {/* Action Buttons */}
                    <View className="w-full gap-4">

                        {/* ── CASE 1: No ongoing game → Host a Game only ── */}
                        {(!activeGame || activeGame.status === 'ended') && (
                            <TouchableOpacity
                                onPress={handleStartGame}
                                disabled={isLoading}
                                className="bg-[#b30069] h-20 rounded-[32px] flex-row items-center justify-center shadow-lg shadow-[#b30069]/30"
                            >
                                {isLoading
                                    ? <ActivityIndicator color="white" />
                                    : <>
                                        <Ionicons name="play" size={28} color="white" />
                                        <Text className="text-white font-headline-bold text-2xl ml-3">Host a Game</Text>
                                    </>
                                }
                            </TouchableOpacity>
                        )}

                        {/* ── CASE 2: Game in progress ── */}
                        {activeGame && activeGame.status !== 'ended' && (
                            <>
                                {/* HOST: Resume button */}
                                {isHostOfActiveGame && (
                                    <TouchableOpacity
                                        onPress={handleStartGame}
                                        className="bg-[#b30069] h-20 rounded-[32px] flex-row items-center justify-center shadow-lg shadow-[#b30069]/30"
                                    >
                                        <Ionicons name="play-forward" size={28} color="white" />
                                        <Text className="text-white font-headline-bold text-2xl ml-3">Resume Hosting</Text>
                                    </TouchableOpacity>
                                )}

                                {/* MEMBER: Context-aware join/status button */}
                                {!isHostOfActiveGame && (
                                    <TouchableOpacity
                                        onPress={joinConfig.action}
                                        disabled={joinConfig.disabled}
                                        className={`h-20 rounded-[32px] flex-row items-center justify-center border ${joinConfig.disabled
                                            ? 'bg-stone-100 border-stone-200'
                                            : 'bg-stone-50 border-stone-100'
                                            }`}
                                    >
                                        <Ionicons
                                            name={joinConfig.icon as any}
                                            size={24}
                                            color={joinConfig.disabled ? '#9ca3af' : '#31302d'}
                                        />
                                        <Text className={`ml-3 font-headline-bold ${joinConfig.disabled
                                            ? 'text-stone-400 text-base'
                                            : 'text-[#31302d] text-2xl'
                                            }`}>
                                            {joinConfig.label}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </>
                        )}

                        {/* ── CASE 3: Last game ended → show results shortcut ── */}
                        {hasEndedGame && (
                            <TouchableOpacity
                                onPress={() => navigation.navigate('HousieResults', { gameCode: activeGame.game_code, groupId })}
                                className="bg-primary/10 h-16 rounded-[24px] flex-row items-center justify-center border border-primary/20"
                            >
                                <Ionicons name="trophy" size={24} color="#b30069" />
                                <Text className="text-primary font-headline-bold text-xl ml-3">Show Last Results</Text>
                            </TouchableOpacity>
                        )}

                    </View>
                </View>

                {/* Active Game Info */}
                {activeGame && activeGame.status !== 'ended' && (
                    <View className="mt-6 items-center bg-white p-6 rounded-[32px] border border-stone-100 shadow-sm w-full">
                        <Text className="text-stone-400 font-body-bold text-xs uppercase tracking-widest mb-2">Live Game Code</Text>
                        <Text className="text-[#b30069] font-headline-bold text-3xl mb-1">{activeGame.game_code}</Text>
                        <Text className="text-stone-400 font-body-medium text-center">Share this code with your Mandali.</Text>
                    </View>
                )}

                {/* Escape Hatch — only visible when host is inactive */}
                {showCancelCTA && (
                    <View className="mt-4 w-full bg-amber-50 border border-amber-200 rounded-[28px] p-5">
                        <View className="flex-row items-center mb-2">
                            <Ionicons name="warning-outline" size={20} color="#d97706" />
                            <Text className="ml-2 text-amber-700 font-body-bold text-sm">Host seems unavailable</Text>
                        </View>
                        <Text className="text-amber-600 font-body-medium text-sm leading-5 mb-4">
                            The game has been idle for too long. You can cancel it so anyone can host a new game.
                        </Text>
                        <TouchableOpacity
                            onPress={handleCancelStuckGame}
                            disabled={isLoading}
                            className="bg-amber-600 h-14 rounded-[18px] flex-row items-center justify-center"
                        >
                            <Ionicons name="close-circle-outline" size={22} color="white" />
                            <Text className="text-white font-headline-bold text-base ml-2">Cancel This Game</Text>
                        </TouchableOpacity>
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
