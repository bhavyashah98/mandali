import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { API_URL, getAuthHeaders } from '../../lib/api';
import axios from 'axios';

const HousieResultsScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { gameCode, groupId } = route.params;

    const [isLoading, setIsLoading] = useState(true);
    const [results, setResults] = useState<any[]>([]);

    useEffect(() => {
        fetchResults();
    }, []);

    const fetchResults = async () => {
        try {
            const headers = await getAuthHeaders();
            const response = await axios.get(`${API_URL}/housie/${gameCode}/results`, { headers });
            setResults(response.data.results);
        } catch (error) {
            console.error('[Results] Fetch error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        // Navigate back to the group screen
        navigation.navigate('Housie', {
            screen: 'HousieLobby',
            params: { groupId }
        });
    };

    if (isLoading) {
        return (
            <View className="flex-1 bg-[#FDF9F3] items-center justify-center">
                <ActivityIndicator size="large" color="#b30069" />
                <Text className="text-stone-400 mt-4 font-body-medium">Tabulating results...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-[#FDF9F3]">
            {/* Header */}
            <View className="px-6 py-8">
                <View className="items-center mb-2">
                    <View className="bg-primary/10 p-3 rounded-full mb-4">
                        <MaterialIcons name="emoji-events" size={48} color="#b30069" />
                    </View>
                    <Text className="text-[#31302d] text-4xl font-headline-bold text-center">Game Over!</Text>
                    <Text className="text-stone-400 text-lg font-body-medium mt-1">Here are our champions</Text>
                </View>
            </View>

            <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
                {results.length === 0 ? (
                    <View className="items-center py-20">
                        <Ionicons name="sparkles-outline" size={60} color="#e1bdc8" />
                        <Text className="text-stone-400 font-body-bold text-lg mt-4">Surprisingly, no winners tonight!</Text>
                    </View>
                ) : (
                    results.map((player, index) => (
                        <View
                            key={player.userId}
                            className={`flex-row items-center p-5 rounded-[28px] mb-4 bg-white border border-stone-100 shadow-sm ${index === 0 ? 'border-primary/20 bg-primary/5' : ''}`}
                        >
                            {/* Rank Icon */}
                            <View className="w-10 items-center justify-center mr-2">
                                {index === 0 ? (
                                    <View className="bg-amber-400 w-8 h-8 rounded-full items-center justify-center shadow-sm">
                                        <Text className="text-white font-headline-bold">1</Text>
                                    </View>
                                ) : (
                                    <Text className="text-stone-300 font-headline-bold text-lg">{index + 1}</Text>
                                )}
                            </View>

                            {/* Avatar */}
                            <View
                                className="w-14 h-14 rounded-full bg-stone-100 mr-4 overflow-hidden border-2 border-white shadow-sm"
                            >
                                {player.avatarUrl ? (
                                    <Image source={{ uri: player.avatarUrl }} className="w-full h-full" />
                                ) : (
                                    <View className="flex-1 items-center justify-center">
                                        <Text className="text-stone-400 font-headline-bold text-lg">
                                            {player.name.charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* Info */}
                            <View className="flex-1">
                                <Text className="text-[#31302d] text-lg font-headline-bold" numberOfLines={1}>
                                    {player.name}
                                </Text>
                                <View className="flex-row items-center mt-1">
                                    <View className="bg-stone-100 px-2 py-0.5 rounded-md mr-2">
                                        <Text className="text-stone-500 text-[11px] font-body-bold">
                                            {player.winCount} {player.winCount === 1 ? 'WIN' : 'WINS'}
                                        </Text>
                                    </View>
                                    <Text className="text-stone-400 text-xs font-body-regular" numberOfLines={1}>
                                        {player.prizes.map((p: any) => p.name).join(', ')}
                                    </Text>
                                </View>
                            </View>

                            {/* Amount */}
                            <View className="items-end ml-2">
                                <Text className="text-[#b30069] text-xl font-headline-bold">₹{player.totalWon}</Text>
                            </View>
                        </View>
                    ))
                )}

                <View className="h-10" />
            </ScrollView>

            {/* Bottom Button */}
            <View className="px-8 pb-10 pt-4">
                <TouchableOpacity
                    onPress={handleClose}
                    style={{
                        height: 58,
                        borderRadius: 29,
                        backgroundColor: '#b30069',
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: '#b30069',
                        shadowOffset: { width: 0, height: 6 },
                        shadowOpacity: 0.25,
                        shadowRadius: 14,
                        elevation: 8,
                    }}
                    activeOpacity={0.8}
                >
                    <Text className="text-white font-headline-bold text-xl">Done</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

export default HousieResultsScreen;
