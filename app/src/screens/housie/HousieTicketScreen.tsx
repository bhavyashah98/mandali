import React, { useState, useEffect } from 'react';
import { useIsTablet } from '../../hooks/useIsTablet';
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
            <View className={`mb-12 w-full ${isBoggy ? 'opacity-90' : ''} ${isTablet ? 'px-12' : ''}`}>
                <View className="flex-row items-center justify-between mb-4 px-2">
                    <Text className={`text-stone-400 font-body-bold uppercase tracking-[3px] ${isTablet ? 'text-xl' : 'text-[10px]'}`}>TICKET #{ticket.id.slice(-4).toUpperCase()}</Text>
                    <TouchableOpacity
                        onPress={() => {
                            setClaimingTicketId(ticket.id);
                            setPrizesModalVisible(true);
                        }}
                        disabled={isBoggy}
                        style={{ height: isTablet ? 60 : 36 }}
                        className={`flex-row items-center ${isTablet ? 'px-8' : 'px-4'} rounded-full ${isBoggy ? 'bg-stone-200' : 'bg-primary/10'}`}
                    >
                        <FontAwesome5 name="trophy" size={isTablet ? 18 : 12} color={isBoggy ? '#a8a29e' : '#b30069'} />
                        <Text className={`font-headline-bold ml-3 uppercase tracking-tight ${isBoggy ? 'text-stone-400' : 'text-primary'} ${isTablet ? 'text-xl' : 'text-[11px]'}`}>
                            {isBoggy ? 'Disqualified' : 'Claim Prize'}
                        </Text>
                    </TouchableOpacity>
                </View>
                <View className={`relative bg-white rounded-[32px] shadow-lg shadow-black/5 border border-black/5 overflow-hidden ${isTablet ? 'p-6' : 'p-3'}`}>
                    {/* The Boggy Overlay */}
                    {isBoggy && (
                        <View className="absolute z-10 bottom-0 top-0 left-0 right-0 bg-[#594048]/60 items-center justify-center rounded-[32px]" style={{ elevation: 5 }}>
                            <View className="bg-primary px-10 py-4 rounded-[32px] border-[4px] border-white shadow-2xl opacity-95" style={{ transform: [{ rotate: '-8deg' }] }}>
                                <Text className={`text-white font-headline-bold tracking-widest ${isTablet ? 'text-6xl' : 'text-3xl'}`}>OOPS BOGGY</Text>
                            </View>
                        </View>
                    )}

                    <View className={isBoggy ? 'opacity-50' : ''}>
                        {ticket.ticket_data.map((row: any[], rIdx: number) => (
                            <View key={rIdx} className="flex-row">
                                {row.map((num: number | null, cIdx: number) => (
                                    <View key={cIdx} className="flex-1 aspect-square p-1">
                                        {num ? (
                                            <TouchableOpacity
                                                onPress={() => toggleMark(ticket.id, num)}
                                                disabled={isBoggy}
                                                className={`w-full h-full rounded-xl items-center justify-center border ${(markedTickets[ticket.id] || []).includes(num) ? 'bg-primary border-primary' : 'bg-stone-50 border-stone-100'}`}
                                            >
                                                <Text className={`font-headline-bold ${(markedTickets[ticket.id] || []).includes(num) ? 'text-white' : 'text-[#1c1c18]'} ${isTablet ? 'text-3xl' : 'text-sm'}`}>
                                                    {num}
                                                </Text>
                                            </TouchableOpacity>
                                        ) : (
                                            <View className="w-full h-full rounded-xl bg-stone-50/10" />
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
        <SafeAreaView className="flex-1 bg-[#FDF9F3]" edges={['top']}>
            {/* Header */}
            <View className={`px-6 items-center flex-row justify-between ${isTablet ? 'py-8' : 'py-4'}`}>
                <TouchableOpacity 
                    onPress={() => navigation.goBack()} 
                    className={`items-center justify-center rounded-full bg-white shadow-sm border border-stone-100 ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}
                >
                    <MaterialIcons name="arrow-back-ios" size={isTablet ? 24 : 18} color="#594048" style={{ marginLeft: isTablet ? 10 : 5 }} />
                </TouchableOpacity>
                <View className={`bg-green-100 rounded-full flex-row items-center border border-green-200 ${isTablet ? 'px-6 py-2' : 'px-3 py-1'}`}>
                    <View className={`rounded-full bg-green-500 ${isTablet ? 'w-3 h-3 mr-3' : 'w-2 h-2 mr-2'}`} />
                    <Text className={`text-green-800 font-body-bold uppercase tracking-widest ${isTablet ? 'text-lg' : 'text-[10px]'}`}>Live Game</Text>
                </View>
                <View style={{ width: isTablet ? 64 : 40 }} />
            </View>

            <FlatList
                data={tickets}
                renderItem={renderTicket}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingHorizontal: isTablet ? 40 : 20, paddingBottom: 60 }}
                ListHeaderComponent={() => (
                    <View className={`mb-12 mt-6 items-center ${isTablet ? 'py-12' : ''}`}>
                        <Text className={`text-stone-400 font-body-bold uppercase tracking-[4px] mb-8 ${isTablet ? 'text-2xl' : 'text-[11px]'}`}>NOW CALLING</Text>
                        <View
                            style={{ 
                                width: isTablet ? 280 : 160, 
                                height: isTablet ? 280 : 160, 
                                borderRadius: isTablet ? 140 : 80, 
                                elevation: 20 
                            }}
                            className="bg-primary items-center justify-center shadow-2xl shadow-primary/40 border-[10px] border-white"
                        >
                            <Text className={`text-white font-headline-bold ${isTablet ? 'text-[120px]' : 'text-[64px]'}`}>
                                {latestNumber || "--"}
                            </Text>
                        </View>
                    </View>
                )}
                ListFooterComponent={() => (
                    <View className={`mt-8 pt-12 border-t border-stone-100 ${isTablet ? 'px-12' : ''}`}>
                        <Text className={`text-stone-400 font-body-bold uppercase tracking-[4px] mb-8 text-center ${isTablet ? 'text-xl' : 'text-[10px]'}`}>Prize Pool Tracker</Text>
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
                                                    {isGlobalClosed
                                                        ? winners.length > 1 
                                                            ? `${winners.length} WINNERS CHECKED`
                                                            : `Winner: ${getParticipantName(winners[0].userId)}`
                                                        : 'Verification in progress...'}
                                                </Text>
                                            )}
                                        </View>
                                        <Text className={`font-headline-bold ${isGlobalClosed ? 'text-stone-400' : 'text-[#b30069]'} ${isTablet ? 'text-4xl' : 'text-lg'}`}>₹{individualAmount}</Text>
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
                            <View className="flex-row items-center justify-between mb-8">
                                <Text className={`font-headline-bold text-[#594048] ${isTablet ? 'text-5xl' : 'text-2xl'}`}>Claim Prize</Text>
                                <TouchableOpacity 
                                    onPress={() => setPrizesModalVisible(false)}
                                    className={`items-center justify-center rounded-full bg-stone-100 ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}
                                >
                                    <MaterialIcons name="close" size={isTablet ? 32 : 24} color="#594048" />
                                </TouchableOpacity>
                            </View>

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
                                    const winnerList = game?.winners?.[prize.id];
                                    const winners = Array.isArray(winnerList) ? winnerList : (winnerList ? [winnerList] : []);
                                    const currentCalledCount = game?.called_numbers?.length || 0;
                                    const isGlobalClosed = winners.length > 0 && winners[0].claimedOnIndex < currentCalledCount;

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

                                    const myWin = winners.find((w: any) => w.ticketId === claimingTicketId);
                                    const isMyWin = !!myWin;
                                    const dbDeniedPrizeIds = game?.winners?.['__denied']?.[claimingTicketId as string] || [];
                                    const isLocalDenied = claimingTicketId ? (deniedClaims[claimingTicketId]?.includes(prize.id) || dbDeniedPrizeIds.includes(prize.id)) : false;
                                    const isFullHousePrize = prize.name.toLowerCase().includes('full house');
                                    const isLimitReached = !isMyWin && (
                                        (isFullHousePrize && fullHouseWinsOnTicket >= 1) ||
                                        (!isFullHousePrize && standardWinsOnTicket >= 1)
                                    );

                                    let status = 'Claim';
                                    let statusColor = 'text-white';
                                    let bgColor = 'bg-[#b30069]';

                                    if (isMyWin) {
                                        status = 'Success';
                                        bgColor = 'bg-stone-100';
                                        statusColor = 'text-green-600';
                                    } else if (isGlobalClosed) {
                                        status = winners.length > 1 ? `${winners.length} Wins` : 'Closed';
                                        bgColor = 'bg-stone-50';
                                        statusColor = 'text-stone-300';
                                    } else if (isLocalDenied) {
                                        status = 'Denied';
                                        bgColor = 'bg-red-50';
                                        statusColor = 'text-red-400';
                                    } else if (isLimitReached) {
                                        status = 'Limited';
                                        bgColor = 'bg-stone-100';
                                        statusColor = 'text-stone-400';
                                    } else if (winners.length > 0) {
                                        status = 'Join Share';
                                        bgColor = 'bg-orange-500';
                                        statusColor = 'text-white';
                                    }

                                    const disableButton = isGlobalClosed || isMyWin || isLocalDenied || isLimitReached;

                                    return (
                                        <TouchableOpacity
                                            key={prize.id}
                                            onPress={() => !disableButton && handleClaimPrize(prize.id)}
                                            disabled={disableButton}
                                            className={`bg-white rounded-[28px] flex-row items-center border border-stone-100 mb-2 ${isTablet ? 'p-8' : 'p-4'} ${disableButton && !isMyWin ? 'opacity-50' : ''}`}
                                        >
                                            <View className={`${isTablet ? 'w-20 h-20' : 'w-12 h-12'} rounded-full ${(winners.length > 0 && !isGlobalClosed && !isLimitReached) ? 'bg-orange-50' : 'bg-stone-50'} items-center justify-center mr-4`}>
                                                <MaterialIcons name={prize.icon || 'stars'} size={isTablet ? 36 : 24} color={(winners.length > 0 && !isGlobalClosed && !isLimitReached) ? '#f97316' : '#b30069'} />
                                            </View>
                                            <View className="flex-1">
                                                <Text className={`text-[#31302d] font-headline-bold ${isTablet ? 'text-3xl' : 'text-base'}`}>{prize.name}</Text>
                                                <Text className={`text-stone-400 font-body-medium mt-1 ${isTablet ? 'text-lg' : 'text-xs'}`}>
                                                    {winners.length > 1 && !isLimitReached ? `Split: ₹${(prize.amount / winners.length).toFixed(0)}` : `Value: ₹${prize.amount}`}
                                                </Text>
                                            </View>
                                            <View style={{ height: isTablet ? 60 : 40, minWidth: isTablet ? 140 : 80 }} className={`px-6 items-center justify-center rounded-full ${bgColor}`}>
                                                <Text className={`font-headline-bold uppercase tracking-tight ${statusColor} ${isTablet ? 'text-xl' : 'text-[11px]'}`}>{status}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

export default HousieTicketScreen;
