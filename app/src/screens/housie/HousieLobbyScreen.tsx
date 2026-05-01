import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

// Hooks
import { useIsTablet } from '../../hooks/useIsTablet';
import { useQueryClient } from '@tanstack/react-query';
import { useHousieLobbyData } from '../../hooks/useHousieLobbyData';
import { useHousieLobbySync } from '../../hooks/housie/useHousieLobbySync';

// Store
import { useAuthStore } from '../../stores/authStore';

// API
import { cancelHousieGame } from '../../lib/api';

// Components
import LobbyHeaderCard from '../../components/housie/lobby/LobbyHeaderCard';
import LobbyActionButton from '../../components/housie/lobby/LobbyActionButton';
import ActiveGameCard from '../../components/housie/lobby/ActiveGameCard';
import StuckGameAlert from '../../components/housie/lobby/StuckGameAlert';

const HousieLobbyScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute();
    const { groupId } = (route.params as { groupId: string }) || {};
    const [isCancelling, setIsCancelling] = useState(false);
    const { user } = useAuthStore();
    const isTablet = useIsTablet();
    const queryClient = useQueryClient();

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

    // Manage socket listeners and focus invalidation
    useHousieLobbySync(groupId);

    const handleAction = useCallback(() => {
        if (isCancelling || isGameLoading) return;

        if (!activeGame) {
            navigation.navigate('HousieHostSettings', { groupId });
            return;
        }

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
                    if (activeGame.settings?.callingMode === 'auto') {
                        if (hasTickets) {
                            navigation.navigate('HousieTicket', { gameCode, groupId });
                        } else {
                            navigation.navigate('HousieSpectator', { gameCode, groupId });
                        }
                    } else {
                        navigation.navigate('HousieGame', { gameCode, groupId });
                    }
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
    }, [activeGame, isCancelling, isGameLoading, isHostOfActiveGame, hasTickets, navigation, groupId]);

    const handleCancelStuckGame = useCallback(() => {
        if (!activeGame?.game_code) return;

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
                            setIsCancelling(true);
                            await cancelHousieGame(activeGame.game_code);
                            queryClient.invalidateQueries({ queryKey: ['activeHousieGame', groupId] });
                        } catch (err: any) {
                            Alert.alert('Error', err?.response?.data?.error || 'Could not cancel game.');
                        } finally {
                            setIsCancelling(false);
                        }
                    }
                }
            ]
        );
    }, [activeGame?.game_code, queryClient, groupId]);

    const joinConfig = useMemo(() => {
        if (!activeGame) {
            return {
                label: 'Host a Game',
                icon: 'play',
                disabled: false,
                isPrimary: true
            };
        }

        if (isHostOfActiveGame) {
            switch (activeGame.status) {
                case 'waiting': return { label: 'Manage Game', icon: 'settings', disabled: false, isPrimary: true };
                case 'starting': return { label: 'Start Game', icon: 'play', disabled: false, isPrimary: true };
                case 'active': return { label: 'Resume Hosting', icon: 'play-forward', disabled: false, isPrimary: true };
                default: return { label: 'Manage Game', icon: 'settings', disabled: false, isPrimary: true };
            }
        }

        if (hasTickets) {
            switch (activeGame.status) {
                case 'waiting': return { label: 'View Tickets', icon: 'ticket', disabled: false, isPrimary: true };
                case 'starting': return { label: 'Start Game', icon: 'play', disabled: false, isPrimary: true };
                case 'active': return { label: 'Play Game', icon: 'play', disabled: false, isPrimary: true };
                default: return { label: 'Play Game', icon: 'play', disabled: false, isPrimary: true };
            }
        } else {
            switch (activeGame.status) {
                case 'waiting': return { label: 'Join Game', icon: 'ticket', disabled: false, isPrimary: true };
                case 'starting': return { label: 'Start Game', icon: 'play', disabled: false, isPrimary: true };
                case 'active': return { label: 'Watch Live', icon: 'eye', disabled: false, isPrimary: false };
                default: return { label: 'Join Game', icon: 'confirmation-number', disabled: false, isPrimary: false };
            }
        }
    }, [activeGame, isHostOfActiveGame, hasTickets]);

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
                contentContainerStyle={{
                    flexGrow: 1,
                    justifyContent: 'center',
                    paddingHorizontal: isTablet ? 60 : 24,
                    paddingVertical: isTablet ? 60 : 24
                }}
                showsVerticalScrollIndicator={false}
            >
                <View
                    style={{
                        backgroundColor: 'white',
                        elevation: 12,
                        shadowColor: 'black',
                        shadowOffset: { width: 0, height: 10 },
                        shadowOpacity: 0.05,
                        shadowRadius: 20,
                        borderColor: 'rgba(0,0,0,0.05)'
                    }}
                    className={`rounded-[40px] w-full items-center border ${isTablet ? 'p-16' : 'p-8'}`}
                >
                    <LobbyHeaderCard groupName={groupName} isTablet={isTablet} />

                    <View className="w-full gap-4">
                        <LobbyActionButton
                            label={joinConfig.label}
                            icon={joinConfig.icon}
                            onPress={handleAction}
                            isLoading={isCancelling || isGameLoading}
                            disabled={joinConfig.disabled}
                            isPrimary={joinConfig.isPrimary}
                            isTablet={isTablet}
                        />

                        {lastGame && (
                            <TouchableOpacity
                                onPress={() => navigation.navigate('HousieResults', { gameCode: lastGame.game_code, groupId })}
                                style={{
                                    backgroundColor: 'rgba(179, 0, 105, 0.05)',
                                    borderColor: 'rgba(179, 0, 105, 0.2)',
                                    height: isTablet ? 96 : 64
                                }}
                                className={`rounded-[24px] flex-row items-center justify-center border`}
                            >
                                <Ionicons name="trophy" size={isTablet ? 36 : 24} color="#b30069" />
                                <View className="ml-4">
                                    <Text className={`text-primary font-headline-bold leading-tight ${isTablet ? 'text-2xl' : 'text-lg'}`}>Last Results</Text>
                                    <Text
                                        style={{ color: 'rgba(179, 0, 105, 0.6)' }}
                                        className={`font-body-bold uppercase tracking-wider ${isTablet ? 'text-base mt-1' : 'text-[10px]'}`}
                                    >{lastGame.game_code}</Text>
                                </View>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {activeGame && activeGame.status !== 'ended' && (
                    <ActiveGameCard
                        gameCode={activeGame.game_code}
                        hostName={activeGame.hostName}
                        isTablet={isTablet}
                    />
                )}

                {showCancelCTA && (
                    <StuckGameAlert
                        onCancel={handleCancelStuckGame}
                        isLoading={isCancelling}
                        isTablet={isTablet}
                    />
                )}

                <TouchableOpacity
                    onPress={() => navigation.navigate('HousieLeaderboard', { groupId, groupName })}
                    className={`mt-10 flex-row items-center justify-center p-6 ${isTablet ? 'mb-10' : ''}`}
                >
                    <MaterialIcons name="emoji-events" size={isTablet ? 36 : 20} color="#b30069" />
                    <Text className={`text-primary font-headline-bold ml-3 ${isTablet ? 'text-3xl' : 'text-lg'}`}>All-Time Leaderboard</Text>
                </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={{ elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }}
                className={`absolute left-8 items-center justify-center bg-white rounded-full z-10 border border-stone-50 ${isTablet ? 'top-20 w-16 h-16' : 'top-16 w-12 h-12'}`}
            >
                <MaterialIcons name="arrow-back" size={isTablet ? 36 : 28} color="#31302d" />
            </TouchableOpacity>
        </SafeAreaView>
    );
};

export default HousieLobbyScreen;
