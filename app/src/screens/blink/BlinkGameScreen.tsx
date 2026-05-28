import React from 'react';
import { View, Text, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { BlinkGameNavHeader } from '../../components/blink/BlinkGameNavHeader';
import { BlinkHeader } from '../../components/blink/BlinkHeader';
import { BlinkCard } from '../../components/blink/BlinkCard';
import { BlinkSpectatorPanel } from '../../components/blink/BlinkSpectatorPanel';
import { BlinkFinishedPanel } from '../../components/blink/BlinkFinishedPanel';
import { useBlinkGameEngine } from '../../hooks/blink/useBlinkGameEngine';

const BlinkGameScreen = () => {
    const route = useRoute();
    const params = route.params as { gameCode: string; groupId: string; planId?: string };
    const gameCode = params?.gameCode?.trim().toUpperCase() || 'BLINK';
    const groupId = params?.groupId || '';

    const {
        players,
        centerSymbols,
        mySymbols,
        isLoading,
        attemptMatch,
        isParticipant,
        hasFinished,
        myPrize,
    } = useBlinkGameEngine(gameCode, groupId, params?.planId);

    const { height: windowHeight, width: windowWidth } = Dimensions.get('window');
    const cardSize = Math.min(windowWidth * 0.88, windowHeight * 0.30);

    return (
        <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top']}>

            {/* ── NAV HEADER ── */}
            <BlinkGameNavHeader gameCode={gameCode} groupId={groupId} />

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator color="#b30069" size="large" />
                    <Text className="mt-4 text-stone-500 font-body-bold">Preparing Game Board...</Text>
                </View>
            ) : (
                <>
                    {/* ── PLAYERS PROGRESS ── */}
                    <BlinkHeader players={players} />

                    {/* ── DIVIDER ── */}
                    <View className="h-px bg-stone-200 mx-5" />

                    {/* ── CENTER CARD ── */}
                    <View className="flex-1 items-center justify-center">
                        <Text className="text-[9px] font-body-bold text-stone-400 tracking-widest uppercase mb-3">
                            Center Card
                        </Text>
                        <BlinkCard
                            symbols={centerSymbols}
                            isCenter={true}
                            size={cardSize}
                        />
                    </View>

                    {/* ── GAP / SEPARATOR ── */}
                    <View className="items-center justify-center py-2">
                        <View className="flex-row items-center gap-x-3">
                            <View className="flex-1 h-px bg-stone-200 mx-5" />
                            <Text className="text-[10px] text-stone-300 font-body-bold">MATCH</Text>
                            <View className="flex-1 h-px bg-stone-200 mx-5" />
                        </View>
                    </View>

                    {/* ── LOWER SECTION (GAMEPLAY OR SPECTATOR PANEL) ── */}
                    {isParticipant ? (
                        hasFinished ? (
                            <BlinkFinishedPanel myPrize={myPrize} />
                        ) : (
                            <View className="flex-1 items-center justify-center">
                                <Text className="text-[9px] font-body-bold text-[#b30069] tracking-widest uppercase mb-3">
                                    Your Card{' '}
                                    <Text className="text-stone-400 normal-case">(Tap to match)</Text>
                                </Text>
                                <BlinkCard
                                    symbols={mySymbols}
                                    isCenter={false}
                                    size={cardSize}
                                    onSymbolPress={attemptMatch}
                                />
                            </View>
                        )
                    ) : (
                        <BlinkSpectatorPanel />
                    )}
                </>
            )}

        </SafeAreaView>
    );
};

export default BlinkGameScreen;
