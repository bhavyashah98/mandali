import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Animated, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

// Hooks
import { useIsTablet } from '../../hooks/useIsTablet';
import { useAuthStore } from '../../stores/authStore';
import { useBlinkStartingData } from '../../hooks/blink/useBlinkStartingData';
import { useBlinkStartingSync } from '../../hooks/blink/useBlinkStartingSync';

// Reuse shared starting components (same as HousieStartingScreen)
import CountdownHeader from '../../components/housie/starting/CountdownHeader';
import StartingStats from '../../components/housie/starting/StartingStats';
import BountiesList from '../../components/housie/starting/BountiesList';
import ParticipantsList from '../../components/housie/starting/ParticipantsList';

const BlinkStartingScreen = () => {
    const isTablet = useIsTablet();
    const route = useRoute();
    const insets = useSafeAreaInsets();
    const { user } = useAuthStore();
    const { gameCode, groupId } = route.params as { gameCode: string; groupId: string };

    const [activeTab, setActiveTab] = useState<'prizes' | 'players'>('prizes');

    // Animations
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // 1. Data Hook — same business logic as HousieStartingScreen
    const {
        game,
        isLoading,
        secondsLeft,
        progressAnim,
        refetch,
    } = useBlinkStartingData(gameCode);

    // 2. Sync Hook — socket room, auto-activate, navigation
    useBlinkStartingSync(gameCode, game, user, refetch, groupId);

    // Pulse animation loop
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.05, duration: 600, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, useNativeDriver: true })
            ])
        ).start();
    }, [pulseAnim]);

    // Fade in when data is ready
    useEffect(() => {
        if (!isLoading && game) {
            Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
        }
    }, [isLoading, game, fadeAnim]);

    const prizes = game?.prizes || [];
    const participants = game?.participants || [];
    const totalPrizePool = participants.length * 100;

    // Same loading gate as HousieStartingScreen:
    // Show loader until game data AND secondsLeft are both ready
    const isReady = game && !isLoading && secondsLeft !== null;

    return (
        <Animated.View style={{ flex: 1, backgroundColor: '#fdf9f3', opacity: fadeAnim }}>
            {/* Background Decor */}
            <View style={{ position: 'absolute', top: -100, right: -50, opacity: 0.05 }}>
                <FontAwesome5 name="bolt" size={300} color="#b30069" />
            </View>

            {!isReady ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator color="#b30069" size="large" />
                    <Text style={{ color: '#a8a29e', fontWeight: 'bold', marginTop: 24, letterSpacing: 4, textTransform: 'uppercase', fontSize: 10 }}>
                        Preparing Room...
                    </Text>
                </View>
            ) : (
                <View className="flex-1" style={{ paddingTop: insets.top }}>

                    {/* Countdown + mode info — reuses CountdownHeader */}
                    <CountdownHeader
                        secondsLeft={secondsLeft}
                        progressAnim={progressAnim}
                        pulseAnim={pulseAnim}
                        isTablet={isTablet}
                        modeName="Blink Classic"
                        modeDescription="Fast-paced pattern matching game"
                    />

                    {/* Prize pool + player count — reuses StartingStats */}
                    <StartingStats
                        participantsCount={participants.length}
                        totalPrizePool={totalPrizePool}
                        isTablet={isTablet}
                    />

                    {/* Content Card */}
                    <View
                        style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 3 }}
                        className="flex-1 bg-white rounded-t-[48px] border-t border-stone-100 overflow-hidden"
                    >
                        {/* Tab Switcher */}
                        <View className="flex-row p-2 bg-stone-100 mx-6 mt-6 rounded-2xl">
                            <TouchableOpacity
                                onPress={() => setActiveTab('prizes')}
                                style={activeTab === 'prizes' ? { elevation: 4, shadowColor: '#b30069', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4.65 } : {}}
                                className={`flex-1 py-3 items-center rounded-xl ${activeTab === 'prizes' ? 'bg-[#b30069]' : ''}`}
                            >
                                <Text className={`font-headline-bold tracking-widest uppercase ${isTablet ? 'text-lg' : 'text-[10px]'} ${activeTab === 'prizes' ? 'text-white' : 'text-stone-400'}`}>
                                    Bounties
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setActiveTab('players')}
                                style={activeTab === 'players' ? { elevation: 4, shadowColor: '#b30069', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4.65 } : {}}
                                className={`flex-1 py-3 items-center rounded-xl ${activeTab === 'players' ? 'bg-[#b30069]' : ''}`}
                            >
                                <Text className={`font-headline-bold tracking-widest uppercase ${isTablet ? 'text-lg' : 'text-[10px]'} ${activeTab === 'players' ? 'text-white' : 'text-stone-400'}`}>
                                    Participants
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: isTablet ? 32 : 24, paddingVertical: 24, paddingBottom: 100 }}
                        >
                            {activeTab === 'prizes' ? (
                                <BountiesList prizes={prizes} isTablet={isTablet} />
                            ) : (
                                <ParticipantsList participants={participants} />
                            )}
                        </ScrollView>
                    </View>

                    {/* Secure Status Footer */}
                    <View
                        style={{ paddingBottom: Math.max(insets.bottom, 20), paddingHorizontal: 32 }}
                        className="absolute bottom-0 left-0 right-0 py-4 bg-white border-t border-stone-100 items-center flex-row justify-center"
                    >
                        <Ionicons name="shield-checkmark" size={isTablet ? 20 : 14} color="#b30069" />
                        <Text className="text-stone-400 font-body-bold uppercase tracking-[2px] text-[10px] ml-4">
                            Server-Synchronized Engine Active
                        </Text>
                    </View>

                </View>
            )}
        </Animated.View>
    );
};

export default BlinkStartingScreen;
