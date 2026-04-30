//lib
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';

//hooks
import { useIsTablet } from '../../hooks/useIsTablet';
import { useQueryClient } from '@tanstack/react-query';
import { useHousieLobbyData } from '../../hooks/useHousieLobbyData';

//store
import { useAuthStore } from '../../stores/authStore';

//api
import { createHousieGame, cancelHousieGame } from '../../lib/api';

//socket
import { useSocket } from '../../hooks/useSocket';

const HousieLobbyScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute();
    const { groupId } = (route.params as { groupId: string }) || {};
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useAuthStore();
    const isTablet = useIsTablet();
    const socket = useSocket();

    const {
        activeGame,
        lastGame,
        groupName,
        hasTickets,
        isHostOfActiveGame,
        showCancelCTA,
        isGroupLoading,
        isGameLoading
    } = useHousieLobbyData(groupId);

    const queryClient = useQueryClient();

    useEffect(() => {
        if (!groupId || !socket) return;
        socket.emit('join_group', groupId);

        const onGameCreated = () => {
            queryClient.invalidateQueries({ queryKey: ['activeHousieGame', groupId] });
        };

        const onGameStarting = () => {
            queryClient.invalidateQueries({ queryKey: ['activeHousieGame', groupId] });
        };

        const onGameActivated = () => {
            queryClient.invalidateQueries({ queryKey: ['activeHousieGame', groupId] });
        }

        const onGameEnded = () => {
            queryClient.invalidateQueries({ queryKey: ['activeHousieGame', groupId] });
        };

        socket.on('game_created', onGameCreated);
        socket.on('game_starting', onGameStarting);
        socket.on('game_activated', onGameActivated);
        socket.on('game_ended', onGameEnded);

        return () => {
            socket.off('game_created', onGameCreated);
            socket.off('game_starting', onGameStarting);
            socket.off('game_activated', onGameActivated);
            socket.off('game_ended', onGameEnded)
        };
    }, [groupId]);

    useFocusEffect(
        useCallback(() => {
            if (groupId) {
                queryClient.invalidateQueries({ queryKey: ['activeHousieGame', groupId] });
            }
        }, [groupId, queryClient])
    );

    const handleCreateGame = useCallback(async () => {
        try {
            setIsLoading(true);
            const result = await createHousieGame(groupId!);
            console.log('handleCreateGame');
            navigation.navigate('HousieWaitingRoom', { groupId, gameCode: result.game.game_code });
        } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.error || 'Failed to initialize game.');
        } finally {
            setIsLoading(false);
        }
    }, [groupId, navigation]);

    const handleAction = useCallback(() => {
        if (isLoading || isGameLoading) return;

        // ── CASE 1: No Game → Create New ──
        if (!activeGame) {
            handleCreateGame();
            return;
        }

        // ── CASE 2: Join/Resume logic ──
        const gameCode = activeGame.game_code;
        const status = activeGame.status;

        if (isHostOfActiveGame) {
            switch (status) {
                case 'waiting':
                    navigation.navigate('HousieWaitingRoom', { gameCode, groupId });
                    break;
                case 'starting':
                    navigation.navigate('HousieStarting', { gameCode, groupId });
                    break;
                case 'active':
                    navigation.navigate('HousieGame', { gameCode, groupId });
                    break;
                default:
                    navigation.navigate('HousieWaitingRoom', { gameCode, groupId });
            }
        } else {
            switch (status) {
                case 'waiting':
                    if (hasTickets) {
                        navigation.navigate('HousieWaitingRoom', { gameCode, groupId });
                    } else {
                        navigation.navigate('HousieJoinGame', { gameCode, groupId });
                    }
                    break;
                case 'starting':
                    navigation.navigate('HousieStarting', { gameCode, groupId });
                    break;
                case 'active':
                    if (hasTickets) {
                        navigation.navigate('HousieTicket', { gameCode, groupId });
                    } else {
                        navigation.navigate('HousieSpectator', { gameCode, groupId });
                    }
                    break;
                default:
                    navigation.navigate('HousieJoinGame', { groupId });
            }
        }
    }, [activeGame, isLoading, isGameLoading, isHostOfActiveGame, hasTickets, handleCreateGame, navigation, groupId]);

    const handleCancelStuckGame = useCallback(() => {
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
    }, [activeGame?.game_code, queryClient, groupId]);

    const joinConfig = useMemo(() => {
        // ── CASE 1: No ongoing game → Primary action is to Host ──
        if (!activeGame) {
            return {
                label: 'Host a Game',
                action: handleAction,
                icon: 'play',
                disabled: false,
                isPrimary: true
            };
        }

        // ── CASE 2: Game in progress (Host) ──
        if (isHostOfActiveGame) {
            switch (activeGame.status) {
                case 'waiting': return { label: 'Manage Game', action: handleAction, icon: 'settings', disabled: false, isPrimary: true };
                case 'starting': return { label: 'Start Game', action: handleAction, icon: 'play', disabled: false, isPrimary: true };
                case 'active': return { label: 'Resume Hosting', action: handleAction, icon: 'play-forward', disabled: false, isPrimary: true };
                default: return { label: 'Manage Game', action: handleAction, icon: 'settings', disabled: false, isPrimary: true };
            }
        }

        // ── CASE 3: Member Actions ──
        if (hasTickets) {
            switch (activeGame.status) {
                case 'waiting': return { label: 'View Tickets', action: handleAction, icon: 'ticket', disabled: false, isPrimary: true };
                case 'starting': return { label: 'Start Game', action: handleAction, icon: 'play', disabled: false, isPrimary: true };
                case 'active': return { label: 'Play Game', action: handleAction, icon: 'play', disabled: false, isPrimary: true };
                default: return { label: 'Play Game', action: handleAction, icon: 'play', disabled: false, isPrimary: true };
            }
        } else {
            switch (activeGame.status) {
                case 'waiting': return { label: 'Join Game', action: handleAction, icon: 'ticket', disabled: false, isPrimary: true };
                case 'starting': return { label: 'Start Game', action: handleAction, icon: 'play', disabled: false, isPrimary: true };
                case 'active': return { label: 'Watch Live', action: handleAction, icon: 'eye', disabled: false, isPrimary: false };
                default: return { label: 'Join Game', action: handleAction, icon: 'confirmation-number', disabled: false, isPrimary: false };
            }
        }
    }, [activeGame, isHostOfActiveGame, hasTickets, handleAction]);

    // UI Helpers
    const hasLastGame = !!lastGame;

    if (!user || isGroupLoading) {
        return (
            <SafeAreaView className="flex-1 bg-[#fdf9f3] items-center justify-center">
                <ActivityIndicator size="large" color="#b30069" />
            </SafeAreaView>
        );
    }

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

                    {/* Action Buttons Container */}
                    <View className="w-full gap-4">
                        {/* Primary Action Button */}
                        <TouchableOpacity
                            onPress={handleAction}
                            disabled={isLoading || isGameLoading || joinConfig.disabled}
                            className={`rounded-[32px] flex-row items-center justify-center shadow-lg ${isTablet ? 'h-28' : 'h-20'} ${joinConfig.isPrimary
                                ? 'bg-[#b30069] shadow-[#b30069]/30'
                                : 'bg-stone-50 border border-stone-100 shadow-black/5'
                                }`}
                        >
                            {isLoading || isGameLoading ? (
                                <ActivityIndicator color={joinConfig.isPrimary ? 'white' : '#31302d'} />
                            ) : (
                                <>
                                    <Ionicons
                                        name={joinConfig.icon as any}
                                        size={isTablet ? 40 : 28}
                                        color={joinConfig.isPrimary ? 'white' : '#31302d'}
                                    />
                                    <Text
                                        numberOfLines={1}
                                        adjustsFontSizeToFit
                                        className={`font-headline-bold ml-3 ${isTablet ? 'text-3xl' : 'text-2xl'} ${joinConfig.isPrimary ? 'text-white' : 'text-[#31302d]'}`}
                                    >
                                        {joinConfig.label}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>

                        {/* Case 3: Last Game Leaderboard */}
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
                    <View className={`mt-8 items-center bg-white rounded-[40px] border border-stone-100 shadow-sm w-full ${isTablet ? 'p-12' : 'p-6'}`}>
                        <Text className={`text-stone-400 font-body-bold uppercase tracking-widest mb-3 ${isTablet ? 'text-xl' : 'text-xs'}`}>Live Game Code</Text>
                        <Text className={`text-[#b30069] font-headline-bold mb-2 ${isTablet ? 'text-7xl' : 'text-4xl'}`}>{activeGame.game_code}</Text>
                        <Text className={`text-stone-400 font-body-bold text-center ${isTablet ? 'text-2xl mt-2' : ''}`}>Hosted by: <Text className="text-stone-600">{activeGame.hostName || 'MANDALI'}</Text></Text>
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
                onPress={() => navigation.goBack()}
                className={`absolute left-8 items-center justify-center bg-white rounded-full shadow-md z-10 border border-stone-50 ${isTablet ? 'top-20 w-16 h-16' : 'top-16 w-12 h-12'}`}
            >
                <MaterialIcons name="arrow-back" size={isTablet ? 36 : 28} color="#31302d" />
            </TouchableOpacity>
        </SafeAreaView>
    );
};

export default HousieLobbyScreen;
