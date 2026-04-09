import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchHousieGame, activateHousieGame, joinHousieGame, API_URL, getAuthHeaders, updateHousieStatus } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { getSocket } from '../../lib/socketService';
import axios from 'axios';

const HousieWaitingRoomScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute();
    const queryClient = useQueryClient();
    const { gameCode, groupId } = (route.params as { gameCode: string; groupId: string }) || {};
    const { user } = useAuthStore();

    const [isActivating, setIsActivating] = useState(false);
    const [buyCount, setBuyCount] = useState(1);
    const [isBuying, setIsBuying] = useState(false);

    // 1. Fetch Game Basic State
    const { data: game } = useQuery({
        queryKey: ['housieGame', gameCode],
        queryFn: () => fetchHousieGame(gameCode!),
        staleTime: 0
    });

    // 2. Fetch Participants & Prize Pool
    const fetchParticipants = async () => {
        const headers = await getAuthHeaders();
        const response = await axios.get(`${API_URL}/housie/${gameCode}/participants`, { headers });
        return response.data;
    };

    const { data: stats, refetch: refetchStats } = useQuery({
        queryKey: ['housieParticipants', gameCode],
        queryFn: fetchParticipants,
    });

    const isHost = game?.host_id === user?.id;

    // 3. Socket Integration
    useEffect(() => {
        const socket = getSocket();
        socket.emit('join_game', gameCode);

        const onTicketsBought = () => refetchStats();

        const onGameActivated = () => {
            if (user?.id === game?.host_id) {
                navigation.replace('HousieGame', { gameCode, groupId });
            } else {
                navigation.replace('HousieTicket', { gameCode, groupId });
            }
        };

        socket.on('tickets_bought', onTicketsBought);
        socket.on('game_activated', onGameActivated);

        return () => {
            socket.off('tickets_bought', onTicketsBought);
            socket.off('game_activated', onGameActivated);
        };
    }, [gameCode, game?.host_id]);

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
                Alert.alert('Success', `You bought ${buyCount} tickets!`);
                queryClient.invalidateQueries({ queryKey: ['housieParticipants', gameCode] });
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
        <View className="flex-row items-center bg-white rounded-[24px] p-4 mb-3 border border-stone-100 shadow-sm">
            <View className="w-12 h-12 rounded-full bg-stone-50 items-center justify-center overflow-hidden">
                {item.avatar ? (
                    <Image source={{ uri: item.avatar }} className="w-full h-full" />
                ) : (
                    <Text className="text-primary font-headline-bold text-lg">{item.name[0]}</Text>
                )}
            </View>
            <View className="ml-4 flex-1">
                <Text className="text-base font-headline-bold text-[#594048]">{item.name}</Text>
                <Text className="text-stone-400 font-body-medium text-xs">{item.ticketCount} Tickets Bought</Text>
            </View>
            <View className="bg-primary/5 px-3 py-1.5 rounded-full">
                <Text className="text-primary font-headline-bold text-sm">₹{item.ticketCount * (stats?.ticketPrice || 0)}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top', 'bottom']}>
            {/* Header */}
            <View className="px-6 py-4 flex-row items-center justify-between">
                <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 items-center justify-center rounded-full bg-white shadow-sm border border-stone-100">
                    <MaterialIcons name="arrow-back-ios" size={18} color="#594048" style={{ marginLeft: 5 }} />
                </TouchableOpacity>
                <View className="items-center">
                    <Text className="text-stone-400 font-body-bold text-[9px] uppercase tracking-widest">LIVE SESSION</Text>
                    <Text className="text-[#594048] font-headline-bold text-lg">Waiting Room</Text>
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
                                            await updateHousieStatus(gameCode, 'finished');
                                            await queryClient.invalidateQueries({ queryKey: ['activeHousieGame', groupId] });
                                            navigation.goBack();
                                        } catch (err) {
                                            Alert.alert('Error', 'Failed to cancel game');
                                        }
                                    }
                                }
                            ]);
                        }}
                        className="w-10 h-10 items-center justify-center rounded-full bg-red-50"
                    >
                        <MaterialIcons name="delete-outline" size={24} color="#ef4444" />
                    </TouchableOpacity>
                ) : (
                    <View className="w-10" />
                )}
            </View>

            <FlatList
                data={stats?.participants || []}
                renderItem={renderParticipant}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 24, paddingBottom: 150 }}
                ListHeaderComponent={
                    <View className="mb-8">
                        {/* Game Code Card */}
                        <View className="bg-[#b30069] rounded-[40px] p-8 items-center shadow-2xl shadow-[#b30069]/20 mb-6" style={{ elevation: 12 }}>
                            <Text className="text-white/70 font-body-bold text-[10px] uppercase tracking-[4px] mb-4">JOINING CODE</Text>
                            <Text className="text-white text-6xl font-headline-bold tracking-[8px]">{gameCode}</Text>
                            <View className="flex-row items-center mt-6 bg-white/20 px-6 py-3 rounded-full">
                                <FontAwesome5 name="ticket-alt" size={16} color="white" />
                                <Text className="text-white font-headline-bold text-lg ml-3">₹{stats?.ticketPrice} / Ticket</Text>
                            </View>
                        </View>

                        {/* Prize Pool Display */}
                        <View className="bg-white rounded-[32px] p-8 border border-stone-100 items-center shadow-sm">
                            <Text className="text-stone-400 font-body-bold text-[10px] uppercase tracking-[2px] mb-1">Total Prize Pool</Text>
                            <Text className="text-5xl font-headline-bold text-[#594048]">₹{stats?.totalPrizePool || 0}</Text>
                            <View className="h-[1px] w-full bg-stone-100 my-6" />
                            <View className="flex-row justify-between w-full px-4">
                                <View className="items-center">
                                    <Text className="text-stone-400 text-[9px] uppercase font-body-bold mb-1">Players</Text>
                                    <Text className="text-xl font-headline-bold text-primary">{stats?.participants?.length || 0}</Text>
                                </View>
                                <View className="items-center">
                                    <Text className="text-stone-400 text-[9px] uppercase font-body-bold mb-1">Tickets</Text>
                                    <Text className="text-xl font-headline-bold text-primary">{stats?.totalTickets || 0}</Text>
                                </View>
                            </View>
                        </View>

                        <Text className="text-stone-400 font-body-bold text-xs uppercase tracking-[2px] mt-10 mb-4 px-2">Participants</Text>
                    </View>
                }
                ListEmptyComponent={() => (
                    <View className="items-center justify-center py-20">
                        <ActivityIndicator color="#b30069" />
                        <Text className="text-stone-400 font-body-medium mt-4">Waiting for players to join...</Text>
                    </View>
                )}
                showsVerticalScrollIndicator={false}
            />

            {/* Action Footer */}
            <View className="absolute bottom-0 left-0 right-0 p-8 bg-[#fdf9f3]/95 border-t border-stone-100">
                {isHost ? (
                    <TouchableOpacity 
                        onPress={handleStartGame}
                        disabled={isActivating || (stats?.totalTickets || 0) === 0}
                        className={`h-20 rounded-[32px] flex-row items-center justify-center shadow-2xl shadow-primary/30 ${(stats?.totalTickets || 0) === 0 ? 'bg-[#b30069]/50' : 'bg-[#b30069]'}`}
                    >
                        <Ionicons name="play" size={28} color="white" />
                        <Text className="text-white font-headline-bold text-2xl ml-3">Start the Game</Text>
                    </TouchableOpacity>
                ) : (
                    <View className="flex-row items-center gap-4">
                        <View className="flex-row items-center bg-white border border-stone-100 rounded-[32px] px-6 h-20 shadow-sm">
                            <TouchableOpacity onPress={() => setBuyCount(Math.max(1, buyCount - 1))}>
                                <MaterialIcons name="remove" size={24} color="#b30069" />
                            </TouchableOpacity>
                            <Text className="mx-4 text-2xl font-headline-bold text-[#594048] w-6 text-center">{buyCount}</Text>
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
                                <MaterialIcons name="add" size={24} color="#b30069" />
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                            onPress={handleBuyTickets}
                            disabled={isBuying}
                            className={`flex-1 h-20 rounded-[32px] flex-row items-center justify-center shadow-2xl shadow-primary/30 ${isBuying ? 'bg-primary/50' : 'bg-primary'}`}
                        >
                            {isBuying ? <ActivityIndicator color="white" /> : <Text className="text-white font-headline-bold text-2xl">Buy Tickets</Text>}
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
};

export default HousieWaitingRoomScreen;
