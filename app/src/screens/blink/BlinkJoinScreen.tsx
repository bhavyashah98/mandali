import * as React from 'react';
import { useIsTablet } from '../../hooks/useIsTablet';
import { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    ScrollView,
    useWindowDimensions
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchBlinkGame, joinBlinkGame, fetchGroupDetail } from '../../lib/api';

const BlinkJoinScreen = () => {
    const isTablet = useIsTablet();
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const route = useRoute();
    const { gameCode: passedGameCode, groupId, planId } = (route.params as { gameCode?: string, groupId?: string, planId?: string }) || {};
    const queryClient = useQueryClient();

    const [gameCode] = useState(passedGameCode || '');
    const [isLoading, setIsLoading] = useState(false);

    // Fetch group details for header
    const { data: groupData } = useQuery({
        queryKey: ['groupDetail', groupId],
        queryFn: () => fetchGroupDetail(groupId!),
        enabled: !!groupId,
    });

    // Fetch Blink game settings
    const { data: gameDetails } = useQuery({
        queryKey: ['blinkGame', gameCode],
        queryFn: () => fetchBlinkGame(gameCode),
        enabled: !!gameCode && gameCode.length >= 6
    });

    const game = gameDetails?.game;

    const handleJoin = async () => {
        if (!gameCode || gameCode.length < 6) {
            Alert.alert('Invalid Code', 'Please enter a 6-character game code');
            return;
        }

        try {
            setIsLoading(true);
            const response = await joinBlinkGame(gameCode.toUpperCase());
            if (response.success || response.player) {
                queryClient.invalidateQueries({ queryKey: ['blinkGame', gameCode.toUpperCase()] });

                navigation.replace('BlinkWaitingRoom', {
                    gameCode: gameCode.toUpperCase(),
                    groupId: groupId,
                    planId
                });
            }
        } catch (error: any) {
            Alert.alert('Join Failed', error.response?.data?.error || 'Could not join this game');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-[#FDF9F3]" edges={['top']}>
            {/* Header Branding */}
            <View className={`flex-row items-center px-6 ${isTablet ? 'py-8' : 'py-4'}`}>
                <View style={{ width: isTablet ? 64 : 44 }}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}
                        className={`items-center justify-center rounded-full bg-white border border-stone-100 ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}
                    >
                        <MaterialIcons name="arrow-back-ios" size={isTablet ? 28 : 20} color="#b30069" style={{ marginLeft: isTablet ? 12 : 5 }} />
                    </TouchableOpacity>
                </View>
                <View className="flex-1 items-center">
                    <Text
                        className="font-headline-bold text-[#1c1c18] text-center uppercase tracking-tight"
                        style={{ fontSize: isTablet ? 32 : 18 }}
                        numberOfLines={1}
                    >
                        Join Blink
                    </Text>
                    <Text
                        className={`text-[#b30069] font-body-bold uppercase tracking-[3px] text-center ${isTablet ? 'text-sm' : 'text-[9px]'}`}
                        numberOfLines={1}
                    >
                        {groupData?.group?.name || 'GATHERING'}
                    </Text>
                </View>
                <View style={{ width: isTablet ? 64 : 44 }} />
            </View>

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ flexGrow: 1, paddingHorizontal: isTablet ? 80 : 24, paddingBottom: 40 }}
            >
                <View className={`${isTablet ? 'py-12' : 'py-4'} flex-1 justify-center`}>
                    {/* Game Info Card */}
                    {game && (
                        <View
                            style={{ elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }}
                            className="bg-white rounded-[40px] border border-stone-100 p-6 mb-8 overflow-hidden"
                        >
                            <View className="absolute top-0 right-0 p-4 opacity-5">
                                <FontAwesome5 name="bolt" size={120} color="#b30069" />
                            </View>

                            <View className="flex-row items-center mb-6">
                                <View className="w-12 h-12 rounded-2xl bg-[#b30069]/10 items-center justify-center mr-4">
                                    <MaterialIcons name="person" size={24} color="#b30069" />
                                </View>
                                <View>
                                    <Text className="text-stone-400 font-body-bold text-[10px] uppercase tracking-widest">Hosted By</Text>
                                    <Text className="text-[#594048] font-headline-bold text-xl">{game.hostName || 'The Mandali'}</Text>
                                </View>
                            </View>

                            <View className="flex-row flex-wrap gap-4">
                                {/* Cards Per Player */}
                                <View className="flex-1 min-w-[140px] bg-stone-50 rounded-3xl p-4 border border-stone-100">
                                    <Text className="text-stone-400 font-body-bold text-[9px] uppercase tracking-widest mb-1">Cards per Player</Text>
                                    <View className="flex-row items-center">
                                        <Ionicons name="copy-outline" size={16} color="#b30069" />
                                        <Text className="text-[#594048] font-headline-bold text-sm ml-2">
                                            {game.cards_per_player || 12} Cards
                                        </Text>
                                    </View>
                                </View>

                                {/* Symbols Per Card */}
                                <View className="flex-1 min-w-[140px] bg-stone-50 rounded-3xl p-4 border border-stone-100">
                                    <Text className="text-stone-400 font-body-bold text-[9px] uppercase tracking-widest mb-1">Symbols Per Card</Text>
                                    <View className="flex-row items-center">
                                        <Ionicons name="help-buoy-outline" size={16} color="#b30069" />
                                        <Text className="text-[#594048] font-headline-bold text-sm ml-2">
                                            {game.symbols_per_card || 6} Symbols
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            <View className="flex-row flex-wrap gap-4 mt-4">
                                {/* Max Players */}
                                <View className="flex-1 min-w-[140px] bg-stone-50 rounded-3xl p-4 border border-stone-100">
                                    <Text className="text-stone-400 font-body-bold text-[9px] uppercase tracking-widest mb-1">Max Players</Text>
                                    <View className="flex-row items-center">
                                        <Ionicons name="people-outline" size={16} color="#b30069" />
                                        <Text className="text-[#594048] font-headline-bold text-sm ml-2">
                                            {game.max_players || 4} Players Max
                                        </Text>
                                    </View>
                                </View>

                                {/* Game Type */}
                                <View className="flex-1 min-w-[140px] bg-stone-50 rounded-3xl p-4 border border-stone-100">
                                    <Text className="text-stone-400 font-body-bold text-[9px] uppercase tracking-widest mb-1">Game Mode</Text>
                                    <View className="flex-row items-center">
                                        <Ionicons name="flash-outline" size={16} color="#f59e0b" />
                                        <Text className="text-[#594048] font-headline-bold text-sm ml-2">
                                            Fast Match
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    )}

                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        className="mt-8 self-center"
                    >
                        <Text className={`text-stone-300 font-body-bold uppercase tracking-[4px] ${isTablet ? 'text-lg' : 'text-xs'}`}>Return to Lobby</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Sticky Footer */}
            <View
                className="bg-[#fdf9f3] border-t border-stone-100"
                style={{
                    paddingHorizontal: isTablet ? 80 : 24,
                    paddingTop: isTablet ? 32 : 24,
                    paddingBottom: Math.max(insets.bottom, isTablet ? 40 : 24)
                }}
            >
                <TouchableOpacity
                    onPress={handleJoin}
                    disabled={isLoading || !gameCode}
                    style={{
                        height: isTablet ? 100 : 64,
                        elevation: 12,
                        shadowColor: '#b30069',
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.3,
                        shadowRadius: 16
                    }}
                    className={`bg-[#b30069] rounded-[32px] flex-row items-center justify-center ${(!gameCode || isLoading) ? 'opacity-50' : ''}`}
                >
                    {isLoading ? (
                        <ActivityIndicator color="white" size={isTablet ? 'large' : 'small'} />
                    ) : (
                        <View className="flex-row items-center">
                            <MaterialIcons name="bolt" size={isTablet ? 36 : 24} color="white" />
                            <Text className={`text-white font-headline-bold ml-4 ${isTablet ? 'text-3xl' : 'text-xl'}`}>
                                Enter Waiting Room
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

export default BlinkJoinScreen;
