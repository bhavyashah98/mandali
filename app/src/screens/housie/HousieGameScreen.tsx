import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../stores/authStore';
import { fetchHousieGame, updateHousieStatus, fetchTicketById, API_URL } from '../../lib/api';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import { getSocket } from '../../lib/socketService';

const { width } = Dimensions.get('window');

const HousieGameScreen = () => {
    const route = useRoute();
    const navigation = useNavigation<any>();
    const queryClient = useQueryClient();
    const { user } = useAuthStore();

    // Normalize params
    const params = route.params as { gameCode: string; groupId: string };
    const gameCode = params?.gameCode?.trim().toUpperCase() || '';
    const groupId = params?.groupId;

    const [socket, setSocket] = React.useState<any>(null);
    const [claimsQueue, setClaimsQueue] = React.useState<any[]>([]);
    const [verifyingTicket, setVerifyingTicket] = React.useState<any>(null);

    // The current claim being reviewed is always the first in the queue
    const activeClaim = claimsQueue[0] || null;
    const pendingCount = claimsQueue.length;

    // 1. Fetch live game data
    const { data: game, isLoading } = useQuery({
        queryKey: ['housieGame', gameCode],
        queryFn: () => fetchHousieGame(gameCode),
        enabled: !!gameCode,
        staleTime: 0,
        refetchOnMount: 'always'
    });

    // Hydrate pending claims queue from DB when game data loads (handles host re-open)
    React.useEffect(() => {
        if (!game?.winners?.['__pending'] || !user?.id || game?.host_id !== user?.id) return;
        const pending: any[] = game.winners['__pending'];
        if (pending.length === 0) return;

        // Only hydrate if queue is currently empty (avoid double-adding on re-renders)
        setClaimsQueue(prev => {
            if (prev.length > 0) return prev; // Already has live socket claims, don't overwrite
            return []; // Will be populated below
        });

        // Fetch ticket data for each pending claim and rebuild the queue
        Promise.all(
            pending.map(async (claim: any) => {
                try {
                    const ticket = await fetchTicketById(claim.ticketId);
                    return { ...claim, ticket };
                } catch {
                    return null;
                }
            })
        ).then(resolved => {
            const valid = resolved.filter(Boolean);
            if (valid.length > 0) {
                setClaimsQueue(prev => {
                    // Don't overwrite if live socket claims came in while we were fetching
                    if (prev.length > 0) return prev;
                    return valid;
                });
            }
        });
    }, [game?.winners?.['__pending']?.length, game?.host_id, user?.id]);

    // 2. Socket Integration
    React.useEffect(() => {
        if (!gameCode) return;

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

        const onNewClaim = async (data: any) => {
            if (user?.id === game?.host_id) {
                try {
                    const ticket = await fetchTicketById(data.ticketId);
                    setClaimsQueue(prev => [...prev, { ...data, ticket }]);
                } catch (e) {
                    console.error('Failed to load claiming ticket', e);
                }
            }
        };

        const onClaimResult = () => {
            queryClient.invalidateQueries({ queryKey: ['housieGame', gameCode] });
        };

        socket.on('number_called', onNumberCalled);
        socket.on('new_claim', onNewClaim);
        socket.on('claim_result', onClaimResult);

        return () => {
            socket.off('number_called', onNumberCalled);
            socket.off('new_claim', onNewClaim);
            socket.off('claim_result', onClaimResult);
        };
    }, [gameCode, game?.host_id]);

    // When activeClaim changes, load its ticket into verifyingTicket
    React.useEffect(() => {
        if (activeClaim?.ticket) {
            setVerifyingTicket(activeClaim.ticket);
        } else {
            setVerifyingTicket(null);
        }
    }, [activeClaim?.ticketId]);

    const handleVerifyClaim = (status: 'accepted' | 'denied') => {
        if (!socket || !activeClaim) return;

        socket.emit('verify_claim', {
            gameCode,
            prizeId: activeClaim.prizeId,
            userId: activeClaim.userId,
            ticketId: activeClaim.ticketId,
            claimedOnIndex: activeClaim.claimedOnIndex,
            status
        });

        // Dequeue the current claim → next one automatically becomes active
        setClaimsQueue(prev => prev.slice(1));
    };

    const callNumberMutation = useMutation({
        mutationFn: async () => {
            const token = await AsyncStorage.getItem('mandali_token');
            const response = await axios.post(`${API_URL}/housie/${gameCode}/call`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data;
        },
        onSuccess: (data) => {
            if (data.success && data.game) {
                queryClient.setQueryData(['housieGame', gameCode], data.game);
            }
        },
        onError: (err: any) => {
            Alert.alert('Error', err.response?.data?.error || 'Failed to call number');
        }
    });

    const endGameMutation = useMutation({
        mutationFn: () => updateHousieStatus(gameCode, 'ended'),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['activeHousieGame', groupId] });
            await queryClient.invalidateQueries({ queryKey: ['housieGame', gameCode] });
            navigation.replace('HousieResults', {
                gameCode: gameCode,
                groupId: groupId
            });
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.error || err?.message || 'Failed to end session.';
            Alert.alert('Error ending game', msg);
        }
    });

    const handleEndGamePress = () => {
        Alert.alert('End Game?', 'Are you sure you want to finish this session?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Finish Game',
                style: 'destructive',
                onPress: () => endGameMutation.mutate()
            }
        ]);
    };

    const calledNumbers = game?.called_numbers || [];
    const currentNumber = calledNumbers[calledNumbers.length - 1] || '--';
    const recentNumbers = [...calledNumbers].reverse().slice(1, 4);
    const isHost = game?.host_id === user?.id;

    const prizesArr = (game?.prizes || []).map((p: any) => {
        const winnerList = game?.winners?.[p.id];
        const winners = Array.isArray(winnerList) ? winnerList : (winnerList ? [winnerList] : []);
        const isClaimed = winners.length > 0;
        const individualAmount = isClaimed ? (p.amount / winners.length).toFixed(0) : p.amount;

        return {
            ...p,
            status: isClaimed ? 'CLAIMED' : 'OPEN',
            winners,
            individualAmount
        };
    });

    const renderBoard = () => {
        const rows = [];
        for (let i = 0; i < 9; i++) {
            const row = [];
            for (let j = 1; j <= 10; j++) {
                const num = i * 10 + j;
                const isCalled = calledNumbers.includes(num);
                const isCurrent = num === (calledNumbers[calledNumbers.length - 1]);
                row.push(
                    <View
                        key={num}
                        className={`w-[26px] h-[26px] rounded-md items-center justify-center m-[3px] ${isCurrent
                                ? 'bg-[#b30069]'
                                : isCalled
                                    ? 'bg-[#f59e0b]'
                                    : 'bg-[#f0ebe6]'
                            }`}
                    >
                        <Text className={`text-[10px] font-headline-bold ${isCurrent
                                ? 'text-white'
                                : isCalled
                                    ? 'text-white'
                                    : 'text-[#b0a09a]'
                            }`}>
                            {num}
                        </Text>
                    </View>
                );
            }
            rows.push(<View key={i} className="flex-row justify-between w-full">{row}</View>);
        }
        return rows;
    };

    if (isLoading) return <ActivityIndicator size="large" className="flex-1" color="#b30069" />;

    return (
        <SafeAreaView className="flex-1 bg-[#FDF9F3]" edges={['top']}>
            {/* Header */}
            <View className="px-6 py-2 flex-row items-center justify-between">
                <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 items-center justify-center rounded-full bg-white shadow-sm border border-stone-100">
                    <MaterialIcons name="arrow-back-ios" size={18} color="#594048" style={{ marginLeft: 5 }} />
                </TouchableOpacity>
                <View className="items-center">
                    <Text className="text-[#a09d96] font-body-bold text-[9px] uppercase tracking-widest">HOUSIE SESSION</Text>
                    <Text className="text-[#594048] font-headline-bold text-base">{gameCode}</Text>
                </View>
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 5 }}>
                {/* 1. NOW CALLING CARD */}
                <View className="bg-white rounded-[40px] p-6 items-center shadow-2xl shadow-black/5 border border-black/5 mb-4" style={{ elevation: 8 }}>
                    <Text className="text-stone-400 font-body-bold text-[11px] uppercase tracking-[3px] mb-4">NOW CALLING</Text>

                    <View
                        className="w-40 h-40 rounded-full bg-[#b30069] items-center justify-center shadow-2xl shadow-[#b30069]/40 border-[10px] border-[#FAF7F2] mb-6"
                        style={{ elevation: 12 }}
                    >
                        <Text
                            style={{ fontSize: 64, lineHeight: 72 }}
                            className="text-white font-headline-bold"
                            adjustsFontSizeToFit
                            numberOfLines={1}
                        >
                            {currentNumber}
                        </Text>
                    </View>

                    <View className="w-full mb-6">
                        <View className="flex-row items-center justify-center gap-3">
                            {recentNumbers.map((num, i) => (
                                <View key={i} className="items-center">
                                    <View
                                        className="w-11 h-11 rounded-full bg-[#FAF7F2] border-[3px] border-white items-center justify-center shadow-md shadow-black/10"
                                        style={{ elevation: 4 }}
                                    >
                                        <Text className="text-[#594048] font-headline-bold text-lg">{num}</Text>
                                    </View>
                                    <View className="w-2 h-1" />
                                </View>
                            ))}
                        </View>
                    </View>

                    {isHost && (
                        <View className="w-full gap-3 px-6">
                            <TouchableOpacity
                                onPress={() => callNumberMutation.mutate()}
                                disabled={callNumberMutation.isPending || (game?.called_numbers?.length || 0) >= 90 || endGameMutation.isPending}
                                className={`bg-[#b30069] h-14 rounded-full flex-row items-center justify-center shadow-lg shadow-[#b30069]/20 ${endGameMutation.isPending ? 'opacity-50' : ''}`}
                            >
                                {callNumberMutation.isPending ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <>
                                        <Ionicons name="megaphone-sharp" size={20} color="white" />
                                        <Text className="text-white font-headline-bold text-lg ml-3">Next Number</Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleEndGamePress}
                                disabled={endGameMutation.isPending}
                                className="bg-red-50 h-14 rounded-full flex-row items-center justify-center border border-red-100"
                            >
                                {endGameMutation.isPending ? (
                                    <ActivityIndicator color="#dc2626" />
                                ) : (
                                    <>
                                        <MaterialIcons name="power-settings-new" size={20} color="#dc2626" />
                                        <Text className="text-[#dc2626] font-headline-bold text-lg ml-2">Game Over</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* 2. MAIN BOARD CARD */}
                <View className="bg-white rounded-[40px] p-6 shadow-sm border border-stone-100">
                    <Text className="text-[#594048] font-headline-bold text-xl mb-6">Main Board</Text>
                    <View className="items-center w-full">
                        {renderBoard()}
                    </View>
                </View>

                {/* 3. BOUNTIES - Updated for Prize Splitting */}
                <View className="mt-8 px-2">
                    <Text className="text-[#594048] font-headline-bold text-xl mb-4">Bounties</Text>
                    <View className="gap-3 pb-10">
                        {prizesArr.map((prize: any, idx: number) => (
                            <View key={idx} className="bg-white rounded-[20px] p-4 border border-stone-100 shadow-sm mb-1">
                                <View className="flex-row items-center justify-between mb-1">
                                    <View className="flex-row items-center">
                                        <View className="w-10 h-10 rounded-xl bg-stone-50 items-center justify-center mr-3">
                                            <MaterialIcons name={prize.icon as any || 'stars'} size={20} color="#b30069" />
                                        </View>
                                        <View>
                                            <Text className="text-[#594048] font-headline-bold text-base">{prize.name}</Text>
                                            <Text className="text-[#b30069] font-body-bold text-[12px]">
                                                {prize.winners?.length > 1 ? `Split: ₹${prize.individualAmount} each` : `₹${prize.amount}`}
                                            </Text>
                                        </View>
                                    </View>
                                    <View className={`px-3 py-1.5 rounded-full ${prize.status === 'CLAIMED' ? 'bg-green-100' : 'bg-stone-50'}`}>
                                        <Text className={`text-[9px] font-body-bold tracking-widest uppercase ${prize.status === 'CLAIMED' ? 'text-green-700' : 'text-stone-400'}`}>
                                            {prize.winners?.length > 1 ? `${prize.winners.length} WINNERS` : prize.status}
                                        </Text>
                                    </View>
                                </View>

                                {prize.winners?.length > 0 && (
                                    <View className="mt-2 pt-2 border-t border-stone-50">
                                        <Text className="text-[10px] text-stone-400 font-body-medium">Winners: {prize.winners.map((w: any) => `Ticket #${w.ticketId?.slice(-4).toUpperCase()}`).join(', ')}</Text>
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>

            {/* Verification Modal */}
            <Modal visible={!!activeClaim} transparent animationType="fade">
                <View className="flex-1 justify-center py-16 bg-[#594048]/90 px-4">
                    <View className="bg-[#FDF9F3] rounded-[40px] p-6 shadow-2xl border border-white/20 max-h-[100%]">
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View className="items-center mb-6">
                                <View className="w-16 h-16 rounded-full bg-white items-center justify-center mb-4 shadow-sm">
                                    <FontAwesome5 name="trophy" size={24} color="#b30069" />
                                </View>
                                <Text className="text-stone-400 font-body-bold text-[10px] uppercase tracking-widest mb-1">Claim Verification</Text>
                                {pendingCount > 1 && (
                                    <View className="bg-orange-100 px-3 py-1 rounded-full mb-2">
                                        <Text className="text-orange-700 font-body-bold text-xs">{pendingCount - 1} more claim{pendingCount - 1 > 1 ? 's' : ''} waiting</Text>
                                    </View>
                                )}
                                <Text className="text-2xl font-headline-bold text-[#594048] text-center">{verifyingTicket?.user?.name}</Text>
                                <Text className="text-[#b30069] font-body-bold text-center mt-1 text-sm">
                                    {prizesArr.find((p: any) => p.id === activeClaim?.prizeId)?.name} • Ticket #{activeClaim?.ticketId?.slice(-4).toUpperCase()}
                                </Text>
                            </View>

                            <View className="bg-white rounded-[24px] p-2.5 shadow-lg shadow-black/5 border border-black/5 mb-6">
                                {verifyingTicket?.ticket_data?.map((row: any[], ridx: number) => (
                                    <View key={ridx} className="flex-row">
                                        {row.map((num, cidx) => {
                                            const isMarked = num && activeClaim?.markedNumbers?.includes(num);
                                            const isCalled = num && calledNumbers.includes(num);
                                            let cellBg = 'bg-stone-50';
                                            let borderColor = 'border-stone-100';
                                            let textColor = 'text-[#594048]';

                                            if (num && isMarked) {
                                                if (isCalled) {
                                                    cellBg = 'bg-[#b30069]';
                                                    borderColor = 'border-[#b30069]';
                                                    textColor = 'text-white';
                                                } else {
                                                    cellBg = 'bg-red-500';
                                                    borderColor = 'border-red-500';
                                                    textColor = 'text-white';
                                                }
                                            }

                                            return (
                                                <View key={cidx} className="flex-1 aspect-square p-0.5">
                                                    {num ? (
                                                        <View className={`w-full h-full rounded-md items-center justify-center border ${cellBg} ${borderColor}`}>
                                                            <Text className={`font-headline-bold text-[10px] ${textColor}`}>
                                                                {num}
                                                            </Text>
                                                        </View>
                                                    ) : (
                                                        <View className="w-full h-full rounded-md bg-stone-50/10" />
                                                    )}
                                                </View>
                                            );
                                        })}
                                    </View>
                                ))}
                            </View>

                            <View className="mb-6">
                                <Text className="text-center text-stone-400 font-body-bold text-[10px] uppercase tracking-[3px] mb-3">Master Board Reference</Text>
                                <View className="items-center bg-white p-4 rounded-[24px] shadow-sm border border-stone-100 w-full">
                                    {renderBoard()}
                                </View>
                            </View>

                            <View className="flex-row gap-4 mb-2">
                                <TouchableOpacity onPress={() => handleVerifyClaim('denied')} className="flex-1 h-14 rounded-[24px] bg-white border border-stone-200 items-center justify-center">
                                    <Text className="text-stone-400 font-headline-bold text-lg">Deny</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleVerifyClaim('accepted')} className="flex-[1.5] h-14 rounded-[24px] bg-[#b30069] items-center justify-center shadow-lg shadow-[#b30069]/30">
                                    <Text className="text-white font-headline-bold text-lg">Approve Win</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

export default HousieGameScreen;
