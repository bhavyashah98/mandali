//lib
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Animated, ActivityIndicator, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import Svg, { Circle } from 'react-native-svg';

//hooks
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useIsTablet } from '../../hooks/useIsTablet';
import { useAuthStore } from '../../stores/authStore';

//api
import { fetchHousieGame } from '../../lib/api';
import { useSocket } from '../../hooks/useSocket';

//components
import MandaliCoin from '../../components/MandaliCoin';

const { width } = Dimensions.get('window');
const TIMER_DURATION = 15;

const HousieStartingScreen = () => {
    const isTablet = useIsTablet();
    const navigation = useNavigation<any>();
    const route = useRoute();
    const queryClient = useQueryClient();
    const insets = useSafeAreaInsets();
    const { user } = useAuthStore();
    const { gameCode, groupId } = route.params as { gameCode: string; groupId: string };
    const socket = useSocket();

    // Refs for safe state management
    const hasNavigatedRef = useRef(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const progressAnim = useRef(new Animated.Value(1)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const { data: game, isLoading } = useQuery({
        queryKey: ['housieGame', gameCode],
        queryFn: () => fetchHousieGame(gameCode),
        staleTime: 0,
    });

    const [activeTab, setActiveTab] = useState<'prizes' | 'players'>('prizes');
    const [secondsLeft, setSecondsLeft] = useState(TIMER_DURATION);

    // ---------------------------------------------------------
    // 1. ✅ TIMER SYNC (SERVER BASED)
    // ---------------------------------------------------------
    useEffect(() => {
        if (!game?.last_activity_at) return;

        const startTime = new Date(game.last_activity_at).getTime();

        const syncTimer = () => {
            const now = Date.now();
            const elapsed = Math.floor((now - startTime) / 1000);
            const remaining = Math.max(0, TIMER_DURATION - elapsed);

            setSecondsLeft(remaining);

            // Smooth visual progress update
            Animated.timing(progressAnim, {
                toValue: remaining / TIMER_DURATION,
                duration: 300,
                useNativeDriver: false,
            }).start();

            // ❗ Fallback: Force refetch if timer hit 0 but status didn't flip yet
            if (remaining === 0 && game.status === 'starting') {
                queryClient.invalidateQueries({ queryKey: ['housieGame', gameCode] });
            }
        };

        // Run immediately on first sync
        syncTimer();

        // Clear existing interval if any
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(syncTimer, 1000);

        // Initial fade-in when core data is ready
        Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [game?.last_activity_at]);

    // ---------------------------------------------------------
    // 2. ✅ OPTIMISTIC SOCKET HANDLING (INSTANT STATE FLIP)
    // ---------------------------------------------------------
    useEffect(() => {
        if (!socket) return;

        const handleGameActivated = () => {
            // ✅ Instant update (avoiding network latency of a refetch)
            queryClient.setQueryData(['housieGame', gameCode], (old: any) => {
                if (!old) return old;
                return { ...old, status: 'active' };
            });
        };

        socket.on('game_activated', handleGameActivated);

        return () => {
            socket.off('game_activated', handleGameActivated);
        };
    }, [socket, gameCode]);

    // ---------------------------------------------------------
    // 3. ✅ NAVIGATION TRIGGER (BASED ON STATE CHANGE)
    // ---------------------------------------------------------
    useEffect(() => {
        if (!game || game.status !== 'active') return;
        if (hasNavigatedRef.current) return;

        hasNavigatedRef.current = true;

        const isHost = game.host_id === user?.id;
        const hasTickets = game.participants?.some(
          (p: any) => p.id === user?.id && p.ticketCount > 0
        );

        if (isHost) {
          navigation.replace('HousieGame', { gameCode, groupId });
        } else if (hasTickets) {
          navigation.replace('HousieTicket', { gameCode, groupId });
        } else {
          navigation.replace('HousieSpectator', { gameCode, groupId });
        }
    }, [game?.status]);


    // Animation setup for pulse circle
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.05, duration: 600, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, useNativeDriver: true })
            ])
        ).start();
    }, []);

    // UI Constants
    const radius = isTablet ? 60 : 45;
    const strokeWidth = isTablet ? 10 : 6;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [circumference, 0]
    });

    if (isLoading || !game) {
        return (
            <View className="flex-1 bg-[#0a0005] items-center justify-center">
                <LinearGradient
                    colors={['#1a0010', '#0a0005']}
                    style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
                />
                <ActivityIndicator color="#b30069" size="large" />
                <Text className="text-white/30 font-headline-bold mt-6 tracking-[4px] uppercase text-[10px]">Preparing Room...</Text>
            </View>
        );
    }

    const prizes = game?.prizes || [];
    const participants = game?.participants || [];
    const totalPrizePool = game?.totalPrizePool || 0;

    return (
        <Animated.View style={{ flex: 1, backgroundColor: '#0a0005', opacity: fadeAnim }}>
            <LinearGradient
                colors={['#2d001a', '#0a0005', '#000000']}
                style={{ flex: 1 }}
            >
                {/* Background Decor */}
                <View style={{ position: 'absolute', top: -100, right: -50, opacity: 0.15 }}>
                    <FontAwesome5 name="dice" size={300} color="#b30069" />
                </View>

                <View className="flex-1" style={{ paddingTop: insets.top }}>
                    
                    {/* Premium Countdown Header - More Compact */}
                    <View className={`items-center ${isTablet ? 'py-4' : 'py-2'}`}>
                        <Animated.View 
                            style={{ 
                                width: radius * 2 + strokeWidth * 2, 
                                height: radius * 2 + strokeWidth * 2,
                                transform: [{ scale: pulseAnim }]
                            }}
                            className="items-center justify-center"
                        >
                            <Svg height={radius * 2 + strokeWidth * 2} width={radius * 2 + strokeWidth * 2}>
                                <Circle
                                    cx={radius + strokeWidth}
                                    cy={radius + strokeWidth}
                                    r={radius}
                                    stroke="rgba(255,255,255,0.05)"
                                    strokeWidth={strokeWidth}
                                    fill="transparent"
                                />
                                <AnimatedCircle
                                    cx={radius + strokeWidth}
                                    cy={radius + strokeWidth}
                                    r={radius}
                                    stroke="#b30069"
                                    strokeWidth={strokeWidth}
                                    fill="transparent"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={strokeDashoffset}
                                    strokeLinecap="round"
                                />
                            </Svg>
                            <View style={{ position: 'absolute', alignItems: 'center' }}>
                                <Text className={`text-white font-headline-bold ${isTablet ? 'text-5xl' : 'text-3xl'}`}>
                                    {secondsLeft}
                                </Text>
                                <Text className="text-white/40 font-body-bold tracking-[2px] uppercase text-[8px] mt-0.5">Secs</Text>
                            </View>
                        </Animated.View>

                        <View className={`mt-4 items-center px-8 ${isTablet ? 'mb-4' : 'mb-2'}`}>
                            <Text className={`text-white font-headline-bold text-center tracking-tight ${isTablet ? 'text-3xl' : 'text-xl'}`}>
                                Match Starting Soon
                            </Text>
                            <Text className={`text-white/50 font-body-medium text-center mt-1 ${isTablet ? 'text-lg px-20' : 'text-[11px]'}`}>
                                Finalizing Bounty List
                            </Text>
                        </View>
                    </View>

                    {/* Compact Highlight Stats */}
                    <View className={`flex-row items-center justify-between px-8 ${isTablet ? 'mb-8' : 'mb-6'}`}>
                        <View className="bg-white/5 rounded-3xl p-4 flex-1 mr-4 border border-white/5 items-center">
                            <Text className="text-white/40 font-body-bold uppercase text-[9px] mb-1 tracking-widest">Confirmed Players</Text>
                            <Text className="text-white font-headline-bold text-xl">{participants.length}</Text>
                        </View>
                        <View className="bg-white/5 rounded-3xl p-4 flex-1 border border-white/5 items-center">
                            <Text className="text-white/40 font-body-bold uppercase text-[9px] mb-1 tracking-widest">Total Reward</Text>
                            <View className="flex-row items-center">
                                <Text className="text-white font-headline-bold text-xl mr-1">{totalPrizePool}</Text>
                                <MandaliCoin size={14} />
                            </View>
                        </View>
                    </View>

                    {/* Shared Content Area */}
                    <View className="flex-1 bg-black/40 rounded-t-[48px] border-t border-white/10 overflow-hidden shadow-2xl">
                        {/* Custom Tab Switcher */}
                        <View className="flex-row p-2 bg-white/5 mx-6 mt-6 rounded-2xl">
                            <TouchableOpacity
                                onPress={() => setActiveTab('prizes')}
                                className={`flex-1 py-3 items-center rounded-xl ${activeTab === 'prizes' ? 'bg-[#b30069] shadow-lg' : ''}`}
                            >
                                <Text className={`font-headline-bold tracking-widest uppercase ${isTablet ? 'text-lg' : 'text-[10px]'} ${activeTab === 'prizes' ? 'text-white' : 'text-white/40'}`}>
                                    Bounties
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setActiveTab('players')}
                                className={`flex-1 py-3 items-center rounded-xl ${activeTab === 'players' ? 'bg-[#b30069] shadow-lg' : ''}`}
                            >
                                <Text className={`font-headline-bold tracking-widest uppercase ${isTablet ? 'text-lg' : 'text-[10px]'} ${activeTab === 'players' ? 'text-white' : 'text-white/40'}`}>
                                    Participants
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: isTablet ? 32 : 24, paddingVertical: 24, paddingBottom: 60 }}
                        >
                            {activeTab === 'prizes' ? (
                                <View className="gap-4">
                                    {prizes.map((prize: any, idx: number) => (
                                        <View
                                            key={prize.id || idx}
                                            className="flex-row items-center justify-between p-4 rounded-3xl bg-white/5 border border-white/5"
                                        >
                                            <View className="flex-row items-center flex-1 mr-4">
                                                <View className="rounded-2xl items-center justify-center bg-white/10 w-12 h-12 mr-4">
                                                    <MaterialIcons name={(prize.icon as any) || 'emoji-events'} size={24} color="#b30069" />
                                                </View>
                                                <View className="flex-1">
                                                    <Text className="text-white font-headline-bold text-base" numberOfLines={1}>{prize.name}</Text>
                                                    <Text className="text-white/30 font-body-bold mt-0.5 uppercase tracking-widest text-[9px]">Winning Category</Text>
                                                </View>
                                            </View>
                                            <View className="flex-row items-center bg-[#b30069]/20 rounded-2xl px-4 py-2 border border-[#b30069]/20">
                                                <Text className="text-white font-headline-bold mr-1.5 text-lg">{prize.amount}</Text>
                                                <MandaliCoin size={14} />
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            ) : (
                                <View className="gap-3">
                                    {participants.map((player: any, idx: number) => (
                                        <View
                                            key={player.id || idx}
                                            className="flex-row items-center border-b border-white/5 py-4"
                                        >
                                            <View className="w-10 h-10 rounded-full bg-[#b30069]/20 items-center justify-center border border-[#b30069]/30">
                                                <Text className="text-[#b30069] font-headline-bold">{player.name?.charAt(0)}</Text>
                                            </View>
                                            <View className="flex-1 ml-4">
                                                <Text className="text-white font-headline-bold text-[15px]">{player.name}</Text>
                                                <Text className="text-white/40 font-body-medium text-[11px]">{player.ticketCount} Tickets • Confirmed</Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </View>

                {/* Secure Status Footer */}
                <View 
                    style={{ paddingBottom: Math.max(insets.bottom, 20), paddingHorizontal: 32 }}
                    className="absolute bottom-0 left-0 right-0 py-4 bg-[#0a0005e0] border-t border-white/5 items-center flex-row justify-center"
                >
                    <Ionicons name="shield-checkmark" size={isTablet ? 20 : 14} color="#b30069" />
                    <Text className="text-white/40 font-body-bold uppercase tracking-[2px] text-[10px] ml-4">Server-Synchronized Engine Active</Text>
                </View>
            </LinearGradient>
        </Animated.View>
    );
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default HousieStartingScreen;
