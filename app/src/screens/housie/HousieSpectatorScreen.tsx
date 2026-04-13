import React, { useEffect } from 'react';
import {
    View, Text, ScrollView, ActivityIndicator, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { TouchableOpacity } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchHousieGame, API_URL, getAuthHeaders } from '../../lib/api';
import { getSocket } from '../../lib/socketService';
import axios from 'axios';

const HousieSpectatorScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute();
    const { gameCode, groupId } = (route.params as { gameCode: string; groupId: string }) || {};
    const queryClient = useQueryClient();

    // Fetch game state — refresh on mount to always get latest prizes + status
    const { data: game, isLoading } = useQuery({
        queryKey: ['housieGame', gameCode],
        queryFn: () => fetchHousieGame(gameCode),
        staleTime: 0,
        refetchOnMount: 'always',
        refetchOnWindowFocus: false,
    });

    // Fetch participants for winner names
    const { data: stats } = useQuery({
        queryKey: ['housieParticipants', gameCode],
        queryFn: async () => {
            const headers = await getAuthHeaders();
            const response = await axios.get(`${API_URL}/housie/${gameCode}/participants`, { headers });
            return response.data;
        },
        staleTime: 30_000,
        refetchOnWindowFocus: false,
    });

    // Socket — listen for number calls and game end
    useEffect(() => {
        const socket = getSocket();
        socket.emit('join_game', gameCode);

        const onNumberCalled = (data: any) => {
            queryClient.setQueryData(['housieGame', gameCode], (old: any) => ({
                ...old,
                called_numbers: data.calledNumbers,
                calledCount: data.calledCount,
                remainingCount: data.remainingCount,
            }));
        };

        const onClaimResult = () => {
            // Refresh game so winners update
            queryClient.invalidateQueries({ queryKey: ['housieGame', gameCode] });
        };

        const onGameEnded = () => {
            navigation.replace('HousieResults', { gameCode, groupId });
        };

        socket.on('number_called', onNumberCalled);
        socket.on('claim_result', onClaimResult);
        socket.on('game_ended', onGameEnded);

        return () => {
            socket.off('number_called', onNumberCalled);
            socket.off('claim_result', onClaimResult);
            socket.off('game_ended', onGameEnded);
        };
    }, [gameCode]);

    const calledNumbers = game?.called_numbers || [];
    const latestNumber = calledNumbers[calledNumbers.length - 1];
    const prizes: any[] = game?.prizes || [];

    const getParticipantName = (userId: string) => {
        return stats?.participants?.find((p: any) => p.id === userId)?.name || 'Player';
    };

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-[#fdf9f3] items-center justify-center">
                <ActivityIndicator size="large" color="#b30069" />
            </SafeAreaView>
        );
    }

    // Render numbered cells for the 1–90 board
    const renderNumberCell = (num: number) => {
        const isCalled = calledNumbers.includes(num);
        const isLatest = num === latestNumber;
        return (
            <View
                key={num}
                className={`m-0.5 rounded-lg items-center justify-center aspect-square ${
                    isLatest
                        ? 'bg-primary'
                        : isCalled
                        ? 'bg-primary/20'
                        : 'bg-stone-100'
                }`}
                style={{ width: '9.5%' }}
            >
                <Text
                    className={`font-headline-bold ${
                        isLatest ? 'text-white text-xs' : isCalled ? 'text-primary/80 text-xs' : 'text-stone-300 text-xs'
                    }`}
                >
                    {num}
                </Text>
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top', 'bottom']}>
            {/* Header */}
            <View className="px-6 py-4 flex-row items-center justify-between">
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className="w-10 h-10 items-center justify-center rounded-full bg-white shadow-sm border border-stone-100"
                >
                    <MaterialIcons name="arrow-back-ios" size={18} color="#594048" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
                <View className="items-center">
                    <Text className="text-stone-400 font-body-bold text-[9px] uppercase tracking-widest">Spectating</Text>
                    <Text className="text-[#594048] font-headline-bold text-base">Live Game</Text>
                </View>
                <View className="bg-green-100 px-3 py-1 rounded-full flex-row items-center border border-green-200">
                    <View className="w-2 h-2 rounded-full bg-green-500 mr-1.5" />
                    <Text className="text-green-800 font-body-bold text-[9px] uppercase tracking-widest">Live</Text>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
            >
                {/* Current Number */}
                <View className="items-center mb-8">
                    <Text className="text-stone-400 font-body-bold text-[10px] uppercase tracking-[3px] mb-4">Now Calling</Text>
                    <View
                        className="w-32 h-32 rounded-full bg-primary items-center justify-center shadow-2xl shadow-primary/40 border-[8px] border-white"
                        style={{ elevation: 12 }}
                    >
                        <Text className="text-white text-[52px] font-headline-bold">
                            {latestNumber || '—'}
                        </Text>
                    </View>
                    <Text className="text-stone-400 font-body-medium text-xs mt-3">
                        {calledNumbers.length} of 90 numbers called
                    </Text>
                </View>

                {/* Number Board */}
                <View className="bg-white rounded-[28px] p-4 shadow-sm border border-stone-100 mb-6">
                    <Text className="text-stone-400 font-body-bold text-[10px] uppercase tracking-[2px] mb-3 text-center">
                        Number Board
                    </Text>
                    <View className="flex-row flex-wrap justify-center">
                        {Array.from({ length: 90 }, (_, i) => i + 1).map(renderNumberCell)}
                    </View>
                    {/* Legend */}
                    <View className="flex-row justify-center gap-4 mt-4">
                        <View className="flex-row items-center">
                            <View className="w-3 h-3 rounded bg-primary mr-1.5" />
                            <Text className="text-stone-400 text-[10px] font-body-medium">Current</Text>
                        </View>
                        <View className="flex-row items-center">
                            <View className="w-3 h-3 rounded bg-primary/20 mr-1.5" />
                            <Text className="text-stone-400 text-[10px] font-body-medium">Called</Text>
                        </View>
                        <View className="flex-row items-center">
                            <View className="w-3 h-3 rounded bg-stone-100 mr-1.5" />
                            <Text className="text-stone-400 text-[10px] font-body-medium">Remaining</Text>
                        </View>
                    </View>
                </View>

                {/* Prize Leaderboard */}
                <Text className="text-stone-400 font-body-bold text-[10px] uppercase tracking-[2px] mb-3 text-center">
                    Prize Leaderboard
                </Text>

                {prizes.length === 0 ? (
                    <View className="bg-white rounded-[24px] p-8 items-center border border-stone-100">
                        <FontAwesome5 name="trophy" size={28} color="#e7d5cc" />
                        <Text className="text-stone-300 font-body-medium text-sm mt-3 text-center">
                            Prizes will appear here as the game progresses
                        </Text>
                    </View>
                ) : (
                    prizes.map((prize: any) => {
                        const winnerList = game?.winners?.[prize.id];
                        const winners = Array.isArray(winnerList)
                            ? winnerList
                            : winnerList ? [winnerList] : [];
                        const currentCalledCount = calledNumbers.length;
                        const isClaimed = winners.length > 0 && winners[0].claimedOnIndex < currentCalledCount;
                        const isPending = winners.length > 0 && !isClaimed;

                        return (
                            <View
                                key={prize.id}
                                className={`flex-row items-center py-3 px-4 rounded-[20px] mb-2 ${
                                    isClaimed
                                        ? 'bg-stone-50 border border-stone-100'
                                        : isPending
                                        ? 'bg-orange-50 border border-orange-100'
                                        : 'bg-white border border-stone-100 shadow-sm'
                                }`}
                            >
                                {/* Icon */}
                                <View className={`w-9 h-9 rounded-full items-center justify-center mr-3 ${
                                    isClaimed ? 'bg-stone-100' : isPending ? 'bg-orange-100' : 'bg-primary/10'
                                }`}>
                                    <MaterialIcons
                                        name={prize.icon || 'stars'}
                                        size={16}
                                        color={isClaimed ? '#a8a29e' : isPending ? '#f97316' : '#b30069'}
                                    />
                                </View>

                                {/* Name + winners */}
                                <View className="flex-1">
                                    <Text className={`font-headline-bold text-sm ${
                                        isClaimed ? 'text-stone-400 line-through' : 'text-[#594048]'
                                    }`}>
                                        {prize.name}
                                    </Text>
                                    {winners.length > 0 && (
                                        <Text className={`text-[10px] font-body-medium mt-0.5 ${
                                            isClaimed ? 'text-stone-400' : 'text-orange-500'
                                        }`}>
                                            {isClaimed
                                                ? `🏆 ${winners.map((w: any) => getParticipantName(w.userId)).join(', ')}`
                                                : `⏳ ${winners.length} claim${winners.length > 1 ? 's' : ''} pending...`}
                                        </Text>
                                    )}
                                </View>

                                {/* Amount */}
                                <Text className={`font-headline-bold text-sm ${
                                    isClaimed ? 'text-stone-400' : 'text-primary'
                                }`}>
                                    ₹{winners.length > 1
                                        ? `${(prize.amount / winners.length).toFixed(0)} ea`
                                        : prize.amount}
                                </Text>
                            </View>
                        );
                    })
                )}

                {/* Spectator note */}
                <View className="flex-row items-center justify-center mt-6 opacity-50">
                    <Ionicons name="eye-outline" size={14} color="#94a3b8" />
                    <Text className="text-stone-400 font-body-medium text-xs ml-1.5">
                        You're watching as a spectator · Tickets unavailable
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default HousieSpectatorScreen;
