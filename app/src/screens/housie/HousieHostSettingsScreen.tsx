import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useIsTablet } from '../../hooks/useIsTablet';
import { createHousieGame } from '../../lib/api';
import { useNavigation, useRoute } from '@react-navigation/native';

import { CallingModeSection } from '../../components/housie/settings/CallingModeSection';
import { GameTwistSection } from '../../components/housie/settings/GameTwistSection';
import { HostTicketsSection } from '../../components/housie/settings/HostTicketsSection';

const HousieHostSettingsScreen = () => {
    const route = useRoute();
    const navigation = useNavigation<any>();
    const { groupId } = (route.params as { groupId: string }) || {};
    const isTablet = useIsTablet();

    // Calling Mode
    const [callingMode, setCallingMode] = useState<'manual' | 'auto'>('manual');
    const [autoCallSeconds, setAutoCallSeconds] = useState(7);

    // Game Style
    const [gameStyle, setGameStyle] = useState('classic');

    // Host Tickets
    const [hostTickets, setHostTickets] = useState(0);
    const [ticketDifficulty, setTicketDifficulty] = useState('easy');

    const [isLoading, setIsLoading] = useState(false);

    const isManual = callingMode === 'manual';

    const handleCallingMode = useCallback((mode: 'manual' | 'auto') => {
        setCallingMode(mode);
        if (mode === 'manual') {
            setHostTickets(0); // host can't buy tickets in manual mode
        }
    }, []);

    const handleContinue = useCallback(async () => {
        if (!groupId) {
            Alert.alert('Error', 'Group ID is missing.');
            return;
        }
        try {
            setIsLoading(true);
            const result = await createHousieGame(groupId, {
                callingMode,
                autoCallSeconds,
                hostTickets,
                ticketDifficulty,
                gameStyle,
            });
            navigation.replace('HousieWaitingRoom', {
                groupId,
                gameCode: result.game.game_code,
            });
        } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.error || 'Failed to initialize game.');
        } finally {
            setIsLoading(false);
        }
    }, [groupId, callingMode, autoCallSeconds, hostTickets, ticketDifficulty, gameStyle, navigation]);

    return (
        <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top', 'bottom']}>

            {/* Header */}
            <View className="flex-row items-center px-6 py-4 border-b border-stone-100">
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className="w-10 h-10 items-center justify-center rounded-full bg-white border border-stone-100"
                    style={{ elevation: 2 }}
                >
                    <MaterialIcons name="arrow-back-ios" size={20} color="#b30069" style={{ marginLeft: 5 }} />
                </TouchableOpacity>
                <View className="flex-1 items-center" style={{ marginRight: 40 }}>
                    <Text className="font-headline-bold text-[#1c1c18]" style={{ fontSize: isTablet ? 32 : 22 }}>
                        Host Settings
                    </Text>
                    <Text className="font-body-regular text-[#a09d96]" style={{ fontSize: isTablet ? 18 : 13, marginTop: 2 }}>
                        Configure your room rules
                    </Text>
                </View>
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: isTablet ? 40 : 20, paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
            >
                <CallingModeSection
                    callingMode={callingMode}
                    setCallingMode={handleCallingMode}
                    autoCallSeconds={autoCallSeconds}
                    setAutoCallSeconds={setAutoCallSeconds}
                    isTablet={isTablet}
                />

                <GameTwistSection
                    gameStyle={gameStyle}
                    setGameStyle={setGameStyle}
                    isTablet={isTablet}
                />

                <HostTicketsSection
                    hostTickets={hostTickets}
                    setHostTickets={setHostTickets}
                    ticketDifficulty={ticketDifficulty}
                    setTicketDifficulty={setTicketDifficulty}
                    isManual={isManual}
                    isTablet={isTablet}
                />
            </ScrollView>

            {/* Floating CTA */}
            <View
                className="absolute bottom-0 w-full px-6 border-t border-stone-100"
                style={{ paddingTop: 16, paddingBottom: 32, backgroundColor: '#fdf9f3' }}
            >
                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleContinue}
                    disabled={isLoading}
                    style={{
                        width: '100%',
                        height: isTablet ? 80 : 60,
                        borderRadius: 32,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#b30069',
                        opacity: isLoading ? 0.8 : 1,
                        elevation: 8,
                        shadowColor: '#b30069',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 10,
                    }}
                >
                    {isLoading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="font-headline-bold text-white" style={{ fontSize: isTablet ? 28 : 20 }}>
                            Create Room
                        </Text>
                    )}
                </TouchableOpacity>
            </View>

        </SafeAreaView>
    );
};

export default HousieHostSettingsScreen;
