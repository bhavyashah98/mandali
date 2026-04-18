import React from 'react';
import { useIsTablet } from '../../hooks/useIsTablet';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../stores/authStore';
import { fetchHousieGame, updateHousieStatus, fetchTicketById, fetchGroupDetail, API_URL } from '../../lib/api';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import { getSocket } from '../../lib/socketService';

const HousieGameScreen = () => {
    const { width } = useWindowDimensions();
    const isTablet = useIsTablet();
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

    const getParticipantName = (userId: string) => {
        const participant = game?.participants?.find((p: any) => p.id === userId);
        return participant?.name || 'Player';
    };

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
    const { data: groupData } = useQuery({
        queryKey: ['groupDetail', groupId],
        queryFn: () => fetchGroupDetail(groupId!),
        enabled: !!groupId,
    });

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
        const itemRadius = isTablet ? 12 : 6;
        const fontSize = isTablet ? 20 : 10;

        const rows: React.JSX.Element[] = [];
        for (let i = 0; i < 9; i++) {
            const row: React.JSX.Element[] = [];
            for (let j = 1; j <= 10; j++) {
                const num = i * 10 + j;
                const isCalled = calledNumbers.includes(num);
                const isCurrent = num === (calledNumbers[calledNumbers.length - 1]);
                row.push(
                    <View
                        key={num}
                        style={{ flex: 1, aspectRatio: 1, borderRadius: itemRadius, margin: isTablet ? 3 : 1.5 }}
                        className={`items-center justify-center ${isCurrent
                            ? 'bg-[#b30069]'
                            : isCalled
                                ? 'bg-[#f59e0b]'
                                : 'bg-[#f0ebe6]'
                            }`}
                    >
                        <Text 
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.3}
                            style={{ fontSize }}
                            className={`font-headline-bold text-center ${isCurrent
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
            <View className={`px-6 flex-row items-center justify-between ${isTablet ? 'py-6 px-12' : 'py-2 px-6'}`}>
                <View style={{ width: isTablet ? 64 : 44 }}>
                    <TouchableOpacity onPress={() => navigation.goBack()} className={`items-center justify-center rounded-full bg-white shadow-sm border border-stone-100 ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}>
                        <MaterialIcons name="arrow-back-ios" size={isTablet ? 28 : 18} color="#594048" style={{ marginLeft: isTablet ? 8 : 5 }} />
                    </TouchableOpacity>
                </View>
                <View className="flex-1 items-center">
                    <Text className={`text-[#a09d96] font-body-bold uppercase tracking-widest text-center ${isTablet ? 'text-lg' : 'text-[9px]'}`} numberOfLines={1}>
                        MANDALI • {groupData?.group?.name || '...'}
                    </Text>
                    <Text className={`text-[#594048] font-headline-bold ${isTablet ? 'text-4xl mt-1' : 'text-base'}`}>{gameCode}</Text>
                </View>
                <View style={{ width: isTablet ? 64 : 44 }} />
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: isTablet ? 60 : 20, paddingBottom: 60, paddingTop: 5 }}>
                {/* 1. NOW CALLING CARD */}
                <View className={`bg-white rounded-[40px] items-center shadow-2xl shadow-black/5 border border-black/5 mb-6 ${isTablet ? 'p-16' : 'p-6'}`} style={{ elevation: 8 }}>
                    <Text className={`text-stone-400 font-body-bold uppercase tracking-[3px] mb-6 ${isTablet ? 'text-2xl' : 'text-[11px]'}`}>NOW CALLING</Text>

                    <View
                        style={{ width: isTablet ? 300 : 160, height: isTablet ? 300 : 160, borderRadius: isTablet ? 150 : 120, elevation: 12 }}
                        className="bg-[#b30069] items-center justify-center shadow-2xl shadow-[#b30069]/40 border-[10px] border-[#FAF7F2] mb-8"
                    >
                        <Text
                            style={{ fontSize: isTablet ? 140 : 64, lineHeight: isTablet ? 150 : 72 }}
                            className="text-white font-headline-bold"
                            adjustsFontSizeToFit
                            numberOfLines={1}
                        >
                            {currentNumber}
                        </Text>
                    </View>

                    <View className="w-full mb-8">
                        <View className="flex-row items-center justify-center gap-4">
                            {recentNumbers.map((num, i) => (
                                <View key={i} className="items-center">
                                    <View
                                        className="rounded-full bg-[#FAF7F2] border-[3px] border-white items-center justify-center shadow-md shadow-black/10"
                                        style={{ elevation: 4, width: isTablet ? 64 : 44, height: isTablet ? 64 : 44 }}
                                    >
                                        <Text className={`text-[#594048] font-headline-bold ${isTablet ? 'text-3xl' : 'text-lg'}`}>{num}</Text>
                                    </View>
                                    <View className="w-2 h-1" />
                                </View>
                            ))}
                        </View>
                    </View>

                    {isHost && (
                        <View className="w-full gap-5 px-6">
                            <TouchableOpacity
                                onPress={() => callNumberMutation.mutate()}
                                disabled={callNumberMutation.isPending || (game?.called_numbers?.length || 0) >= 90 || endGameMutation.isPending}
                                className={`bg-[#b30069] rounded-full flex-row items-center justify-center shadow-lg shadow-[#b30069]/20 ${isTablet ? 'h-28' : 'h-14'} ${endGameMutation.isPending ? 'opacity-50' : ''}`}
                            >
                                {callNumberMutation.isPending ? (
                                    <ActivityIndicator color="white" size={isTablet ? 'large' : 'small'} />
                                ) : (
                                    <>
                                        <Ionicons name="megaphone-sharp" size={isTablet ? 36 : 20} color="white" />
                                        <Text className={`text-white font-headline-bold ml-4 ${isTablet ? 'text-4xl' : 'text-lg'}`}>Next Number</Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleEndGamePress}
                                disabled={endGameMutation.isPending}
                                className={`bg-red-50 rounded-full flex-row items-center justify-center border border-red-100 ${isTablet ? 'h-28' : 'h-14'}`}
                            >
                                {endGameMutation.isPending ? (
                                    <ActivityIndicator color="#dc2626" size={isTablet ? 'large' : 'small'} />
                                ) : (
                                    <>
                                        <MaterialIcons name="power-settings-new" size={isTablet ? 36 : 20} color="#dc2626" />
                                        <Text className={`text-[#dc2626] font-headline-bold ml-3 ${isTablet ? 'text-4xl' : 'text-lg'}`}>Game Over</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* 2. MAIN BOARD CARD */}
                <View className={`bg-white rounded-[40px] shadow-sm border border-stone-100 ${isTablet ? 'p-10' : 'p-6'}`}>
                    <Text className={`text-[#594048] font-headline-bold mb-6 ${isTablet ? 'text-4xl' : 'text-xl'}`}>Main Board</Text>
                    <View className="items-center w-full">
                        {renderBoard()}
                    </View>
                </View>

                {/* 3. BOUNTIES - Updated for Prize Splitting */}
                <View className="mt-12 px-2">
                    <Text className={`text-[#594048] font-headline-bold mb-6 ${isTablet ? 'text-4xl' : 'text-xl'}`}>Bounties</Text>
                    <View className="gap-4 pb-10">
                        {prizesArr.map((prize: any, idx: number) => (
                            <View key={idx} className={`bg-white rounded-[24px] border border-stone-100 shadow-sm mb-1 ${isTablet ? 'p-8' : 'p-4'}`}>
                                <View className="flex-row items-center justify-between">
                                    {/* Left: icon + name/amount — flex-1 so it never pushes right badge off */}
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
                                            <Text
                                                numberOfLines={1}
                                                className={`text-[#b30069] font-body-bold ${isTablet ? 'text-xl mt-1' : 'text-[11px]'}`}
                                            >
                                                {prize.winners?.length > 1 ? `Split: ₹${prize.individualAmount} each` : `₹${prize.amount}`}
                                            </Text>
                                        </View>
                                    </View>
                                    {/* Right: status badge — fixed max width so it never expands */}
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

                {/* Detailed Winners Breakdown */}
                <View className="mt-8 px-2">
                    <Text className={`text-stone-400 font-body-bold uppercase tracking-[2px] mb-6 ${isTablet ? 'text-2xl' : 'text-[10px]'}`}>Winners List</Text>
                    <View className="gap-3 pb-10">
                        {prizesArr.filter((p: any) => p.winners?.length > 0).map((prize: any, idx: number) => (
                            <View key={idx} className={`bg-white rounded-[24px] border border-stone-100 shadow-sm ${isTablet ? 'p-10' : 'p-4'}`}>
                                <View className="flex-row items-center justify-between">
                                    <View className="flex-row items-center flex-1 min-w-0 mr-2">
                                       <MaterialIcons name={prize.icon || 'stars'} size={isTablet ? 36 : 16} color="#b30069" />
                                       <Text
                                           numberOfLines={1}
                                           adjustsFontSizeToFit
                                           minimumFontScale={0.75}
                                           className={`text-[#594048] font-headline-bold ml-3 flex-1 ${isTablet ? 'text-2xl' : 'text-[13px]'}`}
                                       >{prize.name}</Text>
                                    </View>
                                    <View className={`bg-green-100 rounded-md flex-shrink-0 ${isTablet ? 'px-4 py-2' : 'px-2 py-0.5'}`}>
                                        <Text className={`text-green-700 font-body-bold ${isTablet ? 'text-xl' : 'text-[10px]'}`}>{prize.winners.length} won</Text>
                                    </View>
                                </View>
                                <Text
                                    numberOfLines={2}
                                    className={`text-stone-400 font-body-medium mt-3 ${isTablet ? 'text-xl' : 'text-[11px]'}`}
                                >
                                    {prize.winners.map((w: any) => getParticipantName(w.userId)).join(', ')}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>

            {/* Verification Modal */}
            <Modal visible={!!activeClaim} transparent animationType="fade">
                <View className={`flex-1 justify-center bg-[#594048]/90 ${isTablet ? 'px-20 py-20' : 'px-4 py-16'}`}>
                    <View className={`bg-[#FDF9F3] rounded-[40px] shadow-2xl border border-white/20 max-h-[100%] ${isTablet ? 'p-12' : 'p-6'}`}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View className="items-center mb-10">
                                <View className={`${isTablet ? 'w-24 h-24 mb-6' : 'w-16 h-16 mb-4'} rounded-full bg-white items-center justify-center shadow-sm`}>
                                    <FontAwesome5 name="trophy" size={isTablet ? 40 : 24} color="#b30069" />
                                </View>
                                <Text className={`text-stone-400 font-body-bold uppercase tracking-widest mb-2 ${isTablet ? 'text-xl' : 'text-[10px]'}`}>Claim Verification</Text>
                                {pendingCount > 1 && (
                                    <View className={`bg-orange-100 rounded-full mb-4 ${isTablet ? 'px-6 py-2' : 'px-3 py-1'}`}>
                                        <Text className={`text-orange-700 font-body-bold ${isTablet ? 'text-lg' : 'text-xs'}`}>{pendingCount - 1} more claim{pendingCount - 1 > 1 ? 's' : ''} waiting</Text>
                                    </View>
                                )}
                                <Text className={`font-headline-bold text-[#594048] text-center ${isTablet ? 'text-5xl' : 'text-2xl'}`}>{verifyingTicket?.user?.name}</Text>
                                <Text className={`text-[#b30069] font-body-bold text-center mt-2 ${isTablet ? 'text-2xl' : 'text-sm'}`}>
                                    {prizesArr.find((p: any) => p.id === activeClaim?.prizeId)?.name} • Ticket #{activeClaim?.ticketId?.slice(-4).toUpperCase()}
                                </Text>
                            </View>

                            <View 
                                style={{ width: isTablet ? '80%' : '100%', alignSelf: 'center' }}
                                className="bg-white rounded-[32px] p-4 shadow-lg shadow-black/5 border border-black/5 mb-10"
                            >
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
                                                <View key={cidx} className="flex-1 aspect-square p-1">
                                                    {num ? (
                                                        <View className={`w-full h-full rounded-xl items-center justify-center border ${cellBg} ${borderColor}`}>
                                                            <Text 
                                                                numberOfLines={1}
                                                                adjustsFontSizeToFit
                                                                minimumFontScale={0.3}
                                                                className={`font-headline-bold text-center ${isTablet ? 'text-2xl' : 'text-[10px]'} ${textColor}`}
                                                            >
                                                                {num}
                                                            </Text>
                                                        </View>
                                                    ) : (
                                                        <View className="w-full h-full rounded-xl bg-stone-50/10" />
                                                    )}
                                                </View>
                                            );
                                        })}
                                    </View>
                                ))}
                            </View>

                            <View className="mb-4">
                                <Text className={`text-center text-stone-400 font-body-bold uppercase tracking-[3px] mb-4 ${isTablet ? 'text-xl' : 'text-[10px]'}`}>Master Board Reference</Text>
                                <View 
                                    style={{ width: isTablet ? '90%' : '100%', alignSelf: 'center' }}
                                    className="items-center bg-white p-2 rounded-[24px] shadow-sm border border-stone-100"
                                >
                                    {renderBoard()}
                                </View>
                            </View>

                            <View className={`flex-row gap-6 mb-4 ${isTablet ? 'px-12' : ''}`}>
                                <TouchableOpacity 
                                    onPress={() => handleVerifyClaim('denied')} 
                                    className={`flex-1 rounded-[32px] bg-white border border-stone-200 items-center justify-center ${isTablet ? 'h-28' : 'h-14'}`}
                                >
                                    <Text className={`text-stone-400 font-headline-bold ${isTablet ? 'text-4xl' : 'text-lg'}`}>Deny</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    onPress={() => handleVerifyClaim('accepted')} 
                                    className={`flex-[1.5] rounded-[32px] bg-[#b30069] items-center justify-center shadow-lg shadow-[#b30069]/30 ${isTablet ? 'h-28' : 'h-14'}`}
                                >
                                    <Text className={`text-white font-headline-bold ${isTablet ? 'text-4xl' : 'text-lg'}`}>Approve Win</Text>
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
