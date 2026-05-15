import React, { useCallback } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

// Hooks
import { useIsTablet } from '../../hooks/useIsTablet';
import { useAuthStore } from '../../stores/authStore';
import { useBlinkWaitingRoomData } from '../../hooks/blink/useBlinkWaitingRoomData';
import { useBlinkWaitingRoomSync } from '../../hooks/blink/useBlinkWaitingRoomSync';

// API
import { cancelBlinkGame } from '../../lib/api';

const BlinkWaitingRoomScreen = () => {
    const isTablet = useIsTablet();
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const route = useRoute();
    const { gameCode, groupId } = (route.params as { gameCode: string; groupId: string }) || {};
    const { user } = useAuthStore();
    const primaryColor = '#b30069';

    const {
        game,
        groupData,
        participants,
        isHost,
        isLoading
    } = useBlinkWaitingRoomData(gameCode, groupId);

    // Real-time sync
    useBlinkWaitingRoomSync({
        game,
        gameCode: gameCode || '',
        groupId: groupId || '',
        isHost
    });

    const handleStartGame = useCallback(async () => {
        if (!socket || !gameCode) return;
        socket.emit('blink_start_game', { gameCode });
    }, [socket, gameCode]);

    const handleCancelGame = async () => {
        try {
            await cancelBlinkGame(game.id);
            navigation.goBack();
        } catch (err) {
            alert('Failed to cancel game');
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
            {/* Header */}
            <View className="px-6 py-4 flex-row items-center justify-between">
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className="w-10 h-10 items-center justify-center rounded-full bg-white border border-stone-100"
                >
                    <MaterialIcons name="arrow-back-ios" size={18} color={primaryColor} style={{ marginLeft: 5 }} />
                </TouchableOpacity>

                <View className="flex-1 items-center">
                    <Text className="text-stone-400 font-body-bold uppercase tracking-widest text-[9px]">
                        {groupData?.group?.name || 'Group'} • Blink
                    </Text>
                    <Text className="text-[#1c1c18] font-headline-bold text-lg">Waiting Room</Text>
                </View>

                {isHost ? (
                    <TouchableOpacity
                        onPress={handleCancelGame}
                        className="w-10 h-10 items-center justify-center rounded-full bg-red-50"
                    >
                        <MaterialIcons name="delete-outline" size={24} color="#ef4444" />
                    </TouchableOpacity>
                ) : (
                    <View className="w-10" />
                )}
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {/* Game Info Card */}
                <View style={{ paddingHorizontal: horizontalPadding }} className="mt-4">
                    <View className="bg-white rounded-[32px] p-6 border border-stone-100 shadow-sm flex-row items-center">
                        <View className="w-16 h-16 rounded-2xl bg-blue-50 items-center justify-center mr-4">
                            <FontAwesome5 name="bolt" size={28} color={primaryColor} />
                        </View>
                        <View className="flex-1">
                            <Text className="font-headline-bold text-xl text-stone-800">{game?.title || 'Blink Match'}</Text>
                            <Text className="text-stone-400 font-body-medium text-xs">Code: {gameCode}</Text>
                        </View>
                        <View className="bg-stone-50 px-3 py-1 rounded-lg">
                            <Text className="text-stone-500 font-headline-bold text-xs">{game?.difficulty_level || 6} Symbols</Text>
                        </View>
                    </View>
                </View>

                {/* Player List */}
                <View style={{ paddingHorizontal: horizontalPadding }} className="mt-8">
                    <Text className="font-headline-bold text-stone-800 text-lg mb-4">
                        Players ({participants.length}/{game?.max_players || 10})
                    </Text>
                    
                    {participants.map((player: any) => (
                        <View key={player.id} className="bg-white rounded-2xl p-4 mb-3 border border-stone-100 flex-row items-center">
                            <View className="w-10 h-10 rounded-full bg-stone-100 items-center justify-center overflow-hidden mr-3">
                                {player.avatar_url ? (
                                    <Image source={{ uri: player.avatar_url }} className="w-full h-full" />
                                ) : (
                                    <MaterialIcons name="person" size={24} color="#d1d5db" />
                                )}
                            </View>
                            <Text className="flex-1 font-body-bold text-stone-800">{player.name}</Text>
                            {player.id === game?.host_id && (
                                <View className="bg-blue-50 px-2 py-0.5 rounded-md">
                                    <Text className="text-blue-600 font-body-bold text-[10px] uppercase">HOST</Text>
                                </View>
                            )}
                        </View>
                    ))}

                    {participants.length === 0 && (
                        <View className="items-center justify-center py-10">
                            <ActivityIndicator color={primaryColor} />
                            <Text className="text-stone-400 font-body-medium mt-4">Waiting for players...</Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Footer */}
            <View className="px-6 py-6 border-t border-stone-100 bg-white" style={{ paddingBottom: Math.max(insets.bottom, 24) }}>
                {isHost ? (
                    <TouchableOpacity
                        onPress={handleStartGame}
                        className="w-full rounded-3xl overflow-hidden shadow-lg"
                        style={{ backgroundColor: primaryColor }}
                    >
                        <View className="py-5 items-center justify-center flex-row">
                            <FontAwesome5 name="play" size={16} color="white" />
                            <Text className="text-white font-headline-bold text-lg ml-3">Start Game</Text>
                        </View>
                    </TouchableOpacity>
                ) : (
                    <View className="bg-stone-50 rounded-3xl py-5 items-center">
                        <Text className="text-stone-400 font-headline-bold text-lg">Waiting for Host...</Text>
                    </View>
                )}
            </View>
        </View>
    );
};

export default BlinkWaitingRoomScreen;
