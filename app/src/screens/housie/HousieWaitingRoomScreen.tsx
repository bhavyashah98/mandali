import React, { useEffect, useState } from 'react';
import { useIsTablet } from '../../hooks/useIsTablet';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert, Image, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchHousieGame, joinHousieGame, API_URL, getAuthHeaders, updateHousieStatus, fetchGroupDetail } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { getSocket } from '../../lib/socketService';
import axios from 'axios';

const HousieWaitingRoomScreen = () => {
    const { width } = useWindowDimensions();
    const isTablet = useIsTablet();
    const navigation = useNavigation<any>();
    const route = useRoute();
    const queryClient = useQueryClient();
    const { gameCode, groupId } = (route.params as { gameCode: string; groupId: string }) || {};
    const { user } = useAuthStore();

    const [buyCount, setBuyCount] = useState(1);
    const [isBuying, setIsBuying] = useState(false);

    // Fetch once on mount — socket handles all subsequent state changes
    const { data: game } = useQuery({
        queryKey: ['housieGame', gameCode],
        queryFn: () => fetchHousieGame(gameCode!),
        staleTime: Infinity,        // Never silently refetch — socket is the source of truth
        refetchOnWindowFocus: false // Don't refetch when user switches apps/tabs
    });

    // Fetch Group Detail for Header Branding
    const { data: groupData } = useQuery({
        queryKey: ['groupDetail', groupId],
        queryFn: () => fetchGroupDetail(groupId!),
        enabled: !!groupId,
    });

    const fetchParticipants = async () => {
        const headers = await getAuthHeaders();
        const response = await axios.get(`${API_URL}/housie/${gameCode}/participants`, { headers });
        return response.data;
    };

    const { data: stats } = useQuery({
        queryKey: ['housieParticipants', gameCode],
        queryFn: fetchParticipants,
        staleTime: 30_000,          // Cache for 30s — socket invalidates on new ticket buys
        refetchOnWindowFocus: false
    });

    const isHost = game?.host_id === user?.id;

    // Ref so the socket callback always reads the latest isHost without stale closure
    const isHostRef = React.useRef(false);
    isHostRef.current = isHost;

    useEffect(() => {
        const socket = getSocket();
        socket.emit('join_game', gameCode);

        const onTicketsBought = () => {
            queryClient.invalidateQueries({ queryKey: ['housieParticipants', gameCode] });
        };

        const onGameActivated = () => {
            if (isHostRef.current) return;
            navigation.replace('HousieTicket', { gameCode, groupId });
        };

        socket.on('tickets_bought', onTicketsBought);
        socket.on('game_activated', onGameActivated);

        return () => {
            socket.off('tickets_bought', onTicketsBought);
            socket.off('game_activated', onGameActivated);
        };
    }, [gameCode]);

    const handleStartGame = async () => {
        navigation.navigate('HousieDefineBounty', { gameCode, groupId });
    };

    const handleBuyTickets = async () => {
        const myTickets = stats?.participants?.find((p: any) => p.id === user?.id)?.ticketCount || 0;
        if (myTickets + buyCount > 6) {
            Alert.alert('Limit Reached', 'You can have at most 6 tickets total.');
            return;
        }

        try {
            setIsBuying(true);
            const response = await joinHousieGame(gameCode!, buyCount);
            if (response.success) {
                Alert.alert('🎟️ Tickets Bought!', `You now have ${buyCount} ticket${buyCount > 1 ? 's' : ''}!`);
                queryClient.invalidateQueries({ queryKey: ['housieParticipants', gameCode] });
                queryClient.invalidateQueries({ queryKey: ['housieTickets', gameCode] });
                setBuyCount(1);
            }
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to buy tickets');
        } finally {
            setIsBuying(false);
        }
    };

    if (!user) {
        return (
            <SafeAreaView className="flex-1 bg-[#fdf9f3] items-center justify-center">
                <ActivityIndicator size="large" color="#b30069" />
            </SafeAreaView>
        );
    }

    const renderParticipant = ({ item }: { item: any }) => (
        <View className={`flex-row items-center bg-white border border-stone-100 shadow-sm mb-4 ${isTablet ? 'rounded-[32px] p-8' : 'rounded-[24px] p-4'}`}>
            <View className={`rounded-full bg-stone-50 items-center justify-center overflow-hidden ${isTablet ? 'w-24 h-24' : 'w-12 h-12'}`}>
                {item.avatar ? (
                    <Image source={{ uri: item.avatar }} className="w-full h-full" />
                ) : (
                    <Text className={`text-primary font-headline-bold ${isTablet ? 'text-5xl' : 'text-lg'}`}>{item.name[0]}</Text>
                )}
            </View>
            <View className="ml-6 flex-1">
                <Text className={`font-headline-bold text-[#594048] ${isTablet ? 'text-3xl' : 'text-base'}`}>{item.name}</Text>
                <Text className={`text-stone-400 font-body-medium ${isTablet ? 'text-xl mt-1' : 'text-xs'}`}>{item.ticketCount} Tickets Bought</Text>
            </View>
            <View className={`bg-primary/5 rounded-full ${isTablet ? 'px-6 py-3' : 'px-3 py-1.5'}`}>
                <Text className={`text-primary font-headline-bold ${isTablet ? 'text-2xl' : 'text-sm'}`}>₹{item.ticketCount * (stats?.ticketPrice || 0)}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top', 'bottom']}>
            {/* Header */}
            <View className={`px-6 flex-row items-center justify-between ${isTablet ? 'py-8 px-12' : 'py-4 px-6'}`}>
                <View style={{ width: isTablet ? 64 : 44 }}>
                    <TouchableOpacity onPress={() => navigation.goBack()} className={`items-center justify-center rounded-full bg-white shadow-sm border border-stone-100 ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}>
                        <MaterialIcons name="arrow-back-ios" size={isTablet ? 28 : 18} color="#594048" style={{ marginLeft: isTablet ? 8 : 5 }} />
                    </TouchableOpacity>
                </View>
                <View className="flex-1 items-center">
                    <Text className={`text-stone-400 font-body-bold uppercase tracking-[3px] text-center ${isTablet ? 'text-lg' : 'text-[9px]'}`} numberOfLines={1}>
                        MANDALI • {groupData?.group?.name || '...'}
                    </Text>
                    <Text className={`text-[#1c1c18] font-headline-bold ${isTablet ? 'text-4xl mt-1' : 'text-lg'}`}>Waiting Room</Text>
                </View>
                {isHost ? (
                    <TouchableOpacity
                        onPress={() => {
                            Alert.alert('Cancel Game', 'Are you sure you want to cancel this game?', [
                                { text: 'No', style: 'cancel' },
                                {
                                    text: 'Yes, Cancel',
                                    style: 'destructive',
                                    onPress: async () => {
                                        try {
                                            await updateHousieStatus(gameCode, 'ended');
                                            await queryClient.invalidateQueries({ queryKey: ['activeHousieGame', groupId] });
                                            navigation.goBack();
                                        } catch (err) {
                                            Alert.alert('Error', 'Failed to cancel game');
                                        }
                                    }
                                }
                            ]);
                        }}
                        className={`items-center justify-center rounded-full bg-red-50 ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}
                    >
                        <MaterialIcons name="delete-outline" size={isTablet ? 36 : 24} color="#ef4444" />
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: isTablet ? 64 : 44 }} />
                )}
            </View>

            <FlatList
                data={stats?.participants || []}
                renderItem={renderParticipant}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingHorizontal: isTablet ? 64 : 24, paddingTop: isTablet ? 32 : 12, paddingBottom: isTablet ? 250 : 180 }}
                ListHeaderComponent={
                    <View>
                        {/* Game Code Card - Optimized size for tablet */}
                        <View className={`bg-[#b30069] rounded-[48px] items-center shadow-2xl shadow-[#b30069]/20 mb-10 ${isTablet ? 'p-12' : 'p-8'}`} style={{ elevation: 12 }}>
                            <Text className={`text-white/70 font-body-bold uppercase tracking-[4px] mb-4 ${isTablet ? 'text-xl' : 'text-[10px]'}`}>JOINING CODE</Text>
                            <Text
                                className="text-white font-headline-bold tracking-[8px]"
                                style={{ fontSize: isTablet ? 90 : 52 }}
                                adjustsFontSizeToFit
                                numberOfLines={1}
                            >{gameCode}</Text>
                            <View className={`flex-row items-center bg-white/20 rounded-full ${isTablet ? 'mt-8 px-8 py-4' : 'mt-6 px-6 py-3'}`}>
                                <FontAwesome5 name="ticket-alt" size={isTablet ? 24 : 16} color="white" />
                                <Text className={`text-white font-headline-bold ml-4 ${isTablet ? 'text-2xl' : 'text-lg'}`}>₹{stats?.ticketPrice} / Ticket</Text>
                            </View>
                        </View>

                        {/* Prize Pool Display */}
                        <View className={`bg-white rounded-[40px] border border-stone-100 items-center shadow-sm ${isTablet ? 'p-16' : 'p-8'}`}>
                            <Text className={`text-stone-400 font-body-bold uppercase tracking-[2px] mb-2 ${isTablet ? 'text-xl' : 'text-[10px]'}`}>Total Prize Pool</Text>
                            <Text className={`font-headline-bold text-[#594048] ${isTablet ? 'text-8xl' : 'text-5xl'}`}>₹{stats?.totalPrizePool || 0}</Text>
                            <View className={`w-full bg-stone-100 my-10 ${isTablet ? 'h-[2px]' : 'h-[1px]'}`} />
                            <View className={`flex-row justify-between w-full ${isTablet ? 'px-16' : 'px-4'}`}>
                                <View className="items-center">
                                    <Text className={`text-stone-400 uppercase font-body-bold mb-2 ${isTablet ? 'text-lg' : 'text-[9px]'}`}>Players</Text>
                                    <Text className={`font-headline-bold text-primary ${isTablet ? 'text-5xl' : 'text-xl'}`}>{stats?.participants?.length || 0}</Text>
                                </View>
                                <View className="items-center">
                                    <Text className={`text-stone-400 uppercase font-body-bold mb-2 ${isTablet ? 'text-lg' : 'text-[9px]'}`}>Tickets</Text>
                                    <Text className={`font-headline-bold text-primary ${isTablet ? 'text-5xl' : 'text-xl'}`}>{stats?.totalTickets || 0}</Text>
                                </View>
                            </View>
                        </View>

                        <Text className={`text-stone-400 font-body-bold uppercase tracking-[2px] mt-16 mb-8 px-4 ${isTablet ? 'text-3xl' : 'text-xs'}`}>Participants List</Text>
                    </View>
                }
                ListEmptyComponent={() => (
                    <View className="items-center justify-center py-20">
                        <ActivityIndicator color="#b30069" size={isTablet ? 'large' : 'small'} />
                        <Text className={`text-stone-400 font-body-medium mt-6 ${isTablet ? 'text-3xl' : 'text-base'}`}>Waiting for players to join...</Text>
                    </View>
                )}
                showsVerticalScrollIndicator={false}
            />

            {/* Action Footer */}
            <View className={`absolute bottom-0 left-0 right-0 bg-[#fdf9f3]/95 border-t border-stone-100 ${isTablet ? 'p-16' : 'p-8'}`}>
                {isHost ? (
                    <TouchableOpacity
                        onPress={handleStartGame}
                        disabled={(stats?.totalTickets || 0) === 0}
                        activeOpacity={0.9}
                        className={`rounded-[40px] flex-row items-center justify-center shadow-2xl shadow-primary/30 ${isTablet ? 'h-28' : 'h-20'} ${(stats?.totalTickets || 0) === 0 ? 'bg-primary/50' : 'bg-primary'}`}
                    >
                        <Ionicons name="trophy" size={isTablet ? 36 : 26} color="white" />
                        <Text className={`text-white font-headline-bold ml-4 ${isTablet ? 'text-4xl' : 'text-2xl'}`}>Set the Stage →</Text>
                    </TouchableOpacity>
                ) : (
                    <View className="flex-row items-center gap-8">
                        <View className={`flex-row items-center bg-white border border-stone-100 rounded-[40px] shadow-sm ${isTablet ? 'px-10 h-28' : 'px-6 h-20'}`}>
                            <TouchableOpacity onPress={() => setBuyCount(Math.max(1, buyCount - 1))}>
                                <MaterialIcons name="remove" size={isTablet ? 36 : 24} color="#b30069" />
                            </TouchableOpacity>
                            <Text className={`font-headline-bold text-[#594048] text-center ${isTablet ? 'mx-8 text-4xl w-14' : 'mx-4 text-2xl w-6'}`}>{buyCount}</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    const myTickets = stats?.participants?.find((p: any) => p.id === user?.id)?.ticketCount || 0;
                                    if (myTickets + buyCount < 6) {
                                        setBuyCount(buyCount + 1);
                                    } else {
                                        Alert.alert('Limit Reached', 'Max 6 tickets allowed');
                                    }
                                }}
                            >
                                <MaterialIcons name="add" size={isTablet ? 36 : 24} color="#b30069" />
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                            onPress={handleBuyTickets}
                            disabled={isBuying}
                            activeOpacity={0.9}
                            className={`flex-1 rounded-[40px] flex-row items-center justify-center shadow-2xl shadow-primary/30 ${isTablet ? 'h-28' : 'h-20'} ${isBuying ? 'bg-primary/50' : 'bg-primary'}`}
                        >
                            {isBuying ? <ActivityIndicator color="white" size={isTablet ? 'large' : 'small'} /> : (
                                <Text 
                                    numberOfLines={1} 
                                    adjustsFontSizeToFit 
                                    className={`text-white font-headline-bold ${isTablet ? 'text-4xl' : 'text-2xl'}`}
                                >
                                    Buy Tickets
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
};

export default HousieWaitingRoomScreen;
