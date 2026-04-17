import React, { useEffect } from 'react';
import {
    View, Text, ScrollView, ActivityIndicator, FlatList, useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { TouchableOpacity } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchHousieGame, API_URL, fetchGroupDetail } from '../../lib/api';
import { getSocket } from '../../lib/socketService';

const HousieSpectatorScreen = () => {
    const { width } = useWindowDimensions();
    const isTablet = width > 500;
    const navigation = useNavigation<any>();
    const route = useRoute();
    const { gameCode, groupId } = (route.params as { gameCode: string; groupId: string }) || {};
    const queryClient = useQueryClient();

    // Fetch group data for branding
    const { data: groupData } = useQuery({
        queryKey: ['groupDetail', groupId],
        queryFn: () => fetchGroupDetail(groupId!),
        enabled: !!groupId,
    });

    // Fetch game state
    const { data: game, isLoading } = useQuery({
        queryKey: ['housieGame', gameCode],
        queryFn: () => fetchHousieGame(gameCode),
        staleTime: 0,
        refetchOnMount: 'always',
        refetchOnWindowFocus: false,
    });

    // Socket — listen for numbers and game end
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
        const participant = game?.participants?.find((p: any) => p.id === userId);
        return participant?.name || 'Player';
    };

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-[#fdf9f3] items-center justify-center">
                <ActivityIndicator size="large" color="#b30069" />
            </SafeAreaView>
        );
    }

    const renderNumberCell = (num: number) => {
        const isCalled = calledNumbers.includes(num);
        const isLatest = num === latestNumber;
        return (
            <View
                key={num}
                className={`m-0.5 rounded-lg items-center justify-center aspect-square ${
                    isLatest ? 'bg-[#b30069]' : isCalled ? 'bg-[#b30069]/10' : 'bg-stone-50'
                }`}
                style={{ width: '9%' }}
            >
                <Text
                    className={`font-headline-bold ${
                        isLatest ? 'text-white' : isCalled ? 'text-[#b30069]' : 'text-stone-300'
                    } ${isTablet ? 'text-xl' : 'text-[9px]'}`}
                >
                    {num}
                </Text>
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top', 'bottom']}>
            {/* Header Branding */}
            <View className={`flex-row items-center px-6 ${isTablet ? 'py-8' : 'py-4'}`}>
                <View style={{ width: isTablet ? 64 : 44 }}>
                    <TouchableOpacity 
                        onPress={() => navigation.goBack()} 
                        className={`items-center justify-center rounded-full bg-white shadow-sm border border-stone-100 ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}
                    >
                        <MaterialIcons name="arrow-back-ios" size={isTablet ? 28 : 20} color="#b30069" style={{ marginLeft: isTablet ? 12 : 5 }} />
                    </TouchableOpacity>
                </View>
                <View className="flex-1 items-center">
                    <Text 
                        className={`text-[#a09a90] font-body-bold uppercase tracking-[3px] text-center ${isTablet ? 'text-xl' : 'text-[10px]'}`}
                        numberOfLines={1}
                    >
                        MANDALI • {groupData?.group?.name || 'SPECTATING'}
                    </Text>
                    <Text className={`text-[#b30069] font-headline-bold leading-tight ${isTablet ? 'text-2xl mt-1' : 'text-xs'}`}>Live Game Board</Text>
                </View>
                <View className={`bg-green-100 rounded-full flex-row items-center border border-green-200 ${isTablet ? 'px-6 py-2' : 'px-3 py-1'}`}>
                    <View className={`rounded-full bg-green-500 ${isTablet ? 'w-3 h-3 mr-3' : 'w-2 h-2 mr-2'}`} />
                    <Text className={`text-green-800 font-body-bold uppercase tracking-widest ${isTablet ? 'text-lg' : 'text-[10px]'}`}>Live</Text>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: isTablet ? 80 : 20, paddingBottom: 60 }}
            >
                {/* Drawing Indicator */}
                <View className={`items-center ${isTablet ? 'mb-16 mt-10' : 'mb-10 mt-4'}`}>
                    <Text className={`text-stone-400 font-body-bold uppercase tracking-[4px] mb-6 ${isTablet ? 'text-2xl' : 'text-[11px]'}`}>NOW CALLING</Text>
                    <View
                        style={{ 
                            width: isTablet ? 280 : 160, 
                            height: isTablet ? 280 : 160, 
                            borderRadius: isTablet ? 140 : 80, 
                            elevation: 20 
                        }}
                        className="bg-[#b30069] items-center justify-center shadow-2xl shadow-[#b30069]/40 border-[10px] border-white"
                    >
                        <Text className={`text-white font-headline-bold ${isTablet ? 'text-[120px]' : 'text-[64px]'}`}>
                            {latestNumber || "—"}
                        </Text>
                    </View>
                    <Text className={`text-stone-400 font-body-medium mt-6 ${isTablet ? 'text-2xl' : 'text-xs'}`}>
                        {calledNumbers.length} of 90 numbers called
                    </Text>
                </View>

                {/* Number Board Grid */}
                <View className={`bg-white rounded-[32px] shadow-sm border border-stone-100 mb-10 ${isTablet ? 'p-10 px-12' : 'p-4'}`}>
                    <Text className={`text-stone-400 font-body-bold text-center uppercase tracking-[3px] mb-6 ${isTablet ? 'text-xl' : 'text-[10px]'}`}>
                        MASTER NUMBER BOARD
                    </Text>
                    <View className="flex-row flex-wrap justify-center">
                        {Array.from({ length: 90 }, (_, i) => i + 1).map(renderNumberCell)}
                    </View>
                    
                    <View className={`flex-row justify-center gap-8 ${isTablet ? 'mt-10' : 'mt-6'}`}>
                        <View className="flex-row items-center">
                            <View className={`rounded bg-[#b30069] ${isTablet ? 'w-6 h-6 mr-3' : 'w-3 h-3 mr-2'}`} />
                            <Text className={`text-stone-400 font-body-bold uppercase ${isTablet ? 'text-lg' : 'text-[10px]'}`}>Latest</Text>
                        </View>
                        <View className="flex-row items-center">
                            <View className={`rounded bg-[#b30069]/20 ${isTablet ? 'w-6 h-6 mr-3' : 'w-3 h-3 mr-2'}`} />
                            <Text className={`text-stone-400 font-body-bold uppercase ${isTablet ? 'text-lg' : 'text-[10px]'}`}>Called</Text>
                        </View>
                    </View>
                </View>

                {/* Prize Status Dashboard */}
                <Text className={`text-stone-400 font-body-bold text-center uppercase tracking-[4px] mb-8 ${isTablet ? 'text-2xl' : 'text-[11px]'}`}>
                    PRIZE LEADERBOARD
                </Text>

                {prizes.length === 0 ? (
                    <View className="bg-white rounded-[40px] p-20 items-center justify-center border border-stone-100">
                        <Ionicons name="sparkles" size={isTablet ? 60 : 40} color="#e7d5cc" />
                        <Text className={`text-stone-300 font-body-bold text-center mt-6 ${isTablet ? 'text-2xl' : 'text-sm'}`}>
                            Prizes will update here live as players win
                        </Text>
                    </View>
                ) : (
                    <View className="gap-3">
                        {prizes.map((prize: any) => {
                            const winnerList = game?.winners?.[prize.id];
                            const winners = Array.isArray(winnerList) ? winnerList : (winnerList ? [winnerList] : []);
                            const currentCalledCount = calledNumbers.length;
                            const isClaimed = winners.length > 0 && winners[0].claimedOnIndex < currentCalledCount;
                            const isPending = winners.length > 0 && !isClaimed;

                            return (
                                <View
                                    key={prize.id}
                                    className={`flex-row items-center rounded-[28px] mb-2 ${
                                        isClaimed ? 'bg-stone-50 border border-stone-100' : 'bg-white shadow-sm border border-stone-100'
                                    } ${isTablet ? 'p-8' : 'p-4'}`}
                                >
                                    <View className={`${isTablet ? 'w-20 h-20' : 'w-10 h-10'} rounded-full items-center justify-center mr-4 ${
                                        isClaimed ? 'bg-stone-200' : isPending ? 'bg-orange-50' : 'bg-[#b30069]/5'
                                    }`}>
                                        <MaterialIcons
                                            name={prize.icon || 'stars'}
                                            size={isTablet ? 36 : 20}
                                            color={isClaimed ? '#a8a29e' : isPending ? '#f97316' : '#b30069'}
                                        />
                                    </View>

                                    <View className="flex-1">
                                        <Text className={`font-headline-bold ${isClaimed ? 'text-stone-400 line-through' : 'text-[#31302d]'} ${isTablet ? 'text-3xl' : 'text-base'}`}>
                                            {prize.name}
                                        </Text>
                                        {winners.length > 0 && (
                                            <Text className={`uppercase font-body-bold mt-1 ${isClaimed ? 'text-stone-400' : 'text-orange-500'} ${isTablet ? 'text-lg' : 'text-[9px]'}`}>
                                                {isClaimed
                                                    ? `Winner: ${winners.map((w: any) => getParticipantName(w.userId)).join(', ')}`
                                                    : `Verification in progress (${winners.length})...`}
                                            </Text>
                                        )}
                                    </View>

                                    <Text className={`font-headline-bold ${isClaimed ? 'text-stone-400' : 'text-[#b30069]'} ${isTablet ? 'text-4xl' : 'text-lg'}`}>
                                        ₹{winners.length > 1 ? (prize.amount / winners.length).toFixed(0) : prize.amount}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                )}

                <View className="flex-row items-center justify-center mt-12 opacity-30">
                    <Ionicons name="eye" size={isTablet ? 24 : 16} color="#94a3b8" />
                    <Text className={`text-stone-400 font-body-bold uppercase tracking-widest ml-3 ${isTablet ? 'text-xl' : 'text-[10px]'}`}>
                        Spectator View
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default HousieSpectatorScreen;
