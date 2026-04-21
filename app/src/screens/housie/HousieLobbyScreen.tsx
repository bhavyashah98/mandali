import React, { useState, useEffect, useCallback } from 'react';
import { useIsTablet } from '../../hooks/useIsTablet';
import { View, Text, TouchableOpacity, Dimensions, ActivityIndicator, Alert, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { fetchGroupDetail, fetchActiveHousieGame, fetchHousieTickets, createHousieGame, cancelHousieGame, API_URL } from '../../lib/api';
import { getSocket } from '../../lib/socketService';

const HousieLobbyScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute();
    const { groupId } = (route.params as { groupId: string }) || {};
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useAuthStore();
    const { width } = useWindowDimensions();
    const isTablet = useIsTablet();

    const { data: groupData, isLoading: isGroupLoading } = useQuery({
        queryKey: ['group', groupId],
        queryFn: () => fetchGroupDetail(groupId!),
        enabled: !!groupId
    });

    const queryClient = useQueryClient();

    const { data: activeGameData, isFetching: isGameFetching } = useQuery({
        queryKey: ['activeHousieGame', groupId],
        queryFn: () => fetchActiveHousieGame(groupId!),
        enabled: !!groupId,
        staleTime: 0,
    });

    useEffect(() => {
        if (!groupId) return;
        const socket = getSocket();
        socket.emit('join_group', groupId);

        const onGameCreated = () => {
            queryClient.invalidateQueries({ queryKey: ['activeHousieGame', groupId] });
        };

        const onGameStatusChanged = () => {
            queryClient.invalidateQueries({ queryKey: ['activeHousieGame', groupId] });
        };

        const onGameEnded = () => {
            queryClient.invalidateQueries({ queryKey: ['activeHousieGame', groupId] });
        };

        socket.on('game_created', onGameCreated);
        socket.on('game_status_changed', onGameStatusChanged);
        socket.on('game_ended', onGameEnded);

        return () => {
            socket.off('game_created', onGameCreated);
            socket.off('game_status_changed', onGameStatusChanged);
            socket.off('game_ended', onGameEnded);
        };
    }, [groupId]);

    // Refetch game status every time the screen comes into focus
    // This fixes stale button state (e.g. "Go to Waiting Room" vs "Resume Game")
    // when navigating back from HousieGame/WaitingRoom screens
    useFocusEffect(
        useCallback(() => {
            if (groupId) {
                queryClient.invalidateQueries({ queryKey: ['activeHousieGame', groupId] });
            }
        }, [groupId, queryClient])
    );

    const activeGame = activeGameData?.activeGame;
    const lastGame = activeGameData?.lastGame;
    const groupName = groupData?.group?.name || 'Your';

    // Fetch if the active user already successfully purchased tickets for the active game
    const { data: ticketData } = useQuery({
        queryKey: ['housieTickets', activeGame?.game_code],
        queryFn: () => fetchHousieTickets(activeGame?.game_code!),
        enabled: !!activeGame?.game_code,
        staleTime: 0
    });

    const hasTickets = ticketData?.tickets && ticketData.tickets.length > 0;

    // --- Stuck game escape hatch logic ---
    const INACTIVITY_LIMITS_MINS: Record<string, number> = {
        not_started: 10,
        waiting: 10,
        bounty: 5,
        active: 15,
    };

    const getInactiveMinutes = (game: any): number => {
        const refTime = game.status === 'active'
            ? (game.last_number_called_at || game.last_activity_at || game.created_at)
            : (game.last_activity_at || game.created_at);
        return (Date.now() - new Date(refTime).getTime()) / 1000 / 60;
    };

    const isHostOfActiveGame = activeGame && activeGame.host_id === user?.id && activeGame.status !== 'ended';
    const isStuck = activeGame &&
        activeGame.status !== 'ended' &&
        INACTIVITY_LIMITS_MINS[activeGame.status] !== undefined &&
        getInactiveMinutes(activeGame) > INACTIVITY_LIMITS_MINS[activeGame.status];

    const showCancelCTA = isStuck && !isHostOfActiveGame;

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
                case 'bounty': return { label: 'Resume Game', action: () => navigation.navigate('HousieTicket', { gameCode: activeGame.game_code, groupId }), icon: 'play', disabled: false };
                case 'active': return { label: 'Resume Game', action: () => navigation.navigate('HousieTicket', { gameCode: activeGame.game_code, groupId }), icon: 'play', disabled: false };
                default: return { label: 'Resume', action: () => navigation.navigate('HousieTicket', { gameCode: activeGame.game_code, groupId }), icon: 'play', disabled: false };
            }
        } else {
            switch (activeGame.status) {
                case 'not_started': return { label: 'Setting prices...', action: () => { }, icon: 'hourglass', disabled: true };
                case 'waiting': return { label: 'Join Game', action: () => navigation.navigate('HousieJoinGame', { gameCode: activeGame.game_code, groupId }), icon: 'ticket', disabled: false };
                case 'bounty': return { label: 'Watch Live', action: () => navigation.navigate('HousieSpectator', { gameCode: activeGame.game_code, groupId }), icon: 'eye', disabled: false };
                case 'active': return { label: 'Watch Live', action: () => navigation.navigate('HousieSpectator', { gameCode: activeGame.game_code, groupId }), icon: 'eye', disabled: false };
                default: return { label: 'Join Game', action: () => navigation.navigate('HousieJoinGame', { groupId }), icon: 'ticket', disabled: false };
            }
        }
    };

    const joinConfig = getJoinButtonConfig();

    // UI Helpers
    const hasLastGame = !!lastGame;

    return (
        <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top', 'bottom']}>
            <ScrollView
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: isTablet ? 60 : 24, paddingVertical: isTablet ? 60 : 24 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Main Card */}
                <View
                    className={`bg-white rounded-[40px] w-full items-center shadow-2xl shadow-black/5 border border-black/5 ${isTablet ? 'p-16' : 'p-8'}`}
                    style={{ elevation: 12 }}
                >
                    <Text className={`text-[#b30069] font-body-bold tracking-[2px] mb-4 uppercase ${isTablet ? 'text-lg' : 'text-xs'}`}>
                        {groupName}
                    </Text>

                    <Text
                        className={`text-[#31302d] font-headline-bold text-center mb-6 ${isTablet ? 'text-[64px] leading-[72px]' : 'text-[42px] leading-[48px]'}`}
                    >
                        {"Housie\nGathering"}
                    </Text>

                    <Text className={`text-stone-400 text-center font-body-medium leading-6 mb-12 ${isTablet ? 'text-2xl px-10' : 'text-lg'}`}>
                        Grab your tickets and get ready for a night of numbers, laughter, and high-reward excitement.
                    </Text>

                    {/* Action Buttons */}
                    <View className="w-full gap-4">

                        {/* ── CASE 1: No ongoing game → Host a Game only ── */}
                        {(!activeGame || activeGame.status === 'ended') && (
                            <TouchableOpacity
                                onPress={handleStartGame}
                                disabled={isLoading}
                                className={`bg-[#b30069] rounded-[32px] flex-row items-center justify-center shadow-lg shadow-[#b30069]/30 ${isTablet ? 'h-28' : 'h-20'}`}
                            >
                                {isLoading
                                    ? <ActivityIndicator color="white" />
                                    : <>
                                <Ionicons name="play" size={isTablet ? 40 : 28} color="white" />
                                <Text 
                                    numberOfLines={1} 
                                    adjustsFontSizeToFit 
                                    className={`text-white font-headline-bold ml-3 ${isTablet ? 'text-3xl' : 'text-2xl'}`}
                                >Host a Game</Text>
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
                                        className={`bg-[#b30069] rounded-[32px] flex-row items-center justify-center shadow-lg shadow-[#b30069]/30 ${isTablet ? 'h-28' : 'h-20'}`}
                                    >
                                        <Ionicons name="play-forward" size={isTablet ? 40 : 28} color="white" />
                                        <Text 
                                            numberOfLines={1} 
                                            adjustsFontSizeToFit 
                                            className={`text-white font-headline-bold ml-3 ${isTablet ? 'text-3xl' : 'text-2xl'}`}
                                        >Resume Hosting</Text>
                                    </TouchableOpacity>
                                )}

                                {/* MEMBER: Context-aware join/status button */}
                                {!isHostOfActiveGame && (
                                    <TouchableOpacity
                                        onPress={joinConfig.action}
                                        disabled={joinConfig.disabled}
                                        className={`rounded-[32px] flex-row items-center justify-center border ${isTablet ? 'h-28' : 'h-20'} ${joinConfig.disabled
                                            ? 'bg-stone-100 border-stone-200'
                                            : 'bg-stone-50 border-stone-100'
                                            }`}
                                    >
                                        <Ionicons
                                            name={joinConfig.icon as any}
                                            size={isTablet ? 36 : 24}
                                            color={joinConfig.disabled ? '#9ca3af' : '#31302d'}
                                        />
                                        <Text className={`ml-3 font-headline-bold ${joinConfig.disabled
                                            ? `text-stone-400 ${isTablet ? 'text-2xl' : 'text-base'}`
                                            : `${isTablet ? 'text-3xl' : 'text-2xl'} text-[#31302d]`
                                            }`}>
                                            {joinConfig.label}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </>
                        )}

                        {/* ── CASE 3: Persistent Last Game Leaderboard ── */}
                        {hasLastGame && (
                            <TouchableOpacity
                                onPress={() => navigation.navigate('HousieResults', { gameCode: lastGame.game_code, groupId })}
                                className={`bg-primary/5 rounded-[24px] flex-row items-center justify-center border border-primary/20 ${isTablet ? 'h-24 px-10' : 'h-16'}`}
                            >
                                <Ionicons name="trophy" size={isTablet ? 36 : 24} color="#b30069" />
                                <View className="ml-4">
                                    <Text className={`text-primary font-headline-bold leading-tight ${isTablet ? 'text-2xl' : 'text-lg'}`}>Last Results</Text>
                                    <Text className={`text-primary/60 font-body-bold uppercase tracking-wider ${isTablet ? 'text-base mt-1' : 'text-[10px]'}`}>{lastGame.game_code}</Text>
                                </View>
                            </TouchableOpacity>
                        )}

                    </View>
                </View>

                {/* Active Game Info */}
                {activeGame && activeGame.status !== 'ended' && (
                    <View className={`mt-8 items-center bg-white rounded-[32px] border border-stone-100 shadow-sm w-full ${isTablet ? 'p-12' : 'p-6'}`}>
                        <Text className={`text-stone-400 font-body-bold uppercase tracking-widest mb-3 ${isTablet ? 'text-xl' : 'text-xs'}`}>Live Game Code</Text>
                        <Text className={`text-[#b30069] font-headline-bold mb-2 ${isTablet ? 'text-7xl' : 'text-3xl'}`}>{activeGame.game_code}</Text>
                        <Text className={`text-stone-400 font-body-medium text-center ${isTablet ? 'text-2xl mt-2' : ''}`}>Share this code with your Mandali.</Text>
                    </View>
                )}

                {/* Escape Hatch — only visible when host is inactive */}
                {showCancelCTA && (
                    <View className={`mt-6 w-full bg-amber-50 border border-amber-200 rounded-[32px] ${isTablet ? 'p-10' : 'p-5'}`}>
                        <View className="flex-row items-center mb-4">
                            <Ionicons name="warning-outline" size={isTablet ? 32 : 20} color="#d97706" />
                            <Text className={`ml-3 text-amber-700 font-body-bold ${isTablet ? 'text-2xl' : 'text-sm'}`}>Host seems unavailable</Text>
                        </View>
                        <Text className={`text-amber-600 font-body-medium leading-relaxed mb-8 ${isTablet ? 'text-xl' : 'text-sm'}`}>
                            The game has been idle for too long. You can cancel it so anyone can host a new game.
                        </Text>
                        <TouchableOpacity
                            onPress={handleCancelStuckGame}
                            disabled={isLoading}
                            className={`bg-amber-600 rounded-[20px] flex-row items-center justify-center ${isTablet ? 'h-24' : 'h-14'}`}
                        >
                            <Ionicons name="close-circle-outline" size={isTablet ? 32 : 22} color="white" />
                            <Text className={`text-white font-headline-bold ml-3 ${isTablet ? 'text-2xl' : 'text-base'}`}>Cancel This Game</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Overall Group Leaderboard */}
                <TouchableOpacity
                    onPress={() => navigation.navigate('HousieLeaderboard', { groupId, groupName })}
                    className={`mt-10 flex-row items-center justify-center p-6 ${isTablet ? 'mb-10' : ''}`}
                >
                    <MaterialIcons name="emoji-events" size={isTablet ? 36 : 20} color="#b30069" />
                    <Text className={`text-primary font-headline-bold ml-3 ${isTablet ? 'text-3xl' : 'text-lg'}`}>All-Time Leaderboard</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Back Button */}
            <TouchableOpacity
                onPress={() => navigation.navigate('HousieSelectGroup')}
                className={`absolute left-8 items-center justify-center bg-white rounded-full shadow-md z-10 border border-stone-50 ${isTablet ? 'top-20 w-16 h-16' : 'top-16 w-12 h-12'}`}
            >
                <MaterialIcons name="arrow-back" size={isTablet ? 36 : 28} color="#31302d" />
            </TouchableOpacity>
        </SafeAreaView>
    );
};

export default HousieLobbyScreen;
