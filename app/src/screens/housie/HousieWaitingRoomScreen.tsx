//lib
import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';

//hooks
import { useIsTablet } from '../../hooks/useIsTablet';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { useHousieWaitingRoomSync } from '../../hooks/housie/useHousieWaitingRoomSync';

//api
import { fetchHousieGame, updateHousieStatus, fetchGroupDetail, fetchHousieParticipants, getOptimizedImageUrl } from '../../lib/api';
import { useSocket } from '../../hooks/useSocket';
import { useSocketRoom } from '../../hooks/useSocketRoom';

const HousieWaitingRoomScreen = () => {
    const isTablet = useIsTablet();
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const route = useRoute();
    const queryClient = useQueryClient();
    const { gameCode, groupId } = (route.params as { gameCode: string; groupId: string }) || {};
    const { user } = useAuthStore();
    const socket = useSocket();

    useFocusEffect(
        React.useCallback(() => {
            if (gameCode) {
                queryClient.invalidateQueries({ queryKey: ['housieGame', gameCode] });
                queryClient.invalidateQueries({ queryKey: ['housieParticipants', gameCode] });
            }
        }, [gameCode, queryClient])
    );

    // 1. Fetch Game Status
    const { data: game } = useQuery({
        queryKey: ['housieGame', gameCode],
        queryFn: () => fetchHousieGame(gameCode!),
        staleTime: 5000,
        refetchOnWindowFocus: true
    });

    // 2. Fetch Group Detail for Header Branding
    const { data: groupData } = useQuery({
        queryKey: ['groupDetail', groupId],
        queryFn: () => fetchGroupDetail(groupId!),
        enabled: !!groupId,
    });

    // 3. Fetch Participants & Stats
    const { data: stats } = useQuery({
        queryKey: ['housieParticipants', gameCode],
        queryFn: () => fetchHousieParticipants(gameCode!),
        staleTime: 5000,
        refetchOnWindowFocus: true
    });

    const isHost = game?.host_id === user?.id;

    useHousieWaitingRoomSync({
        game,
        stats,
        user,
        gameCode,
        groupId,
        isHost
    });

    useSocketRoom('join_game', gameCode);

    useEffect(() => {
        if (!socket) return;

        const onTicketsBought = () => {
            queryClient.invalidateQueries({ queryKey: ['housieParticipants', gameCode] });
        };

        const onGameStarting = () => {
            navigation.replace('HousieStarting', { gameCode, groupId });
        };

        const onGameEnded = () => {
            navigation.goBack();
        }

        socket.on('tickets_bought', onTicketsBought);
        socket.on('game_starting', onGameStarting);
        socket.on('game_ended', onGameEnded);

        return () => {
            socket.off('tickets_bought', onTicketsBought);
            socket.off('game_starting', onGameStarting);
            socket.off('game_ended', onGameEnded);
        };
    }, [socket, gameCode, queryClient, navigation, groupId]);

    const handleStartGame = async () => {
        navigation.replace('HousieDefineBounty', { gameCode, groupId });
    };

    if (!user) {
        return (
            <SafeAreaView className="flex-1 bg-[#fdf9f3] items-center justify-center">
                <ActivityIndicator size="large" color="#b30069" />
            </SafeAreaView>
        );
    }

    const renderParticipant = ({ item }: { item: any }) => {
        const isParticipantHost = item.id === game?.host_id;
        
        return (
            <View 
                style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}
                className={`flex-row items-center bg-white border border-stone-100 mb-4 ${isTablet ? 'rounded-[32px] p-8' : 'rounded-[24px] p-4'}`}
            >
                <View className={`rounded-full bg-stone-50 items-center justify-center overflow-hidden border border-stone-100 ${isTablet ? 'w-24 h-24' : 'w-12 h-12'}`}>
                    {item.avatar ? (
                        <Image source={{ uri: getOptimizedImageUrl(item.avatar, 'w_150,q_auto,f_auto') }} className="w-full h-full" />
                    ) : (
                        <Text className={`text-primary font-headline-bold ${isTablet ? 'text-5xl' : 'text-lg'}`}>{item.name[0]}</Text>
                    )}
                </View>
                <View className="ml-4 flex-1">
                    <View className="flex-row items-center">
                        <Text className={`font-headline-bold text-[#594048] ${isTablet ? 'text-3xl' : 'text-base'}`}>{item.name}</Text>
                        {isParticipantHost && (
                            <View 
                                style={{ backgroundColor: 'rgba(179, 0, 105, 0.1)' }}
                                className="px-2 py-0.5 rounded-md ml-2"
                            >
                                <Text className="text-primary font-body-bold text-[10px] uppercase">Host</Text>
                            </View>
                        )}
                    </View>
                    <Text className={`text-stone-400 font-body-medium ${isTablet ? 'text-xl mt-1' : 'text-xs'}`}>{item.ticketCount} {item.ticketCount === 1 ? 'Ticket' : 'Tickets'} Bought</Text>
                </View>
            </View>
        );
    };

    const getModeText = () => {
        if (!game?.settings) return 'Classic';
        switch (game.settings.gameStyle) {
            case 'plus_one':  return '+1 Housie';
            case 'minus_one': return '-1 Housie';
            case 'reverse':   return 'Reverse';
            case 'classic':
            default:          return 'Classic';
        }
    };

    const getCallingText = () => {
        if (!game?.settings) return 'Manual Calling';
        if (game.settings.callingMode === 'auto') {
            return `Auto (${game.settings.autoCallSeconds}s/num)`;
        }
        return 'Manual Calling';
    };

    return (
        <View className="flex-1 bg-[#fdf9f3]" style={{ paddingTop: insets.top }}>
            {/* Header */}
            <View className={`px-6 flex-row items-center justify-between ${isTablet ? 'py-8 px-12' : 'py-4 px-6'}`}>
                <View style={{ width: isTablet ? 64 : 44 }}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}
                        className={`items-center justify-center rounded-full bg-white border border-stone-100 ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}
                    >
                        <MaterialIcons name="arrow-back-ios" size={isTablet ? 28 : 18} color="#594048" style={{ marginLeft: isTablet ? 8 : 5 }} />
                    </TouchableOpacity>
                </View>
                <View className="flex-1 items-center">
                    <Text className={`text-stone-400 font-body-bold uppercase tracking-[3px] text-center ${isTablet ? 'text-lg' : 'text-[9px]'}`} numberOfLines={1}>
                        MANDALI • {groupData?.group?.name || '...'}
                    </Text>
                    <Text className={`text-[#1c1c18] font-headline-bold ${isTablet ? 'text-4xl mt-1' : 'text-lg'}`}>Waiting Room</Text>
                    {game?.hostName && (
                        <Text className={`text-[#b30069] font-body-bold mt-1 ${isTablet ? 'text-xl' : 'text-[11px]'}`}>
                            Hosted by {isHost ? 'You' : game.hostName}
                        </Text>
                    )}
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
                className="flex-1"
                data={stats?.participants || []}
                renderItem={renderParticipant}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingHorizontal: isTablet ? 64 : 24, paddingTop: isTablet ? 32 : 12, paddingBottom: 40 }}
                ListHeaderComponent={
                    <View>
                        {/* Game Code Card - Optimized size for tablet */}
                        <View 
                            style={{ 
                                backgroundColor: '#b30069', 
                                elevation: 12, 
                                shadowColor: '#b30069', 
                                shadowOffset: { width: 0, height: 10 }, 
                                shadowOpacity: 0.2, 
                                shadowRadius: 20 
                            }}
                            className={`rounded-[48px] items-center mb-6 ${isTablet ? 'p-12' : 'p-8'}`}
                        >
                            <Text 
                                style={{ color: 'rgba(255, 255, 255, 0.7)' }}
                                className={`font-body-bold uppercase tracking-[4px] mb-4 ${isTablet ? 'text-xl' : 'text-[10px]'}`}
                            >JOINING CODE</Text>
                            <Text
                                className="text-white font-headline-bold tracking-[8px]"
                                style={{ fontSize: isTablet ? 90 : 52 }}
                                adjustsFontSizeToFit
                                numberOfLines={1}
                            >{gameCode}</Text>
                            
                            <View 
                                style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                                className="flex-row items-center mt-6 px-4 py-2 rounded-full"
                            >
                                <Ionicons name="settings-outline" size={14} color="white" />
                                <Text className="text-white font-body-bold text-[11px] uppercase tracking-wider ml-2">
                                    {getModeText()} • {getCallingText()}
                                </Text>
                            </View>
                        </View>

                        {/* Stats Display */}
                        <View 
                            style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}
                            className={`bg-white rounded-[40px] border border-stone-100 items-center ${isTablet ? 'p-12' : 'p-6'}`}
                        >
                            <View className={`flex-row justify-between w-full ${isTablet ? 'px-16' : 'px-4'}`}>
                                <View className="items-center">
                                    <Text className={`text-stone-400 uppercase font-body-bold mb-1 ${isTablet ? 'text-lg' : 'text-[9px]'}`}>Players</Text>
                                    <Text className={`font-headline-bold text-primary ${isTablet ? 'text-5xl' : 'text-xl'}`}>{stats?.participants?.length || 0}</Text>
                                </View>
                                <View className="items-center">
                                    <Text className={`text-stone-400 uppercase font-body-bold mb-1 ${isTablet ? 'text-lg' : 'text-[9px]'}`}>Tickets</Text>
                                    <Text className={`font-headline-bold text-primary ${isTablet ? 'text-5xl' : 'text-xl'}`}>{stats?.totalTickets || 0}</Text>
                                </View>
                            </View>
                        </View>

                        <Text className={`text-stone-400 font-body-bold uppercase tracking-[2px] mt-12 mb-6 px-4 ${isTablet ? 'text-3xl' : 'text-xs'}`}>Participants List</Text>
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

            {/* Action Footer - Fixed layout, pins to absolute bottom */}
            <View
                className="bg-[#fdf9f3] border-t border-stone-100"
                style={{
                    paddingHorizontal: isTablet ? 64 : 24,
                    paddingTop: isTablet ? 32 : 16,
                    paddingBottom: Math.max(insets.bottom, isTablet ? 48 : 24)
                }}
            >
                {isHost ? (
                    <TouchableOpacity
                        onPress={handleStartGame}
                        disabled={(stats?.totalTickets || 0) === 0}
                        activeOpacity={0.9}
                        style={{ 
                            backgroundColor: (stats?.totalTickets || 0) === 0 ? 'rgba(179, 0, 105, 0.5)' : '#b30069',
                            elevation: 8,
                            shadowColor: '#b30069',
                            shadowOffset: { width: 0, height: 8 },
                            shadowOpacity: 0.3,
                            shadowRadius: 12
                        }}
                        className={`rounded-[40px] flex-row items-center justify-center ${isTablet ? 'h-28' : 'h-20'}`}
                    >
                        <Ionicons name="trophy" size={isTablet ? 36 : 26} color="white" />
                        <Text className={`text-white font-headline-bold ml-4 ${isTablet ? 'text-4xl' : 'text-2xl'}`}>Set the Stage →</Text>
                    </TouchableOpacity>
                ) : (
                    <View className={`rounded-[40px] flex-row items-center justify-center border border-stone-200 bg-stone-50 ${isTablet ? 'h-28' : 'h-20'}`}>
                        <ActivityIndicator color="#b30069" size={isTablet ? 'large' : 'small'} style={{ marginRight: 12 }} />
                        <Text className={`text-stone-400 font-headline-bold ${isTablet ? 'text-3xl' : 'text-lg'}`}>Waiting for host to start...</Text>
                    </View>
                )}
            </View>
        </View>
    );
};

export default HousieWaitingRoomScreen;
