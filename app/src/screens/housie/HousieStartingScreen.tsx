//lib
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Animated, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

//hooks
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useIsTablet } from '../../hooks/useIsTablet';
import { useAuthStore } from '../../stores/authStore';

//api
import { fetchHousieGame } from '../../lib/api';
import { getSocket } from '../../lib/socketService';

//components
import MandaliCoin from '../../components/MandaliCoin';

const HousieStartingScreen = () => {
    const isTablet = useIsTablet();
    const navigation = useNavigation<any>();
    const route = useRoute();
    const queryClient = useQueryClient();
    const insets = useSafeAreaInsets();
    const { user } = useAuthStore();
    const { gameCode, groupId } = route.params as { gameCode: string; groupId: string };

    const { data: game, isLoading } = useQuery({
        queryKey: ['housieGame', gameCode],
        queryFn: () => fetchHousieGame(gameCode),
        staleTime: 0,
    });

    const [activeTab, setActiveTab] = useState<'prizes' | 'players'>('prizes');
    const [secondsLeft, setSecondsLeft] = useState(15);
    const pulseAnim = React.useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (!game?.last_activity_at) return;

        const syncTimer = () => {
            const startTime = new Date(game.last_activity_at).getTime();
            const now = Date.now();
            const elapsed = Math.floor((now - startTime) / 1000);
            const remaining = Math.max(0, 15 - elapsed);
            setSecondsLeft(remaining);
        };

        syncTimer(); // Initial sync
        const timer = setInterval(syncTimer, 1000);

        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.1, duration: 500, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1.0, duration: 500, useNativeDriver: true })
            ])
        ).start();

        return () => clearInterval(timer);
    }, [game?.last_activity_at]);

    // 1. Redirection Logic Based on Role
    const handleRedirect = React.useCallback(() => {
        if (!game || game.status !== 'active') return;

        const isHost = game.host_id === user?.id;
        const hasBoughtTickets = game.participants?.some((p: any) => p.id === user?.id && p.ticketCount > 0);

        if (isHost) {
            navigation.replace('HousieGame', { gameCode, groupId });
        } else if (hasBoughtTickets) {
            navigation.replace('HousieTicket', { gameCode, groupId });
        } else {
            navigation.replace('HousieSpectator', { gameCode, groupId });
        }
    }, [game, user?.id, navigation, gameCode, groupId]);

    // 2. Socket listener for activation
    useEffect(() => {
        const socket = getSocket();

        const onGameActivated = () => {
            queryClient.invalidateQueries({ queryKey: ['housieGame', gameCode] });
        };

        socket.on('game_activated', onGameActivated);

        // Immediate check if status is already active
        if (game?.status === 'active') {
            handleRedirect();
        }

        return () => {
            socket.off('game_activated', onGameActivated);
        };
    }, [game?.status, handleRedirect, gameCode, queryClient]);

    // 3. Guards: Don't show numeric UI until data is hydrated to avoid flickering "0"
    if (isLoading || !game || !game.participants) {
        return (
            <View className="flex-1 bg-[#1c0012] items-center justify-center">
                <LinearGradient
                    colors={['#3d0022', '#1c0012']}
                    style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
                />
                <ActivityIndicator color="#b30069" size="large" />
                <Text className="text-white/40 font-body-medium mt-6 tracking-widest uppercase text-[10px]">Synchronizing Match...</Text>
            </View>
        );
    }

    const prizes = game?.prizes || [];
    const participants = game?.participants || [];
    const participantsCount = participants.length;
    const totalPrizePool = game?.totalPrizePool || 0;

    return (
        <View style={{ flex: 1, backgroundColor: '#1c0012' }}>
            <LinearGradient
                colors={['#4d002e', '#1c0012', '#000000']}
                style={{ flex: 1, paddingHorizontal: isTablet ? 40 : 20 }}
            >
                <View className="flex-1" style={{ paddingTop: Math.max(insets.top, 20) }}>
                    {/* Compact Header Area */}
                    <View className="items-center flex-row justify-between mb-4 mt-4">
                        <View className="flex-1">
                            <Text className={`text-[#b30069] font-body-bold uppercase tracking-[2px] ${isTablet ? 'text-lg' : 'text-[10px]'}`}>
                                Match Starting In
                            </Text>
                            <Text className={`text-white/60 font-body-medium mt-1 ${isTablet ? 'text-xl' : 'text-xs'}`}>
                                Locking prizes and finalizing...
                            </Text>
                        </View>

                        <Animated.View
                            style={{ transform: [{ scale: pulseAnim }], shadowColor: '#b30069', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 10 }}
                            className={`items-center justify-center bg-white/5 rounded-2xl border border-white/10 ${isTablet ? 'w-24 h-24' : 'w-16 h-16'}`}
                        >
                            <Text className={`text-white font-headline-bold leading-none ${isTablet ? 'text-4xl' : 'text-2xl'}`}>
                                {secondsLeft}
                            </Text>
                        </Animated.View>
                    </View>

                    {/* Compact Stats Grid */}
                    <View className="flex-row items-center justify-around bg-white/5 rounded-3xl p-4 mb-4 border border-white/5">
                        <View className="flex-row items-center">
                            <Ionicons name="people" size={isTablet ? 24 : 16} color="#b30069" />
                            <Text className={`text-white/60 font-body-bold uppercase ml-2 mr-3 ${isTablet ? 'text-sm' : 'text-[10px]'}`} style={{ letterSpacing: 1 }}>Players</Text>
                            <Text className={`text-white font-headline-bold ${isTablet ? 'text-2xl' : 'text-xl'}`}>{participantsCount}</Text>
                        </View>
                        <View style={{ width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.05)' }} />
                        <View className="flex-row items-center">
                            <MandaliCoin size={isTablet ? 24 : 16} />
                            <Text className={`text-white/60 font-body-bold uppercase ml-2 mr-3 ${isTablet ? 'text-sm' : 'text-[10px]'}`} style={{ letterSpacing: 1 }}>Total Pool</Text>
                            <Text className={`text-white font-headline-bold ${isTablet ? 'text-2xl' : 'text-xl'}`}>{totalPrizePool}</Text>
                        </View>
                    </View>

                    {/* Expanded Content Area with Tabs */}
                    <View className="flex-1 bg-black/40 rounded-t-[40px] border-t border-x border-white/5 overflow-hidden">
                        {/* Tab Bar */}
                        <View className="flex-row border-b border-white/5">
                            <TouchableOpacity
                                onPress={() => setActiveTab('prizes')}
                                className={`flex-1 py-5 items-center border-b-2 ${activeTab === 'prizes' ? 'border-[#b30069] bg-[#b30069]/5' : 'border-transparent'}`}
                            >
                                <Text className={`font-headline-bold tracking-widest uppercase ${isTablet ? 'text-xl' : 'text-xs'} ${activeTab === 'prizes' ? 'text-white' : 'text-white/40'}`}>
                                    Rewards
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setActiveTab('players')}
                                className={`flex-1 py-5 items-center border-b-2 ${activeTab === 'players' ? 'border-[#b30069] bg-[#b30069]/5' : 'border-transparent'}`}
                            >
                                <Text className={`font-headline-bold tracking-widest uppercase ${isTablet ? 'text-xl' : 'text-xs'} ${activeTab === 'players' ? 'text-white' : 'text-white/40'}`}>
                                    Players ({participantsCount})
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: isTablet ? 32 : 20, paddingVertical: 24, paddingBottom: 100 }}
                        >
                            {activeTab === 'prizes' ? (
                                <View className="gap-3">
                                    {prizes.map((prize: any, idx: number) => (
                                        <View
                                            key={prize.id || idx}
                                            className={`flex-row items-center justify-between ${isTablet ? 'p-6' : 'p-5'} rounded-3xl ${prize.isHighlight ? 'bg-white/10 border border-[#b30069]/60 shadow-lg shadow-[#b30069]/20' : 'bg-white/5 border border-white/5'}`}
                                        >
                                            <View className="flex-row items-center flex-1 mr-4">
                                                <View className={`rounded-2xl items-center justify-center ${isTablet ? 'w-16 h-16 mr-6' : 'w-12 h-12 mr-4'} ${prize.isHighlight ? 'bg-[#b30069]' : 'bg-white/10'}`}>
                                                    <MaterialIcons name={(prize.icon as any) || 'emoji-events'} size={isTablet ? 32 : 24} color="white" />
                                                </View>
                                                <View className="flex-1">
                                                    <Text className={`text-white font-headline-bold ${isTablet ? 'text-2xl' : 'text-base'}`} numberOfLines={1}>{prize.name}</Text>
                                                    <Text className={`text-white/40 font-body-bold mt-1 uppercase tracking-widest ${isTablet ? 'text-sm' : 'text-[9px]'}`} numberOfLines={1}>Match Milestone</Text>
                                                </View>
                                            </View>
                                            <View className={`flex-row items-center ${prize.isHighlight ? 'bg-[#b30069]' : 'bg-[#b30069]/20'} rounded-2xl ${isTablet ? 'px-6 py-3' : 'px-4 py-2'} border border-[#b30069]/30`}>
                                                <Text className={`text-white font-headline-bold mr-2 ${isTablet ? 'text-2xl' : 'text-lg'}`}>{prize.amount}</Text>
                                                <MandaliCoin size={isTablet ? 24 : 16} />
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            ) : (
                                <View className="gap-3">
                                    {participants.map((player: any, idx: number) => (
                                        <View
                                            key={player.id || idx}
                                            className={`flex-row items-center justify-between ${isTablet ? 'p-6' : 'p-5'} rounded-3xl bg-white/5 border border-white/10`}
                                        >
                                            <View className="flex-row items-center flex-1 mr-4">
                                                <View className={`rounded-2xl items-center justify-center bg-white/10 ${isTablet ? 'w-16 h-16 mr-6' : 'w-12 h-12 mr-4'}`}>
                                                    <Ionicons name="person" size={isTablet ? 28 : 22} color="white" />
                                                </View>
                                                <View className="flex-1">
                                                    <Text className={`text-white font-headline-bold ${isTablet ? 'text-2xl' : 'text-base'}`} numberOfLines={1}>{player.name}</Text>
                                                    <Text className={`text-white/40 font-body-bold mt-1 uppercase tracking-widest ${isTablet ? 'text-sm' : 'text-[9px]'}`} numberOfLines={1}>
                                                        {player.ticketCount > 0 ? `${player.ticketCount} Tickets Bought` : 'Watching Game'}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View className={`rounded-xl ${isTablet ? 'px-5 py-2.5' : 'px-3 py-1.5'} ${player.ticketCount > 0 ? 'bg-green-500/20 border border-green-500/30' : 'bg-amber-500/20 border border-amber-500/30'}`}>
                                                <Text className={`font-headline-bold tracking-tighter ${isTablet ? 'text-base' : 'text-[10px]'} ${player.ticketCount > 0 ? 'text-green-500' : 'text-amber-500'}`}>
                                                    {player.ticketCount > 0 ? 'PLAYER' : 'SPECTATOR'}
                                                </Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </LinearGradient>
        </View>
    );
};

export default HousieStartingScreen;
