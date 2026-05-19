import React, { useCallback, useEffect } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

// Hooks
import { useIsTablet } from '../../hooks/useIsTablet';

import { useBlinkWaitingRoomData } from '../../hooks/blink/useBlinkWaitingRoomData';
import { useBlinkWaitingRoomSync } from '../../hooks/blink/useBlinkWaitingRoomSync';

// API
import { cancelBlinkGame, startBlinkGame } from '../../lib/api';

const BlinkWaitingRoomScreen = () => {
    const isTablet = useIsTablet();
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const route = useRoute();
    const { gameCode, groupId } = (route.params as { gameCode: string; groupId: string }) || {};
    const primaryColor = '#b30069';

    const {
        game,
        groupData,
        participants,
        isHost,
        isParticipant,
        isLoading
    } = useBlinkWaitingRoomData(gameCode, groupId);

    // Real-time sync
    useBlinkWaitingRoomSync({
        game,
        gameCode: gameCode || '',
        groupId: groupId || '',
        isParticipant
    });

    const handleStartGame = useCallback(async () => {
        if (!gameCode) return;
        try {
            await startBlinkGame(gameCode);
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to start game');
        }
    }, [gameCode]);

    const handleCancelGame = async () => {
        if (!gameCode) return;
        try {
            await cancelBlinkGame(gameCode);
            navigation.goBack();
        } catch (err) {
            Alert.alert('Error', 'Failed to cancel game');
        }
    };

    if (isLoading && !game) {
        return (
            <SafeAreaView className="flex-1 bg-[#fdf9f3] items-center justify-center">
                <ActivityIndicator size="large" color={primaryColor} />
            </SafeAreaView>
        );
    }

    const horizontalPadding = isTablet ? 64 : 24;

    return (
        <View className="flex-1 bg-[#fdf9f3]" style={{ paddingTop: insets.top }}>
            <View className={`px-6 flex-row items-center justify-between py-4`}>
                <View style={{ width: 44 }}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}
                        className={`items-center justify-center rounded-full bg-white border border-stone-100 w-10 h-10`}
                    >
                        <MaterialIcons name="arrow-back-ios" size={18} color="#594048" style={{ marginLeft: 5 }} />
                    </TouchableOpacity>
                </View>

                <View className="flex-1 items-center">
                    <Text className={`text-stone-400 font-body-bold uppercase tracking-[3px] text-center text-[9px]`} numberOfLines={1}>
                        MANDALI • {groupData?.group?.name || '...'}
                    </Text>
                    <Text className={`text-[#1c1c18] font-headline-bold text-lg`}>Waiting Room</Text>
                    {game?.hostName && (
                        <Text className={`text-[#b30069] font-body-bold mt-1 text-[11px]`}>
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
                                    onPress: handleCancelGame
                                }
                            ]);
                        }}
                        className={`items-center justify-center rounded-full bg-red-50 w-10 h-10`}
                    >
                        <MaterialIcons name="delete-outline" size={24} color="#ef4444" />
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 44 }} />
                )}
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingHorizontal: horizontalPadding, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Game Info Card */}
                <View className="bg-white rounded-[32px] p-6 mb-8 mt-4 border border-stone-100">
                    <View className="flex-row items-center mb-4">
                        <View className="w-12 h-12 rounded-2xl bg-pink-50 items-center justify-center mr-4">
                            <FontAwesome5 name="bolt" size={24} color={primaryColor} />
                        </View>
                        <View className="flex-1">
                            <Text className="text-stone-800 font-headline-bold text-2xl">{game?.title}</Text>
                            <Text className="text-stone-400 font-body text-sm">Room Code: {gameCode}</Text>
                        </View>
                    </View>

                    <View className="h-[1px] bg-stone-50 my-4" />

                    <View className="flex-row justify-between">
                        <View>
                            <Text className="text-stone-400 font-body-bold text-[10px] uppercase">Symbols</Text>
                            <Text className="text-stone-800 font-headline-bold text-lg">{game?.symbols_per_card}</Text>
                        </View>
                        <View className="items-end">
                            <Text className="text-stone-400 font-body-bold text-[10px] uppercase">Cards/Player</Text>
                            <Text className="text-stone-800 font-headline-bold text-lg">{game?.cards_per_player}</Text>
                        </View>
                    </View>
                </View>

                {/* Participants List */}
                <View className="flex-row items-center justify-between mb-4 px-2">
                    <Text className="text-stone-800 font-headline-bold text-lg">Players Joined</Text>
                    <View className="bg-stone-100 px-3 py-1 rounded-full">
                        <Text className="text-stone-500 font-body-bold text-xs">{participants.length} Joined</Text>
                    </View>
                </View>

                {participants.map((player: any) => (
                    <View key={player.id} className="bg-white rounded-2xl p-4 mb-3 flex-row items-center border border-stone-50">
                        <Image
                            source={{ uri: player.avatar_url || 'https://via.placeholder.com/150' }}
                            className="w-10 h-10 rounded-full bg-stone-100 mr-3"
                        />
                        <View className="flex-1">
                            <Text className="text-stone-800 font-headline-bold">{player.name}</Text>
                            {player.id === game?.host_id && (
                                <Text className="text-pink-600 font-body-bold text-[10px] uppercase">Host</Text>
                            )}
                        </View>
                        <MaterialIcons name="check-circle" size={20} color="#16a34a" />
                    </View>
                ))}
            </ScrollView>

            {/* Sticky Footer */}
            <View className="absolute bottom-0 w-full px-6 pt-4 pb-10 bg-[#fdf9f3] border-t border-stone-100">
                {game?.status === 'scheduled' ? (
                    <View className="items-center py-4">
                        <ActivityIndicator color={primaryColor} size="small" />
                        <Text className="text-stone-400 font-body-bold mt-2 text-center">
                            Match will automatically start at {new Date(game?.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>
                ) : isHost ? (
                    <View className="w-full">
                        <TouchableOpacity
                            onPress={handleStartGame}
                            className="w-full bg-[#b30069] rounded-[32px] items-center justify-center"
                            style={{
                                height: 64,
                                shadowColor: primaryColor,
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.3,
                                shadowRadius: 8,
                                elevation: 4
                            }}
                        >
                            <View className="flex-row items-center">
                                <FontAwesome5 name="play" size={16} color="white" />
                                <Text className="text-white font-headline-bold text-xl ml-3">Start Match</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View className="items-center py-4">
                        <ActivityIndicator color={primaryColor} size="small" />
                        <Text className="text-stone-400 font-body-bold mt-2 text-center">
                            Waiting for the host to start...
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
};

export default BlinkWaitingRoomScreen;
