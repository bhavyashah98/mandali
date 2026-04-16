import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, useWindowDimensions, FlatList, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../../stores/authStore';
import { fetchHousieGame, joinHousieGame, fetchHousieTickets, API_URL } from '../../lib/api';
import { getSocket } from '../../lib/socketService';

const HousieTicketScreen = () => {
    const { width } = useWindowDimensions();
    const isTablet = width > 500;
    const route = useRoute();
    const navigation = useNavigation<any>();
    const queryClient = useQueryClient();
    const { user } = useAuthStore();

    // Extract both gameCode and groupId from params
    const params = route.params as { gameCode?: string, groupId?: string };
    const [gameCode, setGameCode] = useState(params?.gameCode?.trim().toUpperCase() || '');
    const groupId = params?.groupId;

    const [ticketCount, setTicketCount] = useState('2');
    const [socket, setSocket] = useState<Socket | null>(null);
    const [prizesModalVisible, setPrizesModalVisible] = useState(false);
    const [claimingTicketId, setClaimingTicketId] = useState<string | null>(null);
    const [isGameEnded, setIsGameEnded] = useState(false);

    // 1. Fetch Game State — staleTime 30s as socket fallback
    const { data: game } = useQuery({
        queryKey: ['housieGame', gameCode],
        queryFn: () => fetchHousieGame(gameCode),
        enabled: !!gameCode && gameCode.length >= 6,
        staleTime: 30_000,
        refetchOnMount: 'always',   // Always refetch on mount so prizes (set at activation) are fresh
        refetchOnWindowFocus: false
    });

    const getParticipantName = (userId: string) => {
        const participant = game?.participants?.find((p: any) => p.id === userId);
        return participant?.name || 'Player';
    };

    useEffect(() => {
        if (game?.status === 'ended') {
            setIsGameEnded(true);
        }
    }, [game?.status]);

    // 2. Fetch User's Tickets
    const { data: ticketData, isLoading: isLoadingTickets } = useQuery({
        queryKey: ['housieTickets', gameCode],
        queryFn: () => fetchHousieTickets(gameCode),
        enabled: !!gameCode && gameCode.length >= 6,
        staleTime: 0
    });

    // 3. Purchase Tickets Mutation
    const buyTicketsMutation = useMutation({
        mutationFn: () => joinHousieGame(gameCode, parseInt(ticketCount)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['housieTickets', gameCode] });
        },
        onError: (error: any) => {
            Alert.alert('Error', error.response?.data?.error || 'Failed to buy tickets');
        }
    });

    // 4. Marking state
    const [markedTickets, setMarkedTickets] = useState<Record<string, number[]>>({});
    const [deniedClaims, setDeniedClaims] = useState<Record<string, string[]>>({});

    // Initialize marks from server data
    useEffect(() => {
        if (ticketData?.tickets) {
            const initialMarks: Record<string, number[]> = {};
            ticketData.tickets.forEach((t: any) => {
                initialMarks[t.id] = t.marked_numbers || [];
            });
            setMarkedTickets(initialMarks);
        }
    }, [ticketData?.tickets]);

    const handleClaimPrize = (prizeId: string) => {
        if (!socket || !gameCode || !claimingTicketId) return;

        if (deniedClaims[claimingTicketId]?.includes(prizeId)) {
            Alert.alert('Denied', 'Your claim for this prize on this ticket was already denied by the host.');
            return;
        }

        socket.emit('claim_prize', {
            gameCode,
            prizeId,
            userId: user?.id,
            ticketId: claimingTicketId,
            markedNumbers: markedTickets[claimingTicketId] || []
        });

        setPrizesModalVisible(false);
        Alert.alert('Claim Sent', 'Your claim has been sent to the host for verification.');
    };

    useEffect(() => {
        if (!gameCode || gameCode.length < 6) return;

        const socket = getSocket();
        setSocket(socket);
        socket.emit('join_game', gameCode);

        const onNumberCalled = (data: any) => {
            queryClient.setQueryData(['housieGame', gameCode], (old: any) => ({
                ...old,
                called_numbers: data.calledNumbers,
                calledCount: data.calledCount,
                remainingCount: data.remainingCount
            }));
        };

        const onClaimResult = (data: any) => {
            const { prizeId, userId, ticketId, status } = data;

            // If any claim is accepted globally, force a refresh of the game state
            // so everyone immediately sees the prize mapped to the winners list!
            if (status === 'accepted') {
                queryClient.invalidateQueries({ queryKey: ['housieGame', gameCode] });
            }

            if (userId === user?.id) {
                if (status === 'accepted') {
                    Alert.alert('Congratulations!', 'Your claim has been accepted!');
                } else {
                    const msg = data.message || 'The host has denied your claim.';

                    // Only mark as Boggy if the Host manually denied it (false claim), 
                    // not if they just lost a speed-tie ("Prize already claimed")
                    if (msg !== 'Prize already claimed') {
                        setDeniedClaims(prev => ({
                            ...prev,
                            [ticketId]: [...(prev[ticketId] || []), prizeId]
                        }));
                    }

                    Alert.alert('Claim Denied', msg);
                }
            }
        };

        const onTicketsBought = () => {
            queryClient.invalidateQueries({ queryKey: ['housieParticipants', gameCode] });
        };

        const onGameEnded = () => {
            // Close any open modal before navigating — prevents modal floating over Results screen
            setPrizesModalVisible(false);
            setClaimingTicketId(null);
            // Small delay to let modal animate closed before navigation
            setTimeout(() => {
                navigation.replace('HousieResults', {
                    gameCode: gameCode,
                    groupId: groupId
                });
            }, 150);
        };

        socket.on('number_called', onNumberCalled);
        socket.on('claim_result', onClaimResult);
        socket.on('tickets_bought', onTicketsBought);
        socket.on('game_ended', onGameEnded);

        return () => {
            socket.off('number_called', onNumberCalled);
            socket.off('claim_result', onClaimResult);
            socket.off('tickets_bought', onTicketsBought);
            socket.off('game_ended', onGameEnded);
        };
    }, [gameCode]); // Stable dep — game?.id caused re-registration on every refresh

    // Double-Safety: Navigate via query if socket was missed
    useEffect(() => {
        if (game?.status === 'ended' && gameCode) {
            navigation.replace('HousieResults', {
                gameCode: gameCode,
                groupId: groupId
            });
        }
    }, [game?.status]);

    const toggleMark = (ticketId: string, num: number) => {
        if (isGameEnded) return;
        
        const currentMarks = markedTickets[ticketId] || [];
        const newMarks = currentMarks.includes(num)
            ? currentMarks.filter(n => n !== num)
            : [...currentMarks, num];

        // Update local state for UI responsiveness
        setMarkedTickets(prev => ({ ...prev, [ticketId]: newMarks }));

        // Sync with server via socket
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

    // Note: No redirect-if-no-tickets here.
    // Members only reach this screen after purchasing tickets in WaitingRoom.
    // A momentary empty ticketData during loading should never bounce them away.

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

        return (
            <View className={`mb-6 w-full ${isBoggy ? 'opacity-90' : ''}`}>
                <View className="flex-row items-center justify-between mb-3 px-2">
                    <Text className="text-stone-400 font-body-bold text-[9px] uppercase tracking-widest">TICKET #{ticket.id.slice(-4).toUpperCase()}</Text>
                    <TouchableOpacity
                        onPress={() => {
                            setClaimingTicketId(ticket.id);
                            setPrizesModalVisible(true);
                        }}
                        disabled={isBoggy}
                        className={`flex-row items-center px-3 py-1.5 rounded-full ${isBoggy ? 'bg-stone-200' : 'bg-primary/10'}`}
                    >
                        <FontAwesome5 name="trophy" size={10} color={isBoggy ? '#a8a29e' : '#b30069'} />
                        <Text className={`font-headline-bold text-[10px] ml-2 uppercase tracking-tight ${isBoggy ? 'text-stone-400' : 'text-primary'}`}>
                            {isBoggy ? 'Disqualified' : 'Claim Prize'}
                        </Text>
                    </TouchableOpacity>
                </View>
                <View className="relative bg-white rounded-[24px] p-2.5 shadow-lg shadow-black/5 border border-black/5 overflow-hidden">
                    {/* The Boggy Overlay */}
                    {isBoggy && (
                        <View className="absolute z-10 bottom-0 top-0 left-0 right-0 bg-[#594048]/60 items-center justify-center rounded-[24px]" style={{ elevation: 5 }}>
                            <View className="bg-primary px-6 py-2 rounded-2xl border-[3px] border-white shadow-2xl opacity-95" style={{ transform: [{ rotate: '-12deg' }] }}>
                                <Text className="text-white font-headline-bold text-3xl tracking-widest">OOPS BOGGY</Text>
                            </View>
                        </View>
                    )}

                    <View className={isBoggy ? 'opacity-50' : ''}>
                        {ticket.ticket_data.map((row: any[], rIdx: number) => (
                            <View key={rIdx} className="flex-row">
                                {row.map((num: number | null, cIdx: number) => (
                                    <View key={cIdx} className="flex-1 aspect-square p-0.5">
                                        {num ? (
                                            <TouchableOpacity
                                                onPress={() => toggleMark(ticket.id, num)}
                                                disabled={isBoggy}
                                                className={`w-full h-full rounded-md items-center justify-center border ${(markedTickets[ticket.id] || []).includes(num) ? 'bg-primary border-primary' : 'bg-stone-50 border-stone-100'}`}
                                            >
                                                <Text className={`font-headline-bold ${(markedTickets[ticket.id] || []).includes(num) ? 'text-white' : 'text-on-surface'} ${isTablet ? 'text-2xl' : 'text-xs'}`}>
                                                    {num}
                                                </Text>
                                            </TouchableOpacity>
                                        ) : (
                                            <View className="w-full h-full rounded-md bg-stone-50/10" />
                                        )}
                                    </View>
                                ))}
                            </View>
                        ))}
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            {/* Header */}
            <View className="px-6 py-4 flex-row items-center justify-between">
                <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 items-center justify-center rounded-full bg-white/50">
                    <MaterialIcons name="arrow-back-ios" size={20} color="#594048" style={{ marginLeft: 5 }} />
                </TouchableOpacity>
                <View className="bg-green-100 px-3 py-1 rounded-full flex-row items-center border border-green-200">
                    <View className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                    <Text className="text-green-800 font-body-bold text-[10px] uppercase tracking-widest">Live</Text>
                </View>
                <View className="w-10" />
            </View>

            <FlatList
                data={tickets}
                renderItem={renderTicket}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
                ListHeaderComponent={() => (
                    <View className={`mb-10 mt-4 items-center ${isTablet ? 'py-10' : ''}`}>
                        <Text className={`text-stone-400 font-body-bold uppercase tracking-[3px] mb-6 ${isTablet ? 'text-lg' : 'text-[11px]'}`}>NOW CALLING</Text>
                        <View
                            style={{ width: isTablet ? 220 : 144, height: isTablet ? 220 : 144, borderRadius: 110, elevation: 12 }}
                            className="bg-primary items-center justify-center shadow-2xl shadow-primary/40 border-[10px] border-white"
                        >
                            <Text className={`text-white font-headline-bold ${isTablet ? 'text-8xl' : 'text-[56px]'}`}>
                                {latestNumber || "--"}
                            </Text>
                        </View>
                    </View>
                )}
                ListFooterComponent={() => (
                    <View className="mt-4 pt-10 border-t border-stone-100">
                        <Text className="text-stone-400 font-body-bold text-[9px] uppercase tracking-[2px] mb-6 text-center">Prize Reference Live Status</Text>
                        <View className="gap-2">
                            {(game?.prizes || []).map((prize: any) => {
                                const winnerList = game?.winners?.[prize.id];
                                const winners = Array.isArray(winnerList) ? winnerList : (winnerList ? [winnerList] : [])
                                const currentCalledCount = game?.called_numbers?.length || 0;
                                const isGlobalClosed = winners.length > 0 && winners[0].claimedOnIndex < currentCalledCount;
                                const isPendingShare = winners.length > 0 && !isGlobalClosed;

                                const individualAmount = winners.length > 0 ? (prize.amount / winners.length).toFixed(0) : prize.amount;

                                return (
                                    <View key={prize.id} className={`flex-row items-center py-3 px-4 rounded-[20px] ${isGlobalClosed ? 'bg-stone-100' : 'bg-white shadow-sm border border-stone-100'} mb-1`}>
                                        <View className={`w-8 h-8 rounded-full ${isGlobalClosed ? 'bg-stone-200' : isPendingShare ? 'bg-orange-50' : 'bg-stone-50'} items-center justify-center mr-3`}>
                                            <MaterialIcons name={prize.icon || 'stars'} size={14} color={isGlobalClosed ? '#a8a29e' : isPendingShare ? '#f97316' : '#b30069'} />
                                        </View>
                                        <View className="flex-1">
                                            <Text className={`font-headline-bold text-sm ${isGlobalClosed ? 'text-stone-400 line-through' : 'text-[#594048]'}`}>{prize.name}</Text>
                                            {winners.length > 0 && (
                                                <Text className={`text-[9px] uppercase font-body-bold ${isGlobalClosed ? 'text-stone-400' : 'text-orange-500'}`}>
                                                    {isGlobalClosed
                                                        ? winners.length > 1 
                                                            ? `${winners.length} WINNERS ✓`
                                                            : `Winner: ${getParticipantName(winners[0].userId)} ✓`
                                                        : 'Pending verification...'}
                                                </Text>
                                            )}
                                        </View>
                                        <Text className={`font-headline-bold text-sm ${isGlobalClosed ? 'text-stone-400' : 'text-primary'}`}>₹{individualAmount}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}
                showsVerticalScrollIndicator={false}
            />

            <Modal animationType="slide" transparent={true} visible={prizesModalVisible} onRequestClose={() => setPrizesModalVisible(false)}>
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-[#FDF9F3] rounded-t-[40px] p-8 pb-12">
                        <View className="flex-row items-center justify-between mb-8">
                            <Text className="text-2xl font-headline-bold text-[#594048]">Claim Prizes</Text>
                            <TouchableOpacity onPress={() => setPrizesModalVisible(false)}>
                                <MaterialIcons name="close" size={24} color="#594048" />
                            </TouchableOpacity>
                        </View>
                        <View className="gap-4">
                            {([...(game?.prizes || [])].sort((a: any, b: any) => {
                                const currentCalledCount = game?.called_numbers?.length || 0;

                                // Extract winners accurately
                                const aWinList = game?.winners?.[a.id];
                                const aWinners = Array.isArray(aWinList) ? aWinList : (aWinList ? [aWinList] : []);
                                const aClosed = aWinners.length > 0 && aWinners[0].claimedOnIndex < currentCalledCount;

                                const bWinList = game?.winners?.[b.id];
                                const bWinners = Array.isArray(bWinList) ? bWinList : (bWinList ? [bWinList] : []);
                                const bClosed = bWinners.length > 0 && bWinners[0].claimedOnIndex < currentCalledCount;

                                // Prioritize Open Window (false) over Closed Window (true)
                                if (aClosed !== bClosed) {
                                    return aClosed ? 1 : -1;
                                }

                                // If they have the same claim status, sort sequentially by highest prize amount
                                return parseInt(b.amount || '0') - parseInt(a.amount || '0');
                            })).map((prize: any) => {
                                const winnerList = game?.winners?.[prize.id];
                                const winners = Array.isArray(winnerList) ? winnerList : (winnerList ? [winnerList] : []);
                                const currentCalledCount = game?.called_numbers?.length || 0;

                                // A prize is ONLY permanently closed to the public if the NEXT number has been drawn.
                                const isGlobalClosed = winners.length > 0 && winners[0].claimedOnIndex < currentCalledCount;

                                // Pre-calculate what this active ticket has already successfully won
                                let standardWinsOnTicket = 0;
                                let fullHouseWinsOnTicket = 0;
                                (game?.prizes || []).forEach((p: any) => {
                                    const ticketWinList = game?.winners?.[p.id] || [];
                                    const tWinners = Array.isArray(ticketWinList) ? ticketWinList : [ticketWinList];
                                    if (tWinners.some((w: any) => w.ticketId === claimingTicketId)) {
                                        if (p.name.toLowerCase().includes('full house')) fullHouseWinsOnTicket++;
                                        else standardWinsOnTicket++;
                                    }
                                });

                                // Check if active ticket is one of the winners
                                const myWin = winners.find((w: any) => w.ticketId === claimingTicketId);
                                const isMyWin = !!myWin;

                                // Persist Boggy from DB
                                const dbDeniedPrizeIds = game?.winners?.['__denied']?.[claimingTicketId as string] || [];
                                const isLocalDenied = claimingTicketId ? (deniedClaims[claimingTicketId]?.includes(prize.id) || dbDeniedPrizeIds.includes(prize.id)) : false;

                                // Enforce Strict Housie Limits for this Ticket
                                const isFullHousePrize = prize.name.toLowerCase().includes('full house');
                                const isLimitReached = !isMyWin && (
                                    (isFullHousePrize && fullHouseWinsOnTicket >= 1) ||
                                    (!isFullHousePrize && standardWinsOnTicket >= 1)
                                );

                                let status = 'Claim';
                                let statusColor = 'text-white';
                                let bgColor = 'bg-[#b30069]';

                                if (isMyWin) {
                                    status = 'You Won';
                                    bgColor = 'bg-green-100';
                                    statusColor = 'text-green-700';
                                } else if (isGlobalClosed) {
                                    status = winners.length > 1 ? `${winners.length} Winners` : `Won: ${getParticipantName(winners[0].userId)}`;
                                    bgColor = 'bg-stone-50';
                                    statusColor = 'text-stone-400';
                                } else if (isLocalDenied) {
                                    status = 'Rejected';
                                    bgColor = 'bg-red-50';
                                    statusColor = 'text-red-400';
                                } else if (isLimitReached) {
                                    status = 'Ticket Limit';
                                    bgColor = 'bg-stone-200';
                                    statusColor = 'text-stone-500';
                                } else if (winners.length > 0) {
                                    status = 'Claim Share';
                                    bgColor = 'bg-orange-500';
                                    statusColor = 'text-white';
                                }

                                const disableButton = isGlobalClosed || isMyWin || isLocalDenied || isLimitReached;

                                return (
                                    <TouchableOpacity
                                        key={prize.id}
                                        onPress={() => !disableButton && handleClaimPrize(prize.id)}
                                        disabled={disableButton}
                                        className={`bg-white p-4 rounded-[24px] flex-row items-center shadow-sm border border-stone-100 ${disableButton && !isMyWin ? 'opacity-50' : ''}`}
                                    >
                                        <View className={`w-12 h-12 rounded-full ${(winners.length > 0 && !isGlobalClosed && !isLimitReached) ? 'bg-orange-50' : 'bg-stone-50'} items-center justify-center mr-4`}>
                                            <MaterialIcons name={prize.icon || 'stars'} size={24} color={(winners.length > 0 && !isGlobalClosed && !isLimitReached) ? '#f97316' : '#b30069'} />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-[#594048] font-headline-bold text-base">{prize.name}</Text>
                                            <Text className="text-stone-400 font-body-medium text-xs">
                                                {winners.length > 1 && !isLimitReached ? `Split: ₹${(prize.amount / winners.length).toFixed(0)}` : `Prize: ₹${prize.amount}`}
                                            </Text>
                                        </View>
                                        <View className={`px-4 py-2 rounded-full ${bgColor}`}>
                                            <Text className={`font-headline-bold text-[11px] uppercase ${statusColor}`}>{status}</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

export default HousieTicketScreen;
