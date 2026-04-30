import React, { useState, useEffect } from 'react';
import * as Speech from 'expo-speech';
import { useIsTablet } from '../../hooks/useIsTablet';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, useWindowDimensions, FlatList, Alert, Modal, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Socket } from 'socket.io-client';
import { useAuthStore } from '../../stores/authStore';
import MandaliCoin from '../../components/MandaliCoin';
import { fetchHousieGame, joinHousieGame, fetchHousieTickets, API_URL } from '../../lib/api';
import { useSocket } from '../../hooks/useSocket';
import HousieWinNotification from '../../components/housie/HousieWinNotification';
import HousieClaimCheckingIndicator from '../../components/housie/HousieClaimCheckingIndicator';
import { canClaimPrize, registerSessionClaim, resetSessionClaims } from '../../utils/housieValidator';
import { announceHousieNumber } from '../../utils/housieVoice';
import { Ticket } from '../../components/housie/Ticket';

const HousieTicketScreen = () => {
    const { width } = useWindowDimensions();
    const isTablet = useIsTablet();
    const route = useRoute();
    const navigation = useNavigation<any>();
    const queryClient = useQueryClient();
    const { user } = useAuthStore();

    // Extract both gameCode and groupId from params
    const params = route.params as { gameCode?: string, groupId?: string };
    const [gameCode, setGameCode] = useState(params?.gameCode?.trim().toUpperCase() || '');
    const groupId = params?.groupId;

    const [ticketCount, setTicketCount] = useState('2');
    const socket = useSocket();
    const [prizesModalVisible, setPrizesModalVisible] = useState(false);
    const [claimingTicketId, setClaimingTicketId] = useState<string | null>(null);
    const [isGameEnded, setIsGameEnded] = useState(false);
    const [isClaimLoading, setIsClaimLoading] = useState(false); // awaiting fresh game data

    // Claim confirmation modal state
    const [claimConfirmVisible, setClaimConfirmVisible] = useState(false);
    const [pendingClaimPrizeId, setPendingClaimPrizeId] = useState<string | null>(null);
    const [claimCountdown, setClaimCountdown] = useState(10);
    const claimCountdownRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

    const [isPlayerClaiming, setIsPlayerClaiming] = useState(false);
    const [activeNotification, setActiveNotification] = useState<{
        type: 'win' | 'boggy';
        playerName: string;
        avatarUrl?: string;
        prizeName: string;
    } | null>(null);

    // 1. Fetch Game State — staleTime 30s as socket fallback
    const { data: game, refetch: refetchGame } = useQuery({
        queryKey: ['housieGame', gameCode],
        queryFn: () => fetchHousieGame(gameCode),
        enabled: !!gameCode && gameCode.length >= 6,
        staleTime: 30_000,
        refetchOnMount: 'always',
        refetchOnWindowFocus: false
    });

    const getParticipantName = (userId: string) => {
        const participant = game?.participants?.find((p: any) => p.id === userId);
        return participant?.name || 'Player';
    };


    // 2. Fetch User's Tickets — staleTime 5s to avoid resetting marks on every refetch
    const { data: ticketData, isLoading: isLoadingTickets } = useQuery({
        queryKey: ['housieTickets', gameCode],
        queryFn: () => fetchHousieTickets(gameCode),
        enabled: !!gameCode && gameCode.length >= 6,
        staleTime: 5_000
    });

    // 4. Marking state
    const [markedTickets, setMarkedTickets] = useState<Record<string, number[]>>({});
    const [deniedClaims, setDeniedClaims] = useState<Record<string, string[]>>({});

    // Initialize marks from server data — only seed IDs we haven't tracked yet
    // This prevents resuming a game from resetting locally-tapped marks
    useEffect(() => {
        if (ticketData?.tickets) {
            setMarkedTickets(prev => {
                const next = { ...prev };
                ticketData.tickets.forEach((t: any) => {
                    // Only initialise if we have no local state for this ticket yet
                    if (!(t.id in next)) {
                        next[t.id] = t.marked_numbers || [];
                    }
                });
                return next;
            });
        }
    }, [ticketData?.tickets]);

    const handleClaimPrize = (prizeId: string) => {
        if (!socket || !gameCode || !claimingTicketId) return;

        const currentNum = game?.called_numbers?.[game.called_numbers.length - 1] || 0;
        const currentNumIndex = game?.called_numbers?.length || 0;

        // Use the validator to prevent duplicates and spam
        const dbDeniedList = game?.winners?.['__denied']?.[claimingTicketId] || [];
        const combinedDenied = {
            [claimingTicketId]: [...(deniedClaims[claimingTicketId] || []), ...dbDeniedList]
        };

        const { canClaim } = canClaimPrize(
            claimingTicketId,
            prizeId,
            currentNum,
            currentNumIndex,
            combinedDenied
        );

        if (!canClaim) {
            return; // Subtle silent return as requested to remove alerts
        }

        // Register immediately to block rapid clicks
        registerSessionClaim({
            ticketId: claimingTicketId,
            prizeId,
            claimedOnNumber: currentNum,
            claimedOnIndex: currentNumIndex
        });

        socket.emit('claim_prize', {
            gameCode,
            prizeId,
            userId: user?.id,
            ticketId: claimingTicketId,
            markedNumbers: markedTickets[claimingTicketId] || []
        });

        setPrizesModalVisible(false);
        setClaimConfirmVisible(false);
        setPendingClaimPrizeId(null);
        if (claimCountdownRef.current) clearInterval(claimCountdownRef.current);
    };

    const openClaimConfirm = (prizeId: string) => {
        setPendingClaimPrizeId(prizeId);
        setClaimCountdown(10);
        setClaimConfirmVisible(true);
    };

    const closeClaimConfirm = () => {
        setClaimConfirmVisible(false);
        setPendingClaimPrizeId(null);
        if (claimCountdownRef.current) clearInterval(claimCountdownRef.current);
    };

    // 10-second countdown when prize selection modal is open
    useEffect(() => {
        if (!prizesModalVisible) {
            if (claimCountdownRef.current) clearInterval(claimCountdownRef.current);
            return;
        }

        setClaimCountdown(10);
        claimCountdownRef.current = setInterval(() => {
            setClaimCountdown(prev => {
                if (prev <= 1) {
                    if (claimCountdownRef.current) clearInterval(claimCountdownRef.current);
                    setPrizesModalVisible(false);
                    setClaimConfirmVisible(false);
                    setPendingClaimPrizeId(null);
                    if (socket) socket.emit('claiming_closed', { gameCode, userId: user?.id });
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => { if (claimCountdownRef.current) clearInterval(claimCountdownRef.current); };
    }, [prizesModalVisible]);

    useEffect(() => {
        if (!gameCode || gameCode.length < 6 || !socket) return;

        const onConnect = () => {
            socket.emit('join_game', gameCode);
        };

        socket.emit('join_game', gameCode);

        const onNumberCalled = (data: any) => {
            const numbers = data.calledNumbers || [];
            const latest = numbers[numbers.length - 1];

            if (latest) {
                announceHousieNumber(latest);
            }

            queryClient.setQueryData(['housieGame', gameCode], (old: any) => ({
                ...old,
                called_numbers: data.calledNumbers,
                calledCount: data.calledCount,
                remainingCount: data.remainingCount,
                last_activity_at: data.lastActivityAt
            }));
        };

        const onClaimResult = (data: any) => {
            const { prizeId, status, playerName, avatarUrl, prizeName, userId, ticketId } = data;
            queryClient.invalidateQueries({ queryKey: ['housieGame', gameCode] });

            if (status === 'accepted') {
                setActiveNotification({ type: 'win', playerName, avatarUrl, prizeName });
            } else if (status === 'denied' && data.message !== 'Prize already claimed') {
                setActiveNotification({ type: 'boggy', playerName, avatarUrl, prizeName });

                if (userId === user?.id) {
                    setDeniedClaims(prev => ({
                        ...prev,
                        [ticketId]: [...(prev[ticketId] || []), prizeId]
                    }));
                }
            }
        };

        const onTicketsBought = () => {
            queryClient.invalidateQueries({ queryKey: ['housieParticipants', gameCode] });
        };

        const onGameEnded = () => {
            queryClient.removeQueries({ queryKey: ['housieTickets', gameCode] });
            setIsGameEnded(true);
            setPrizesModalVisible(false);
            setClaimingTicketId(null);
            setIsPlayerClaiming(false);
            setTimeout(() => {
                navigation.replace('HousieResults', { gameCode, groupId });
            }, 100);
        };

        const onGameStarting = () => {
            queryClient.invalidateQueries({ queryKey: ['housieGame', gameCode] });
        };

        const onGameActivated = () => {
            resetSessionClaims();
            queryClient.invalidateQueries({ queryKey: ['housieGame', gameCode] });
        };

        const onPlayerClaimingOpen = () => setIsPlayerClaiming(true);
        const onPlayerClaimingClosed = () => setIsPlayerClaiming(false);

        socket.on('connect', onConnect);
        socket.on('number_called', onNumberCalled);
        socket.on('claim_result', onClaimResult);
        socket.on('tickets_bought', onTicketsBought);
        socket.on('game_ended', onGameEnded);
        socket.on('game_starting', onGameStarting);
        socket.on('game_activated', onGameActivated);
        socket.on('player_claiming_open', onPlayerClaimingOpen);
        socket.on('player_claiming_closed', onPlayerClaimingClosed);

        return () => {
            socket.off('connect', onConnect);
            socket.off('number_called', onNumberCalled);
            socket.off('claim_result', onClaimResult);
            socket.off('tickets_bought', onTicketsBought);
            socket.off('game_ended', onGameEnded);
            socket.off('game_starting', onGameStarting);
            socket.off('game_activated', onGameActivated);
            socket.off('player_claiming_open', onPlayerClaimingOpen);
            socket.off('player_claiming_closed', onPlayerClaimingClosed);
        };
    }, [gameCode, user?.id]);


    const toggleMark = (ticketId: string, num: number) => {
        if (isGameEnded) return;

        const currentMarks = markedTickets[ticketId] || [];
        const newMarks = currentMarks.includes(num)
            ? currentMarks.filter(n => n !== num)
            : [...currentMarks, num];

        setMarkedTickets(prev => ({ ...prev, [ticketId]: newMarks }));
        if (socket) {
            socket.emit('sync_marks', {
                ticketId,
                markedNumbers: newMarks
            });
        }
    };

    const tickets = ticketData?.tickets || [];
    const isJoined = tickets.length > 0;
    const calledNumbers = game?.called_numbers || [];
    const latestNumber = calledNumbers[calledNumbers.length - 1];

    if (isLoadingTickets || !ticketData || !isJoined) {
        return (
            <SafeAreaView className="flex-1 bg-background items-center justify-center">
                <ActivityIndicator size="large" color="#b30069" />
            </SafeAreaView>
        );
    }

    const renderTicket = ({ item: ticket }: { item: any }) => {
        const dbDeniedList = game?.winners?.['__denied']?.[ticket.id] || [];
        const isBoggy = (deniedClaims[ticket.id]?.length || 0) > 0 || dbDeniedList.length > 0;

        const ticketWins: string[] = [];
        let isFullHouseWin = false;

        Object.keys(game?.winners || {}).forEach(prizeId => {
            if (prizeId === '__pending' || prizeId === '__denied') return;
            const winners = game.winners[prizeId];
            const winnerArray = Array.isArray(winners) ? winners : (winners ? [winners] : []);
            const myWinOnThisTicket = winnerArray.find((w: any) => w.ticketId === ticket.id);
            if (myWinOnThisTicket) {
                const prize = game.prizes.find((p: any) => p.id === prizeId);
                const prizeName = prize?.name || 'Prize';
                if (prizeName.toLowerCase().includes('full house')) isFullHouseWin = true;
                else ticketWins.push(prizeName);
            }
        });

        return (
            <View className={`mb-12 w-full ${isBoggy ? 'opacity-90' : ''} ${isTablet ? 'px-12' : ''}`}>
                <View className="flex-row items-center justify-between mb-4 px-2">
                    <View className="flex-1">
                        <Text className={`text-stone-400 font-body-bold uppercase tracking-[3px] ${isTablet ? 'text-xl' : 'text-[10px]'}`}>TICKET #{ticket.id.slice(-4).toUpperCase()}</Text>
                        {ticketWins.length > 0 && (
                            <View className="flex-row flex-wrap mt-2">
                                {ticketWins.map((win, idx) => (
                                    <View key={idx} className="bg-green-100 px-3 py-1 rounded-full border border-green-200 mr-2 mb-1">
                                        <Text className={`text-green-700 font-headline-bold uppercase tracking-tight ${isTablet ? 'text-lg' : 'text-[9px]'}`}>Won {win}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>

                    <TouchableOpacity
                        onPress={async () => {
                            setClaimingTicketId(ticket.id);
                            setClaimCountdown(10);
                            if (socket) socket.emit('claiming_open', { gameCode, userId: user?.id });
                            // Await fresh game data BEFORE opening modal — prizes may be stale
                            try {
                                setIsClaimLoading(true);
                                await refetchGame();
                            } finally {
                                setIsClaimLoading(false);
                            }
                            setPrizesModalVisible(true);
                        }}
                        disabled={isBoggy || isFullHouseWin || isClaimLoading}
                        style={{ height: isTablet ? 60 : 36 }}
                        className={`flex-row items-center ${isTablet ? 'px-8' : 'px-4'} rounded-full ${isBoggy ? 'bg-stone-200' : isFullHouseWin ? 'bg-green-50' : 'bg-white border border-stone-100'}`}
                    >
                        {isClaimLoading ? (
                            <ActivityIndicator size="small" color="#b30069" />
                        ) : (
                            <>
                                <FontAwesome5 name="trophy" size={isTablet ? 18 : 12} color={isBoggy ? '#a8a29e' : isFullHouseWin ? '#16a34a' : '#b30069'} />
                                <Text className={`font-headline-bold ml-3 uppercase tracking-tight ${isBoggy ? 'text-stone-400' : isFullHouseWin ? 'text-green-600' : 'text-primary'} ${isTablet ? 'text-xl' : 'text-[11px]'}`}>
                                    {isBoggy ? 'Disqualified' : isFullHouseWin ? 'Winner!' : 'Claim Reward'}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <Ticket
                    ticketData={ticket.ticket_data}
                    markedNumbers={markedTickets[ticket.id] || []}
                    onNumberPress={(num) => toggleMark(ticket.id, num)}
                    isTablet={isTablet}
                    isBoggy={isBoggy}
                    isFullHouseWin={isFullHouseWin}
                />
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-[#FDF9F3]" edges={['top']}>
            <View className={`px-6 items-center flex-row justify-between ${isTablet ? 'py-8' : 'py-4'}`}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className={`items-center justify-center rounded-full bg-white shadow-sm border border-stone-100 ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}
                >
                    <MaterialIcons name="arrow-back-ios" size={isTablet ? 24 : 18} color="#594048" style={{ marginLeft: isTablet ? 10 : 5 }} />
                </TouchableOpacity>
                <View className={`bg-white rounded-full flex-row items-center border border-stone-100 shadow-sm ${isTablet ? 'px-6 py-2.5' : 'px-3 py-1.5'}`}>
                    <View className={`rounded-full bg-green-500 ${isTablet ? 'w-3 h-3 mr-2.5' : 'w-2 h-2 mr-1.5'}`} />
                    <Text className={`text-stone-600 font-body-bold uppercase tracking-widest ${isTablet ? 'text-lg' : 'text-[9px]'}`}>
                        {gameCode} <Text className="text-stone-300 mx-1">•</Text> LIVE <Text className="text-stone-300 mx-1">•</Text> {game?.hostName || 'MANDALI'}
                    </Text>
                </View>
                <View style={{ width: isTablet ? 64 : 40 }} />
            </View>

            <View className={`items-center px-6 pb-4 bg-[#FDF9F3] z-10 border-b border-stone-100`}>
                <Text className={`text-stone-400 font-body-bold uppercase tracking-[4px] mb-3 ${isTablet ? 'text-lg' : 'text-[9px]'}`}>Now Calling</Text>
                <View
                    style={{ width: isTablet ? 360 : 140, height: isTablet ? 360 : 140, borderRadius: isTablet ? 180 : 70 }}
                    className="bg-primary items-center justify-center shadow-lg shadow-primary/20 border-8 border-white"
                >
                    <Text className={`text-white font-headline-bold ${isTablet ? 'text-[90px]' : 'text-[60px]'}`}>{latestNumber || "--"}</Text>
                </View>
                <View className="flex-row items-center mt-3">
                    <Text className={`text-stone-400 font-body-medium ${isTablet ? 'text-2xl' : 'text-[11px]'}`}>
                        {calledNumbers.length} of 90 numbers called
                    </Text>
                </View>

                {/* Centered Verification Indicator */}
                <View className="mt-4 h-12 justify-center">
                    <HousieClaimCheckingIndicator visible={isPlayerClaiming} />
                </View>
            </View>

            <FlatList
                data={tickets}
                renderItem={renderTicket}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingHorizontal: isTablet ? 40 : 20, paddingTop: 20, paddingBottom: 60 }}
                ListHeaderComponent={() => null}
                ListFooterComponent={() => (
                    <View className={`mt-8 pt-12 border-t border-stone-100 ${isTablet ? 'px-12' : ''}`}>
                        <Text className={`text-stone-400 font-body-bold uppercase tracking-[4px] mb-8 text-center ${isTablet ? 'text-xl' : 'text-[10px]'}`}>Reward Pool Tracker</Text>
                        <View className="gap-3">
                            {(game?.prizes || []).map((prize: any) => {
                                const winnerList = game?.winners?.[prize.id];
                                const winners = Array.isArray(winnerList) ? winnerList : (winnerList ? [winnerList] : [])
                                const currentCalledCount = game?.called_numbers?.length || 0;
                                const isGlobalClosed = winners.length > 0 && winners[0].claimedOnIndex < currentCalledCount;
                                const isPendingShare = winners.length > 0 && !isGlobalClosed;
                                const individualAmount = winners.length > 0 ? (prize.amount / winners.length).toFixed(0) : prize.amount;
                                return (
                                    <View key={prize.id} className={`flex-row items-center rounded-[24px] ${isGlobalClosed ? 'bg-stone-100' : 'bg-white shadow-sm border border-stone-100'} mb-2 ${isTablet ? 'p-8' : 'p-4'}`}>
                                        <View className={`${isTablet ? 'w-20 h-20' : 'w-10 h-10'} rounded-full ${isGlobalClosed ? 'bg-stone-200' : isPendingShare ? 'bg-orange-50' : 'bg-primary/5'} items-center justify-center mr-4`}>
                                            <MaterialIcons name={prize.icon || 'stars'} size={isTablet ? 36 : 20} color={isGlobalClosed ? '#a8a29e' : isPendingShare ? '#f97316' : '#b30069'} />
                                        </View>
                                        <View className="flex-1">
                                            <Text className={`font-headline-bold ${isGlobalClosed ? 'text-stone-400 line-through' : 'text-[#31302d]'} ${isTablet ? 'text-3xl' : 'text-base'}`}>{prize.name}</Text>
                                            {winners.length > 0 && (
                                                <Text className={`uppercase font-body-bold mt-1 ${isGlobalClosed ? 'text-stone-400' : 'text-orange-500'} ${isTablet ? 'text-lg' : 'text-[9px]'}`}>
                                                    {isGlobalClosed ? (winners.length > 1 ? `${winners.length} WINNERS CHECKED` : `Winner: ${getParticipantName(winners[0].userId)}`) : 'Verification in progress...'}
                                                </Text>
                                            )}
                                        </View>
                                        <View className="flex-row items-center">
                                            <Text className={`font-headline-bold ${isGlobalClosed ? 'text-stone-400' : 'text-[#b30069]'} ${isTablet ? 'text-4xl' : 'text-lg'}`}>{individualAmount}</Text>
                                            <MandaliCoin size={isTablet ? 32 : 14} style={{ marginLeft: 6 }} />
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}
                showsVerticalScrollIndicator={false}
            />

            <Modal animationType="fade" transparent={true} visible={prizesModalVisible} onRequestClose={() => setPrizesModalVisible(false)}>
                <View className={`flex-1 justify-center bg-[#594048]/90 ${isTablet ? 'px-24 py-24' : 'px-4 py-8'}`}>
                    <View className={`bg-[#FDF9F3] rounded-[40px] shadow-2xl border border-white/20 max-h-[100%] ${isTablet ? 'p-12' : 'p-6'}`}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View className="flex-row items-center justify-between mb-2">
                                <Text className={`font-headline-bold text-[#594048] ${isTablet ? 'text-5xl' : 'text-2xl'}`}>Claim Reward</Text>
                                <View className="flex-row items-center">
                                    <View className="bg-primary/10 px-3 py-1 rounded-full mr-3 border border-primary/20 flex-row items-center">
                                        <MaterialIcons name="timer" size={14} color="#b30069" />
                                        <Text className="text-primary font-body-bold ml-1">{claimCountdown}s</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => { setPrizesModalVisible(false); if (socket) socket.emit('claiming_closed', { gameCode, userId: user?.id }); }}
                                        className={`items-center justify-center rounded-full bg-stone-100 ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}>
                                        <MaterialIcons name="close" size={isTablet ? 32 : 24} color="#594048" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <Text className="text-stone-400 font-body-medium mb-6 text-sm">Please select a prize to claim before the timer ends.</Text>
                            <View className="gap-4">
                                {([...(game?.prizes || [])].sort((a: any, b: any) => {
                                    const currentCalledCount = game?.called_numbers?.length || 0;
                                    const aWinList = game?.winners?.[a.id];
                                    const aWinners = Array.isArray(aWinList) ? aWinList : (aWinList ? [aWinList] : []);
                                    const aClosed = aWinners.length > 0 && aWinners[0].claimedOnIndex < currentCalledCount;
                                    const bWinList = game?.winners?.[b.id];
                                    const bWinners = Array.isArray(bWinList) ? bWinList : (bWinList ? [bWinList] : []);
                                    const bClosed = bWinners.length > 0 && bWinners[0].claimedOnIndex < currentCalledCount;
                                    if (aClosed !== bClosed) return aClosed ? 1 : -1;
                                    return parseInt(b.amount || '0') - parseInt(a.amount || '0');
                                })).map((prize: any) => {
                                    const winners = Array.isArray(game?.winners?.[prize.id]) ? game.winners[prize.id] : (game?.winners?.[prize.id] ? [game.winners[prize.id]] : []);
                                    const currentCalledCount = game?.called_numbers?.length || 0;
                                    const isGlobalClosed = winners.length > 0 && winners[0].claimedOnIndex < currentCalledCount;
                                    let standardWinsOnTicket = 0, fullHouseWinsOnTicket = 0;
                                    (game?.prizes || []).forEach((p: any) => {
                                        const tWinners = Array.isArray(game?.winners?.[p.id]) ? game.winners[p.id] : (game?.winners?.[p.id] ? [game.winners[p.id]] : []);
                                        if (tWinners.some((w: any) => w.ticketId === claimingTicketId)) {
                                            if (p.name.toLowerCase().includes('full house')) fullHouseWinsOnTicket++;
                                            else standardWinsOnTicket++;
                                        }
                                    });
                                    const isMyWin = winners.some((w: any) => w.ticketId === claimingTicketId);
                                    const dbDeniedPrizeIds = game?.winners?.['__denied']?.[claimingTicketId as string] || [];
                                    const isLocalDenied = claimingTicketId ? (deniedClaims[claimingTicketId]?.includes(prize.id) || dbDeniedPrizeIds.includes(prize.id)) : false;
                                    const isLimitReached = !isMyWin && ((prize.name.toLowerCase().includes('full house') && fullHouseWinsOnTicket >= 1) || (!prize.name.toLowerCase().includes('full house') && standardWinsOnTicket >= 1));
                                    let status = 'Claim', statusColor = 'text-white', bgColor = 'bg-[#b30069]';
                                    if (isMyWin) { status = 'Success'; bgColor = 'bg-stone-100'; statusColor = 'text-green-600'; }
                                    else if (isGlobalClosed) { status = winners.length > 1 ? `${winners.length} Wins` : 'Closed'; bgColor = 'bg-stone-50'; statusColor = 'text-stone-300'; }
                                    else if (isLocalDenied) { status = 'Denied'; bgColor = 'bg-red-50'; statusColor = 'text-red-400'; }
                                    else if (isLimitReached) { status = 'Limited'; bgColor = 'bg-stone-100'; statusColor = 'text-stone-400'; }
                                    else if (winners.length > 0) { status = 'Join Share'; bgColor = 'bg-orange-500'; statusColor = 'text-white'; }
                                    const disableButton = isGlobalClosed || isMyWin || isLocalDenied || isLimitReached;
                                    return (
                                        <TouchableOpacity key={prize.id} onPress={() => !disableButton && openClaimConfirm(prize.id)} disabled={disableButton}
                                            className={`bg-white rounded-[28px] flex-row items-center border border-stone-100 mb-2 ${isTablet ? 'p-8' : 'p-4'} ${disableButton && !isMyWin ? 'opacity-50' : ''}`}>
                                            <View className={`${isTablet ? 'w-20 h-20' : 'w-12 h-12'} rounded-full ${(winners.length > 0 && !isGlobalClosed && !isLimitReached) ? 'bg-orange-50' : 'bg-stone-50'} items-center justify-center mr-4`}>
                                                <MaterialIcons name={prize.icon || 'stars'} size={isTablet ? 36 : 24} color={(winners.length > 0 && !isGlobalClosed && !isLimitReached) ? '#f97316' : '#b30069'} />
                                            </View>
                                            <View className="flex-1">
                                                <Text className={`text-[#31302d] font-headline-bold ${isTablet ? 'text-3xl' : 'text-base'}`}>{prize.name}</Text>
                                                <View className="flex-row items-center mt-1">
                                                    <Text className={`text-stone-400 font-body-medium ${isTablet ? 'text-lg' : 'text-xs'}`}>Value: {winners.length > 1 && !isLimitReached ? (prize.amount / winners.length).toFixed(0) : prize.amount}</Text>
                                                    <MandaliCoin size={isTablet ? 18 : 12} style={{ marginLeft: 4 }} />
                                                </View>
                                            </View>
                                            <View style={{ height: isTablet ? 60 : 40, minWidth: isTablet ? 140 : 80 }} className={`px-6 items-center justify-center rounded-full ${bgColor}`}>
                                                <Text className={`font-headline-bold uppercase tracking-tight ${statusColor} ${isTablet ? 'text-xl' : 'text-[11px]'}`}>{status}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </ScrollView>

                        {claimConfirmVisible && (
                            <View className="absolute top-0 left-0 right-0 bottom-0 bg-white/95 rounded-[40px] items-center justify-center p-8 z-50">
                                <View className={`rounded-full bg-primary/10 items-center justify-center mb-6 ${isTablet ? 'w-24 h-24' : 'w-20 h-20'}`}>
                                    <FontAwesome5 name="trophy" size={isTablet ? 48 : 36} color="#b30069" />
                                </View>
                                <Text className={`text-[#1c1c18] font-headline-bold text-center mb-2 ${isTablet ? 'text-4xl' : 'text-2xl'}`}>Confirm Claim?</Text>
                                <Text className={`text-stone-400 font-body-medium text-center mb-8 ${isTablet ? 'text-xl' : 'text-sm'}`}>Are you sure you want to claim {game?.prizes?.find((p: any) => p.id === pendingClaimPrizeId)?.name}?</Text>
                                <View className="w-full gap-4">
                                    <TouchableOpacity onPress={() => pendingClaimPrizeId && handleClaimPrize(pendingClaimPrizeId)} className={`bg-primary rounded-full items-center justify-center ${isTablet ? 'h-20' : 'h-14'}`}>
                                        <Text className={`text-white font-headline-bold ${isTablet ? 'text-3xl' : 'text-lg'}`}>Yes, Claim Now ({claimCountdown}s)</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={closeClaimConfirm} className={`bg-stone-100 rounded-full items-center justify-center ${isTablet ? 'h-20' : 'h-14'}`}>
                                        <Text className={`text-stone-500 font-headline-bold ${isTablet ? 'text-3xl' : 'text-lg'}`}>Cancel</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

            {activeNotification && (
                <HousieWinNotification visible={!!activeNotification} type={activeNotification.type} playerName={activeNotification.playerName} avatarUrl={activeNotification.avatarUrl} prizeName={activeNotification.prizeName} onComplete={() => setActiveNotification(null)} />
            )}
        </SafeAreaView>
    );
};

export default HousieTicketScreen;
