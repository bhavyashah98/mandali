import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Image, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { API_URL, getAuthHeaders, getOptimizedImageUrl } from '../../lib/api';
import axios from 'axios';
import MandaliCoin from '../../components/MandaliCoin';
import { useIsTablet } from '../../hooks/useIsTablet';
import { useAuthStore } from '../../stores/authStore';
import { PlayerPrizesModal } from '../../components/housie/PlayerPrizesModal';

const MEDAL_COLORS = ['#FFD700', '#A8A9AD', '#CD7F32'];
const TOP_BG = [
    { bg: '#FFFBEB', border: '#FDE68A' },   // gold
    { bg: '#F8FAFC', border: '#CBD5E1' },   // silver
    { bg: '#FFF7ED', border: '#FED7AA' },   // bronze
];

const HousieResultsScreen = () => {
    const insets = useSafeAreaInsets();
    const isTablet = useIsTablet();
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { user } = useAuthStore();
    const { gameCode, groupId } = route.params;

    const [isLoading, setIsLoading] = useState(true);
    const [results, setResults] = useState<any[]>([]);
    const [selectedPlayer, setSelectedPlayer] = useState<any>(null);

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
        navigation.goBack();
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
        <SafeAreaView className="flex-1 bg-[#FDF9F3]" edges={['top']}>
            {/* Top Header */}
            <View className={`flex-row items-center px-6 ${isTablet ? 'py-8' : 'py-4'}`}>
                <View style={{ width: isTablet ? 64 : 44 }}>
                    <TouchableOpacity
                        onPress={handleClose}
                        style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}
                        className={`items-center justify-center rounded-full bg-white border border-stone-100 ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}
                    >
                        <MaterialIcons name="close" size={isTablet ? 28 : 18} color="#594048" />
                    </TouchableOpacity>
                </View>

                <View className="flex-1 items-center">
                    <Text
                        className="font-headline-bold text-[#1c1c18] text-center uppercase tracking-tight"
                        style={{ fontSize: isTablet ? 32 : 18 }}
                        numberOfLines={1}
                    >
                        Game Over!
                    </Text>
                    <Text
                        className="font-body-bold text-[#b30069] text-center uppercase tracking-[4px]"
                        style={{ fontSize: isTablet ? 16 : 9, marginTop: 2 }}
                    >
                        Session Champions
                    </Text>
                </View>

                <View style={{ width: isTablet ? 64 : 44 }} />
            </View>

            <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                {results.length === 0 ? (
                    <View
                        style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}
                        className="bg-white rounded-[32px] p-10 items-center border border-stone-100 mt-4"
                    >
                        <View
                            style={{ backgroundColor: 'rgba(179, 0, 105, 0.05)' }}
                            className="w-20 h-20 rounded-full items-center justify-center mb-5"
                        >
                            <FontAwesome5 name="medal" size={34} color="#e8c4d8" />
                        </View>
                        <Text className="text-[#594048] font-headline-bold text-xl mb-2 text-center">
                            No winners tonight
                        </Text>
                        <Text className="text-stone-400 font-body-medium text-sm text-center leading-5">
                            It was a tough game! Better luck next session to all players.
                        </Text>
                    </View>
                ) : (
                    <View className={`gap-${isTablet ? '6' : '3'} mt-2`}>
                        {results.map((player: any, index: number) => {
                            const isTop3 = index < 3;
                            const topStyle = isTop3 ? TOP_BG[index] : null;

                            return (
                                <TouchableOpacity
                                    key={player.userId}
                                    activeOpacity={0.8}
                                    onPress={() => setSelectedPlayer(player)}
                                    className={`flex-row items-center rounded-[32px] border ${isTablet ? 'p-8' : 'p-4'} ${player.userId === user?.id ? 'border-[#b30069]' : ''}`}
                                    style={isTop3
                                        ? { 
                                            backgroundColor: player.userId === user?.id ? '#fdf0f7' : topStyle!.bg, 
                                            borderColor: player.userId === user?.id ? '#b30069' : topStyle!.border, 
                                            elevation: 2 
                                          }
                                        : { 
                                            backgroundColor: player.userId === user?.id ? '#fdf0f7' : '#ffffff', 
                                            borderColor: player.userId === user?.id ? '#b30069' : '#f1ede8', 
                                            elevation: 0 
                                          }
                                    }
                                >
                                    {/* Rank */}
                                    <View className={`${isTablet ? 'w-16' : 'w-10'} items-center mr-4`}>
                                        {isTop3 ? (
                                            <MaterialIcons
                                                name="emoji-events"
                                                size={isTablet ? 54 : 28}
                                                color={MEDAL_COLORS[index]}
                                            />
                                        ) : (
                                            <Text
                                                className="text-stone-400 font-headline-bold text-center"
                                                style={{ fontSize: isTablet ? 32 : 16 }}
                                            >
                                                {index + 1}
                                            </Text>
                                        )}
                                    </View>

                                    {/* Avatar */}
                                    <View className={`rounded-full bg-stone-100 overflow-hidden border-2 border-white ${isTablet ? 'w-24 h-24 mr-6' : 'w-11 h-11 mr-3'}`}
                                        style={{ shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 }}>
                                        {player.avatarUrl ? (
                                            <Image
                                                source={{ uri: getOptimizedImageUrl(player.avatarUrl, 'w_150,q_auto,f_auto') }}
                                                className="w-full h-full"
                                                resizeMode="cover"
                                            />
                                        ) : (
                                            <View
                                                style={{ backgroundColor: 'rgba(179, 0, 105, 0.1)' }}
                                                className="w-full h-full items-center justify-center"
                                            >
                                                <Text
                                                    className="text-primary font-headline-bold"
                                                    style={{ fontSize: isTablet ? 36 : 16 }}
                                                >
                                                    {player.name?.[0]?.toUpperCase() || '?'}
                                                </Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Info */}
                                    <View className="flex-1 min-w-0">
                                        <Text
                                            className="text-[#594048] font-headline-bold"
                                            style={{ fontSize: isTablet ? 32 : 15 }}
                                            numberOfLines={1}
                                            adjustsFontSizeToFit
                                            minimumFontScale={0.7}
                                        >
                                            {player.name}
                                        </Text>
                                        <View className="flex-row items-center mt-1">
                                            <View 
                                                style={{ backgroundColor: isTop3 ? 'rgba(179, 0, 105, 0.1)' : '#f3f4f6' }}
                                                className="px-2 py-0.5 rounded-full mr-2"
                                            >
                                                <Text className={`${isTop3 ? 'text-primary' : 'text-stone-400'} font-body-bold uppercase tracking-wider`} style={{ fontSize: isTablet ? 16 : 8 }}>
                                                    {player.winCount} {player.winCount === 1 ? 'Win' : 'Wins'}
                                                </Text>
                                            </View>
                                            <Text
                                                className="text-stone-400 font-body-medium flex-1"
                                                style={{ fontSize: isTablet ? 18 : 10 }}
                                                numberOfLines={1}
                                            >
                                                {player.prizes.map((p: any) => p.name).join(', ')}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Amount */}
                                    <View className="items-end ml-2">
                                        <View className="flex-row items-center">
                                            <Text
                                                className="font-headline-bold"
                                                style={{
                                                    fontSize: isTablet ? 42 : 16,
                                                    color: isTop3 ? '#b30069' : '#594048'
                                                }}
                                                numberOfLines={1}
                                            >
                                                {player.totalWon.toLocaleString()}
                                            </Text>
                                            <MandaliCoin size={isTablet ? 32 : 14} style={{ marginLeft: 6 }} />
                                        </View>
                                        <Text
                                            className="text-stone-300 font-body-medium"
                                            style={{ fontSize: isTablet ? 18 : 9 }}
                                        >collected</Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}
            </ScrollView>

            <PlayerPrizesModal
                visible={!!selectedPlayer}
                player={selectedPlayer}
                onClose={() => setSelectedPlayer(null)}
                isTablet={isTablet}
                bottomInset={insets.bottom}
            />

            {/* Bottom Done Button */}
            <View
                className={`px-8 pt-4 ${isTablet ? 'px-20' : ''}`}
                style={{
                    paddingBottom: Math.max(insets.bottom, isTablet ? 40 : 24),
                    backgroundColor: '#FDF9F3'
                }}
            >
                <TouchableOpacity
                    onPress={handleClose}
                    style={{ height: isTablet ? 100 : 60, elevation: 8, shadowColor: '#b30069', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 }}
                    className="bg-[#b30069] rounded-[32px] items-center justify-center"
                >
                    <Text
                        className="text-white font-headline-bold"
                        style={{ fontSize: isTablet ? 32 : 18 }}
                    >Done</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

export default HousieResultsScreen;

