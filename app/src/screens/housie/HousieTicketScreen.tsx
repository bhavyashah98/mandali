import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Dimensions, FlatList, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../../stores/authStore';
import { fetchHousieGame, joinHousieGame, fetchHousieTickets, API_URL } from '../../lib/api';
import { getSocket } from '../../lib/socketService';

const { width } = Dimensions.get('window');

const HousieTicketScreen = () => {
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

    // 1. Fetch Game State
    const { data: game } = useQuery({
        queryKey: ['housieGame', gameCode],
        queryFn: () => fetchHousieGame(gameCode),
        enabled: !!gameCode && gameCode.length >= 6,
        staleTime: 0
    });

    useEffect(() => {
        if (game?.status === 'finished') {
            setIsGameEnded(true);
        }
    }, [game?.status]);

    // 2. Fetch User's Tickets
    const { data: ticketData } = useQuery({
        queryKey: ['housieTickets', gameCode],
        queryFn: () => fetchHousieTickets(gameCode),
        enabled: !!gameCode && gameCode.length >= 6
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
            if (userId === user?.id) {
                if (status === 'accepted') {
                    Alert.alert('Congratulations!', 'Your claim has been accepted!');
                } else {
                    const msg = data.message || 'The host has denied your claim.';
                    Alert.alert('Claim Result', msg);
                }
            }
        };

        const onTicketsBought = () => {
            queryClient.invalidateQueries({ queryKey: ['housieParticipants', gameCode] });
        };

        const onGameEnded = (data: any) => {
            console.log('[Ticket] game_ended received, gameId:', game?.id);
            navigation.replace('HousieResults', {
                gameId: game?.id,
                groupId: groupId
            });
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
    }, [gameCode, navigation, groupId, game?.id]);

    // Double-Safety: Navigate via query if socket was missed
    useEffect(() => {
        if (game?.status === 'finished' && game?.id) {
            console.log('[Ticket] Query fallback: game finished, redirecting...');
            navigation.replace('HousieResults', { 
                gameId: game.id, 
                groupId: groupId 
            });
        }
    }, [game?.status, game?.id]);

    const toggleMark = (ticketId: string, num: number) => {
        if (isGameEnded) return;
        setMarkedTickets(prev => {
            const ticketMarks = prev[ticketId] || [];
            if (ticketMarks.includes(num)) {
                return { ...prev, [ticketId]: ticketMarks.filter(n => n !== num) };
            } else {
                return { ...prev, [ticketId]: [...ticketMarks, num] };
            }
        });
    };

    const tickets = ticketData?.tickets || [];
    const isJoined = tickets.length > 0;
    const calledNumbers = game?.called_numbers || [];
    const latestNumber = calledNumbers[calledNumbers.length - 1];

    if (!isJoined) {
        return (
            <SafeAreaView className="flex-1 bg-background">
                <View className="px-8 mt-12 flex-1 justify-center">
                    <Text className="text-primary font-headline-bold text-[42px] leading-[48px] mb-4">Join the{"\n"}Gathering</Text>
                    <Text className="text-on-surface-variant font-body-medium text-lg mb-10">Enter the code to grab your tickets and start playing.</Text>

                    <View className="gap-6">
                        <View>
                            <Text className="text-[#594048] font-body-bold text-xs uppercase tracking-widest mb-3 ml-2">Game Code</Text>
                            <TextInput
                                value={gameCode}
                                onChangeText={setGameCode}
                                placeholder="E.g. MB-4029"
                                placeholderTextColor="#a09d96"
                                className="bg-white h-16 rounded-[24px] px-6 text-xl font-headline-bold text-on-surface shadow-sm border border-stone-100"
                                autoCapitalize="characters"
                            />
                        </View>

                        <View>
                            <Text className="text-[#594048] font-body-bold text-xs uppercase tracking-widest mb-3 ml-2">Number of Tickets</Text>
                            <View className="flex-row items-center bg-white h-16 rounded-[24px] px-4 shadow-sm border border-stone-100">
                                <TouchableOpacity
                                    onPress={() => setTicketCount(Math.max(1, parseInt(ticketCount) - 1).toString())}
                                    className="w-10 h-10 items-center justify-center bg-stone-50 rounded-full"
                                >
                                    <MaterialIcons name="remove" size={20} color="#b30069" />
                                </TouchableOpacity>
                                <TextInput
                                    value={ticketCount}
                                    onChangeText={setTicketCount}
                                    keyboardType="number-pad"
                                    className="flex-1 text-center text-xl font-headline-bold text-on-surface"
                                />
                                <TouchableOpacity
                                    onPress={() => setTicketCount((parseInt(ticketCount) + 1).toString())}
                                    className="w-10 h-10 items-center justify-center bg-stone-50 rounded-full"
                                >
                                    <MaterialIcons name="add" size={20} color="#b30069" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity
                        onPress={() => buyTicketsMutation.mutate()}
                        disabled={buyTicketsMutation.isPending || !gameCode}
                        className="bg-primary h-16 rounded-[24px] mt-12 flex-row items-center justify-center shadow-lg shadow-primary/30"
                    >
                        {buyTicketsMutation.isPending ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <MaterialIcons name="local-activity" size={24} color="white" />
                                <Text className="text-white font-headline-bold text-lg ml-3">Buy {ticketCount} Tickets • ₹{parseInt(ticketCount) * 50}</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const renderTicket = ({ item: ticket }: { item: any }) => (
        <View className="mb-6 w-full">
            <View className="flex-row items-center justify-between mb-3 px-2">
                <Text className="text-stone-400 font-body-bold text-[9px] uppercase tracking-widest">TICKET #{ticket.id.slice(-4).toUpperCase()}</Text>
                <TouchableOpacity
                    onPress={() => {
                        setClaimingTicketId(ticket.id);
                        setPrizesModalVisible(true);
                    }}
                    className="flex-row items-center bg-primary/10 px-3 py-1.5 rounded-full"
                >
                    <FontAwesome5 name="trophy" size={10} color="#b30069" />
                    <Text className="text-primary font-headline-bold text-[10px] ml-2 uppercase tracking-tight">Claim Prize</Text>
                </TouchableOpacity>
            </View>
            <View className="bg-white rounded-[24px] p-2.5 shadow-lg shadow-black/5 border border-black/5">
                {ticket.ticket_data.map((row: any[], rIdx: number) => (
                    <View key={rIdx} className="flex-row">
                        {row.map((num: number | null, cIdx: number) => (
                            <View key={cIdx} className="flex-1 aspect-square p-0.5">
                                {num ? (
                                    <TouchableOpacity
                                        onPress={() => toggleMark(ticket.id, num)}
                                        className={`w-full h-full rounded-md items-center justify-center border ${(markedTickets[ticket.id] || []).includes(num) ? 'bg-primary border-primary' : 'bg-stone-50 border-stone-100'}`}
                                    >
                                        <Text className={`font-headline-bold text-xs ${(markedTickets[ticket.id] || []).includes(num) ? 'text-white' : 'text-on-surface'}`}>
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
    );

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
                    <View className="mb-10 mt-4 items-center">
                        <Text className="text-stone-400 font-body-bold text-[11px] uppercase tracking-[3px] mb-6">NOW CALLING</Text>
                        <View
                            className="w-36 h-36 rounded-full bg-primary items-center justify-center shadow-2xl shadow-primary/40 border-[10px] border-white"
                            style={{ elevation: 12 }}
                        >
                            <Text className="text-white text-[56px] font-headline-bold">
                                {latestNumber || "--"}
                            </Text>
                        </View>
                    </View>
                )}
                ListFooterComponent={() => (
                    <View className="mt-4 pt-10 border-t border-stone-100">
                        <Text className="text-stone-400 font-body-bold text-[9px] uppercase tracking-[2px] mb-6 text-center">Prize Reference</Text>
                        <View className="gap-2">
                            {(game?.prizes || []).map((prize: any) => {
                                const winners = Array.isArray(game?.winners?.[prize.id]) ? game?.winners?.[prize.id] : (game?.winners?.[prize.id] ? [game?.winners?.[prize.id]] : []);
                                const isClaimed = winners.length > 0;
                                const individualAmount = isClaimed ? (prize.amount / winners.length).toFixed(0) : prize.amount;

                                return (
                                    <View key={prize.id} className="flex-row items-center py-2 px-4 bg-white/50 rounded-xl mb-1">
                                        <MaterialIcons name={prize.icon || 'stars'} size={16} color="#b30069" style={{ opacity: 0.6 }} />
                                        <View className="flex-1 ml-3">
                                            <Text className="text-[#594048] font-body-bold text-xs">{prize.name}</Text>
                                            {winners.length > 1 && <Text className="text-stone-400 text-[8px] uppercase">Shared Win • {winners.length} Players</Text>}
                                        </View>
                                        <Text className="text-primary font-headline-bold text-xs">₹{individualAmount}</Text>
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
                            {(game?.prizes || []).map((prize: any) => {
                                const winnerList = game?.winners?.[prize.id];
                                const winners = Array.isArray(winnerList) ? winnerList : (winnerList ? [winnerList] : []);
                                const isGlobalClaimed = winners.length > 0;
                                
                                // Check if user is one of the winners
                                const myWin = winners.find((w: any) => w.userId === user?.id);
                                const isMyWin = !!myWin;
                                const isLocalDenied = claimingTicketId ? deniedClaims[claimingTicketId]?.includes(prize.id) : false;

                                let status = 'Claim';
                                let statusColor = 'text-white';
                                let bgColor = 'bg-[#b30069]';

                                if (isGlobalClaimed) {
                                    if (isMyWin) {
                                        status = 'You Won';
                                        bgColor = 'bg-green-100';
                                        statusColor = 'text-green-700';
                                    } else {
                                        status = 'Claimed';
                                        bgColor = 'bg-stone-50';
                                        statusColor = 'text-stone-400';
                                    }
                                } else if (isLocalDenied) {
                                    status = 'Rejected';
                                    bgColor = 'bg-red-50';
                                    statusColor = 'text-red-400';
                                }

                                return (
                                    <TouchableOpacity 
                                        key={prize.id}
                                        onPress={() => !isGlobalClaimed && !isLocalDenied && handleClaimPrize(prize.id)}
                                        disabled={isGlobalClaimed || isLocalDenied}
                                        className={`bg-white p-4 rounded-[24px] flex-row items-center shadow-sm border border-stone-100 ${isGlobalClaimed && !isMyWin ? 'opacity-50' : ''}`}
                                    >
                                        <View className="w-12 h-12 rounded-full bg-stone-50 items-center justify-center mr-4">
                                            <MaterialIcons name={prize.icon || 'stars'} size={24} color="#b30069" />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-[#594048] font-headline-bold text-base">{prize.name}</Text>
                                            <Text className="text-stone-400 font-body-medium text-xs">
                                                {winners.length > 1 ? `Split: ₹${(prize.amount/winners.length).toFixed(0)}` : `Prize: ₹${prize.amount}`}
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
