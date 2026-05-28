import React, { useEffect } from 'react';
import { useIsTablet } from '../../hooks/useIsTablet';
import {
    View, Text, ScrollView, ActivityIndicator, useWindowDimensions, Image, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { TouchableOpacity } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { fetchHousieGame, fetchGroupDetail, getOptimizedImageUrl, pauseHousieGame, resumeHousieGame, updateHousieStatus } from '../../lib/api';
import { useSocket } from '../../hooks/useSocket';
import { useSocketRoom } from '../../hooks/useSocketRoom';
import HousieWinNotification from '../../components/housie/HousieWinNotification';
import HousieClaimCheckingIndicator from '../../components/housie/HousieClaimCheckingIndicator';
import MandaliCoin from '../../components/MandaliCoin';


const HousieSpectatorScreen = () => {
    const isTablet = useIsTablet();
    const navigation = useNavigation<any>();
    const route = useRoute();
    const { gameCode, groupId, planId } = (route.params as { gameCode: string; groupId: string; planId?: string }) || {};
    const queryClient = useQueryClient();
    const socket = useSocket();
    const { user } = useAuthStore();

    const [isPlayerClaiming, setIsPlayerClaiming] = React.useState(false);
    const [activeNotification, setActiveNotification] = React.useState<{
        type: 'win' | 'boggy';
        playerName: string;
        avatarUrl?: string;
        prizeName: string;
    } | null>(null);

    // Fetch group data for branding
    const { data: groupData } = useQuery({
        queryKey: ['groupDetail', groupId],
        queryFn: () => fetchGroupDetail(groupId!),
        enabled: !!groupId,
    });

    // Fetch game state
    const { data: game, isLoading, refetch: refetchGame } = useQuery({
        queryKey: ['housieGame', gameCode],
        queryFn: () => fetchHousieGame(gameCode),
        staleTime: 0,
        refetchOnMount: 'always',
        refetchOnWindowFocus: false,
    });

    useSocketRoom('join_game', gameCode, () => {
        refetchGame();
    });

    // Socket — listen for numbers and game end
    useEffect(() => {
        if (!socket) return;

        const onNumberCalled = (data: any) => {
            queryClient.setQueryData(['housieGame', gameCode], (old: any) => ({
                ...old,
                called_numbers: data.calledNumbers,
                calledCount: data.calledCount,
                remainingCount: data.remainingCount,
                last_activity_at: data.lastActivityAt
            }));
        };

        const onClaimResult = (data: any) => {
            const { prizeId, status, playerName, avatarUrl, prizeName } = data;
            queryClient.invalidateQueries({ queryKey: ['housieGame', gameCode] });

            if (status === 'accepted') {
                setActiveNotification({ type: 'win', playerName, avatarUrl, prizeName });
            } else if (status === 'denied' && data.message !== 'Prize already claimed') {
                setActiveNotification({ type: 'boggy', playerName, avatarUrl, prizeName });
            }
        };

        const onGameEnded = () => {
            setIsPlayerClaiming(false); // Reset indicator
            navigation.replace('HousieResults', { gameCode, groupId, planId });
        };

        const onGameStarting = () => {
            queryClient.invalidateQueries({ queryKey: ['housieGame', gameCode] });
        };

        const onGameActivated = () => {
            queryClient.invalidateQueries({ queryKey: ['housieGame', gameCode] });
        };

        const onPlayerClaimingOpen = () => setIsPlayerClaiming(true);
        const onPlayerClaimingClosed = () => setIsPlayerClaiming(false);

        const onGamePaused = () => queryClient.invalidateQueries({ queryKey: ['housieGame', gameCode] });
        const onGameResumed = () => queryClient.invalidateQueries({ queryKey: ['housieGame', gameCode] });

        socket.on('number_called', onNumberCalled);
        socket.on('claim_result', onClaimResult);
        socket.on('game_ended', onGameEnded);
        socket.on('game_starting', onGameStarting);
        socket.on('game_activated', onGameActivated);
        socket.on('player_claiming_open', onPlayerClaimingOpen);
        socket.on('player_claiming_closed', onPlayerClaimingClosed);
        socket.on('game_paused', onGamePaused);
        socket.on('game_resumed', onGameResumed);

        return () => {
            socket.off('number_called', onNumberCalled);
            socket.off('claim_result', onClaimResult);
            socket.off('game_ended', onGameEnded);
            socket.off('game_starting', onGameStarting);
            socket.off('game_activated', onGameActivated);
            socket.off('player_claiming_open', onPlayerClaimingOpen);
            socket.off('player_claiming_closed', onPlayerClaimingClosed);
            socket.off('game_paused', onGamePaused);
            socket.off('game_resumed', onGameResumed);
        };
    }, [gameCode, socket, queryClient, navigation, groupId]);

    // 6. Handle ended state if missed socket event
    useEffect(() => {
        if (game?.status === 'ended') {
            navigation.replace('HousieResults', { gameCode, groupId, planId });
        }
    }, [game?.status, gameCode, groupId, navigation]);

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

    const renderBoard = () => {
        const itemRadius = isTablet ? 12 : 6;
        const fontSize = isTablet ? 20 : 10;
        const rows: React.JSX.Element[] = [];
        for (let i = 0; i < 9; i++) {
            const row: React.JSX.Element[] = [];
            for (let j = 1; j <= 10; j++) {
                const num = i * 10 + j;
                const isCalled = calledNumbers.includes(num);
                const isCurrent = num === calledNumbers[calledNumbers.length - 1];
                row.push(
                    <View
                        key={num}
                        style={{ flex: 1, aspectRatio: 1, borderRadius: itemRadius, margin: isTablet ? 3 : 1.5 }}
                        className={`items-center justify-center ${isCurrent ? 'bg-[#b30069]' : isCalled ? 'bg-[#f59e0b]' : 'bg-[#f0ebe6]'
                            }`}
                    >
                        <Text
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.3}
                            style={{ fontSize }}
                            className={`font-headline-bold text-center ${isCurrent ? 'text-white' : isCalled ? 'text-white' : 'text-[#b0a09a]'
                                }`}
                        >
                            {num}
                        </Text>
                    </View>
                );
            }
            rows.push(<View key={i} className="flex-row justify-between w-full">{row}</View>);
        }
        return rows;
    };

    const prizesArr = (game?.prizes || []).map((p: any) => {
        const winnerList = game?.winners?.[p.id];
        const winners = Array.isArray(winnerList) ? winnerList : (winnerList ? [winnerList] : []);
        const isClaimed = winners.length > 0;
        const individualAmount = isClaimed ? (p.amount / winners.length).toFixed(0) : p.amount;
        return { ...p, status: isClaimed ? 'CLAIMED' : 'OPEN', winners, individualAmount };
    });

    return (
        <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top', 'bottom']}>
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
                <View className="flex-1 items-center px-2">
                    <Text
                        className={`text-[#a09a90] font-body-bold uppercase tracking-[3px] text-center ${isTablet ? 'text-xl' : 'text-[10px]'}`}
                        numberOfLines={1}
                    >
                        MANDALI • {groupData?.group?.name || 'SPECTATING'}
                    </Text>
                    <Text className={`text-[#b30069] font-headline-bold leading-tight ${isTablet ? 'text-2xl mt-1' : 'text-xs'}`}>Live Game Board</Text>
                </View>

                {/* Host Controls for Auto Mode */}
                {game?.host_id === user?.id && game?.settings?.callingMode === 'auto' ? (
                    <View className="flex-row items-center" style={{ gap: 8 }}>
                        <TouchableOpacity
                            onPress={async () => {
                                try {
                                    if (game.settings?.isPaused) {
                                        await resumeHousieGame(gameCode);
                                    } else {
                                        await pauseHousieGame(gameCode);
                                    }
                                    refetchGame();
                                } catch (e) {
                                    console.error("Failed to toggle pause:", e);
                                }
                            }}
                            style={game.settings?.isPaused ? {} : { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}
                            className={`rounded-full flex-row items-center border border-stone-100 px-3 py-1.5 ${game.settings?.isPaused ? 'bg-orange-50' : 'bg-white'}`}
                        >
                            <MaterialIcons
                                name={game.settings?.isPaused ? 'play-arrow' : 'pause'}
                                size={16}
                                color={game.settings?.isPaused ? '#f97316' : '#b30069'}
                            />
                            <Text className={`font-headline-bold ml-1 uppercase tracking-tight ${game.settings?.isPaused ? 'text-orange-600' : 'text-primary'} text-[9px]`}>
                                {game.settings?.isPaused ? 'Resume' : 'Pause'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => {
                                Alert.alert('End Game?', 'Are you sure you want to finish this session?', [
                                    { text: 'Cancel', style: 'cancel' },
                                    { text: 'Finish', style: 'destructive', onPress: () => updateHousieStatus(gameCode, 'ended') }
                                ]);
                            }}
                            className="bg-red-50 px-2 py-1.5 rounded-xl border border-red-100 flex-row items-center"
                        >
                            <MaterialIcons name="power-settings-new" size={14} color="#dc2626" />
                            <Text className="text-[#dc2626] font-headline-bold ml-1 text-[9px] uppercase">Finish</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View className={`bg-green-100 rounded-full flex-row items-center border border-green-200 ${isTablet ? 'px-6 py-2' : 'px-3 py-1'}`}>
                        <View className={`rounded-full bg-green-500 ${isTablet ? 'w-3 h-3 mr-3' : 'w-2 h-2 mr-2'}`} />
                        <Text className={`text-green-800 font-body-bold uppercase tracking-widest ${isTablet ? 'text-lg' : 'text-[10px]'}`}>Live</Text>
                    </View>
                )}
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: isTablet ? 80 : 20, paddingBottom: 60 }}
            >
                {/* Drawing Indicator */}
                <View className={`items-center ${isTablet ? 'mb-12 mt-10' : 'mb-8 mt-4'}`}>
                    <Text className={`text-stone-400 font-body-bold uppercase tracking-[4px] mb-6 ${isTablet ? 'text-2xl' : 'text-[11px]'}`}>NOW CALLING</Text>
                    <View className="w-full items-center justify-center">
                        <View className="flex-row items-center justify-center gap-x-5 px-4">
                            {/* Ball p-2 */}
                            <View className="items-center">
                                <View
                                    style={{ width: isTablet ? 90 : 58, height: isTablet ? 90 : 58, borderRadius: 45, backgroundColor: 'rgba(179, 0, 105, 0.1)', borderColor: 'rgba(179, 0, 105, 0.2)' }}
                                    className="border items-center justify-center"
                                >
                                    <Text className={`text-[#594048] font-headline-bold text-center ${isTablet ? 'text-3xl' : 'text-lg'}`}>
                                        {calledNumbers[calledNumbers.length - 3] || '--'}
                                    </Text>
                                </View>
                            </View>

                            {/* Ball p-1 */}
                            <View className="items-center">
                                <View
                                    style={{ width: isTablet ? 110 : 72, height: isTablet ? 110 : 72, borderRadius: 55, backgroundColor: 'rgba(179, 0, 105, 0.2)', borderColor: 'rgba(179, 0, 105, 0.3)' }}
                                    className="border items-center justify-center"
                                >
                                    <Text className={`text-[#594048] font-headline-bold text-center ${isTablet ? 'text-4xl' : 'text-2xl'}`}>
                                        {calledNumbers[calledNumbers.length - 2] || '--'}
                                    </Text>
                                </View>
                            </View>

                            {/* CURRENT BALL */}
                            <View className="items-center">
                                <View
                                    style={{
                                        width: isTablet ? 180 : 110,
                                        height: isTablet ? 180 : 110,
                                        borderRadius: 90,
                                        elevation: 12,
                                        shadowColor: '#b30069',
                                        shadowOffset: { width: 0, height: 10 },
                                        shadowOpacity: 0.3,
                                        shadowRadius: 15
                                    }}
                                    className="bg-[#b30069] items-center justify-center border-[5px] border-white"
                                >
                                    <Text className={`text-white font-headline-bold text-center ${isTablet ? 'text-[84px]' : 'text-[54px]'}`}>
                                        {latestNumber || "—"}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                    <HousieClaimCheckingIndicator visible={isPlayerClaiming} />
                    <Text className={`text-stone-400 font-body-medium mt-6 ${isTablet ? 'text-2xl' : 'text-xs'}`}>
                        {calledNumbers.length} of 90 numbers called
                    </Text>
                </View>

                {/* Players in Game Carousel */}
                {(game?.participants || []).length > 0 && (
                    <View className="mb-10">
                        <Text className={`text-stone-400 font-body-bold text-center uppercase tracking-[3px] mb-4 ${isTablet ? 'text-xl' : 'text-[10px]'}`}>
                            PLAYERS IN GAME
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 4 }}>
                            {(game?.participants || []).map((participant: any) => (
                                <View key={participant.id} className="items-center" style={{ width: isTablet ? 100 : 70 }}>
                                    <View className={`rounded-full bg-stone-100 overflow-hidden items-center justify-center border-2 border-stone-200 mb-2 ${isTablet ? 'w-20 h-20' : 'w-12 h-12'}`}>
                                        {participant.avatarUrl ? (
                                            <Image source={{ uri: getOptimizedImageUrl(participant.avatarUrl, 'w_150,q_auto,f_auto') }} style={{ width: '100%', height: '100%' }} />
                                        ) : (
                                            <Text className={`text-[#b30069] font-headline-bold ${isTablet ? 'text-3xl' : 'text-base'}`}>{participant.name[0]}</Text>
                                        )}
                                    </View>
                                    <Text className={`font-body-bold text-[#594048] text-center ${isTablet ? 'text-sm' : 'text-[9px]'}`} numberOfLines={1}>
                                        {participant.name}
                                    </Text>
                                    <Text className={`text-stone-400 font-body-bold text-center ${isTablet ? 'text-[10px]' : 'text-[8px]'}`}>
                                        {participant.ticketCount} {participant.ticketCount === 1 ? 'ticket' : 'tickets'}
                                    </Text>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Number Board */}
                <View
                    style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}
                    className={`bg-white rounded-[40px] border border-stone-100 mb-10 ${isTablet ? 'p-10' : 'p-6'}`}
                >
                    <Text className={`text-[#594048] font-headline-bold mb-6 ${isTablet ? 'text-4xl' : 'text-xl'}`}>Main Board</Text>
                    <View className="items-center w-full">
                        {renderBoard()}
                    </View>
                </View>

                {/* Rewards */}
                <View className="mt-4 px-2">
                    <Text className={`text-[#594048] font-headline-bold mb-6 ${isTablet ? 'text-4xl' : 'text-xl'}`}>Rewards</Text>
                    <View className="gap-4 pb-10">
                        {prizesArr.map((prize: any, idx: number) => (
                            <View key={idx}
                                style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}
                                className={`bg-white rounded-[24px] border border-stone-100 mb-1 ${isTablet ? 'p-8' : 'p-4'}`}
                            >
                                <View className="flex-row items-center justify-between">
                                    <View className="flex-row items-center flex-1 min-w-0 mr-3">
                                        <View className={`rounded-2xl bg-stone-50 items-center justify-center mr-3 flex-shrink-0 ${isTablet ? 'w-20 h-20' : 'w-9 h-9'}`}>
                                            <MaterialIcons name={prize.icon as any || 'stars'} size={isTablet ? 40 : 18} color="#b30069" />
                                        </View>
                                        <View className="flex-1 min-w-0">
                                            <Text
                                                numberOfLines={1}
                                                adjustsFontSizeToFit
                                                minimumFontScale={0.75}
                                                className={`text-[#594048] font-headline-bold ${isTablet ? 'text-3xl' : 'text-[15px]'}`}
                                            >{prize.name}</Text>
                                            <Text className="text-stone-400 font-body-medium text-[10px]" numberOfLines={1}>
                                                {prize.description}
                                            </Text>
                                            <View className={`flex-row items-center ${isTablet ? 'mt-1' : ''}`}>
                                                <Text className={`text-[#b30069] font-body-bold ${isTablet ? 'text-xl' : 'text-[11px]'}`}>
                                                    {prize.winners?.length > 1 ? `Split: ${prize.individualAmount} each ` : `${prize.amount} `}
                                                </Text>
                                                <MandaliCoin size={isTablet ? 20 : 12} />
                                            </View>
                                        </View>
                                    </View>
                                    <View
                                        className={`rounded-full flex-shrink-0 ${prize.status === 'CLAIMED' ? 'bg-green-100' : 'bg-stone-50'} ${isTablet ? 'px-8 py-4' : 'px-2.5 py-1'}`}
                                        style={{ maxWidth: isTablet ? 300 : 130 }}
                                    >
                                        <Text
                                            numberOfLines={1}
                                            adjustsFontSizeToFit
                                            minimumFontScale={0.6}
                                            className={`font-body-bold tracking-widest uppercase text-center ${isTablet ? 'text-lg' : 'text-[8px]'} ${prize.status === 'CLAIMED' ? 'text-green-700' : 'text-stone-400'}`}
                                        >
                                            {prize.winners?.length > 1
                                                ? `${prize.winners.length} WINNERS`
                                                : prize.winners?.length === 1
                                                    ? `✓ ${getParticipantName(prize.winners[0].userId)}`
                                                    : prize.status
                                            }
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                <View className="flex-row items-center justify-center mt-4 mb-12 opacity-30">
                    <Ionicons name="eye" size={isTablet ? 24 : 16} color="#94a3b8" />
                    <Text className={`text-stone-400 font-body-bold uppercase tracking-widest ml-3 ${isTablet ? 'text-xl' : 'text-[10px]'}`}>
                        Spectator View
                    </Text>
                </View>
            </ScrollView>


            {activeNotification && (
                <HousieWinNotification
                    visible={!!activeNotification}
                    type={activeNotification.type}
                    playerName={activeNotification.playerName}
                    avatarUrl={activeNotification.avatarUrl}
                    prizeName={activeNotification.prizeName}
                    onComplete={() => setActiveNotification(null)}
                />
            )}
        </SafeAreaView>
    );
};

export default HousieSpectatorScreen;
