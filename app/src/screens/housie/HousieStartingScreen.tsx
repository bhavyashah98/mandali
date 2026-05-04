import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Animated, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

// Hooks
import { useIsTablet } from '../../hooks/useIsTablet';
import { useAuthStore } from '../../stores/authStore';
import { useHousieStartingData } from '../../hooks/housie/useHousieStartingData';
import { useHousieStartingSync } from '../../hooks/housie/useHousieStartingSync';
import { useQuery } from '@tanstack/react-query';
import { fetchHousieGameStyles } from '../../lib/api';

// Components
import CountdownHeader from '../../components/housie/starting/CountdownHeader';
import StartingStats from '../../components/housie/starting/StartingStats';
import BountiesList from '../../components/housie/starting/BountiesList';
import ParticipantsList from '../../components/housie/starting/ParticipantsList';

const HousieStartingScreen = () => {
    const isTablet = useIsTablet();
    const navigation = useNavigation<any>();
    const route = useRoute();
    const insets = useSafeAreaInsets();
    const { user } = useAuthStore();
    const { gameCode, groupId } = route.params as { gameCode: string; groupId: string };

    const [activeTab, setActiveTab] = useState<'prizes' | 'players'>('prizes');

    // Animations
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // 1. Data Hook
    const {
        game,
        isLoading,
        secondsLeft,
        progressAnim,
        refetch,
    } = useHousieStartingData(gameCode);

    // 2. Sync Hook
    useHousieStartingSync(gameCode, game, user, refetch, groupId);

    // Initial Animations
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.05, duration: 600, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, useNativeDriver: true })
            ])
        ).start();
    }, [pulseAnim]);

    useEffect(() => {
        if (!isLoading && game) {
            Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
        }
    }, [isLoading, game, fadeAnim]);

    const prizes = game?.prizes || [];
    const participants = game?.participants || [];
    const totalPrizePool = game?.totalPrizePool || (participants.length * 100);

    // Get mode details from backend
    const { data: stylesData } = useQuery({
        queryKey: ['housieStyles'],
        queryFn: fetchHousieGameStyles
    });

    const styles = stylesData?.styles || [
        { id: 'classic', title: 'Classic Housie', description: 'Standard rules and numbers', icon: 'ticket-confirmation-outline' }
    ];

    const currentStyle = styles.find(s => s.id === game?.settings?.gameStyle) || styles[0];

    return (
        <Animated.View style={{ flex: 1, backgroundColor: '#fdf9f3', opacity: fadeAnim }}>
            {/* Background Decor */}
            <View style={{ position: 'absolute', top: -100, right: -50, opacity: 0.05 }}>
                <FontAwesome5 name="dice" size={300} color="#b30069" />
            </View>

            {(!game && isLoading) ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator color="#b30069" size="large" />
                    <Text className="text-stone-400 font-headline-bold mt-6 tracking-[4px] uppercase text-[10px]">Preparing Room...</Text>
                </View>
            ) : (
                <View className="flex-1" style={{ paddingTop: insets.top }}>

                    <CountdownHeader
                        secondsLeft={secondsLeft}
                        progressAnim={progressAnim}
                        pulseAnim={pulseAnim}
                        isTablet={isTablet}
                        modeName={currentStyle.title}
                        modeDescription={currentStyle.description}
                    />

                    <StartingStats
                        participantsCount={participants.length}
                        totalPrizePool={totalPrizePool}
                        isTablet={isTablet}
                    />

                    {/* Content Area */}
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
                                <BountiesList prizes={prizes} isTablet={isTablet} totalPrizePool={totalPrizePool} />
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
                        <Text className="text-stone-400 font-body-bold uppercase tracking-[2px] text-[10px] ml-4">Server-Synchronized Engine Active</Text>
                    </View>
                </View>
            )}
        </Animated.View>
    );
};

export default HousieStartingScreen;
