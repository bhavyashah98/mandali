import React, { useEffect, useState } from 'react';
import { useIsTablet } from '../../hooks/useIsTablet';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Image, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { API_URL, getAuthHeaders, getOptimizedImageUrl } from '../../lib/api';
import axios from 'axios';
import MandaliCoin from '../../components/MandaliCoin';

const HousieResultsScreen = () => {
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const isTablet = useIsTablet();
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
        // Navigate back to the main lobby for this group
        navigation.navigate('HousieLobby', { groupId });
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
            {/* Centered Header Section */}
            <View 
                className="items-center w-full"
                style={{ 
                    marginTop: isTablet ? 40 : 24,
                    marginBottom: isTablet ? 40 : 16 
                }}
            >
                <View className={`bg-primary/10 rounded-full mb-4 items-center justify-center shadow-sm ${isTablet ? 'w-40 h-40' : 'w-24 h-24'}`}>
                    <MaterialIcons name="emoji-events" size={isTablet ? 90 : 54} color="#b30069" />
                </View>
                <Text
                    className="font-headline-bold text-[#1c1c18] text-center tracking-tight"
                    style={{ fontSize: isTablet ? 72 : 38 }}
                    adjustsFontSizeToFit
                    numberOfLines={1}
                >
                    Game Over!
                </Text>
                <Text 
                    className="font-body-bold text-[#b30069] text-center tracking-[4px] uppercase"
                    style={{ 
                        fontSize: isTablet ? 20 : 12,
                        marginTop: isTablet ? 8 : 4
                    }}
                >
                    Session Champions
                </Text>
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
                            className={`flex-row items-center rounded-[32px] mb-6 bg-white border border-stone-100 shadow-sm ${index === 0 ? 'border-primary/30 bg-primary/5' : ''} ${isTablet ? 'p-10' : 'p-5'}`}
                        >
                            {/* Rank Icon */}
                            <View className={`${isTablet ? 'w-20' : 'w-10'} items-center justify-center mr-4`}>
                                {index === 0 ? (
                                    <View className={`bg-amber-400 rounded-full items-center justify-center shadow-sm ${isTablet ? 'w-12 h-12' : 'w-8 h-8'}`}>
                                        <Text className={`text-white font-headline-bold ${isTablet ? 'text-2xl' : 'text-base'}`}>1</Text>
                                    </View>
                                ) : (
                                    <Text className={`text-stone-300 font-headline-bold ${isTablet ? 'text-3xl' : 'text-lg'}`}>{index + 1}</Text>
                                )}
                            </View>

                            {/* Avatar */}
                            <View
                                className={`rounded-full bg-stone-100 overflow-hidden border-4 border-white shadow-md ${isTablet ? 'w-24 h-24 mr-8' : 'w-11 h-11 mr-3'}`}
                            >
                                {player.avatarUrl ? (
                                    <Image source={{ uri: getOptimizedImageUrl(player.avatarUrl, 'w_150,q_auto,f_auto') }} className="w-full h-full" />
                                ) : (
                                    <View className="flex-1 items-center justify-center">
                                        <Text className={`text-stone-400 font-headline-bold ${isTablet ? 'text-3xl' : 'text-base'}`}>
                                            {player.name.charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* Info */}
                            <View className="flex-1 min-w-0">
                                <Text 
                                    className={`text-[#31302d] font-headline-bold mb-1 ${isTablet ? 'text-4xl' : 'text-[15px]'}`} 
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                    minimumFontScale={0.7}
                                >
                                    {player.name}
                                </Text>
                                <View className="flex-row items-center">
                                    <View className="bg-primary/10 px-2 py-0.5 rounded-full mr-2">
                                        <Text className={`text-primary font-body-bold ${isTablet ? 'text-xl' : 'text-[10px]'}`}>
                                            {player.winCount} {player.winCount === 1 ? 'WIN' : 'WINS'}
                                        </Text>
                                    </View>
                                    <Text className={`text-stone-400 font-body-regular flex-1 ${isTablet ? 'text-xl' : 'text-[10px]'}`} numberOfLines={1}>
                                        {player.prizes.map((p: any) => p.name).join(', ')}
                                    </Text>
                                </View>
                            </View>

                            {/* Amount */}
                            <View className="items-end ml-2">
                                <View className="flex-row items-center">
                                    <Text 
                                        className={`text-[#b30069] font-headline-bold ${isTablet ? 'text-5xl' : 'text-base'}`}
                                        numberOfLines={1}
                                    >
                                        {player.totalWon}
                                    </Text>
                                    <MandaliCoin size={isTablet ? 32 : 14} style={{ marginLeft: 6 }} />
                                </View>
                                <Text className="text-stone-300 font-body-medium" style={{ fontSize: isTablet ? 18 : 9 }}>collected</Text>
                            </View>
                        </View>
                    ))
                )}

                <View className="h-10" />
            </ScrollView>

            {/* Bottom Button */}
            <View 
                className={`px-8 pt-4 ${isTablet ? 'px-20' : ''}`}
                style={{ 
                    paddingBottom: Math.max(insets.bottom, isTablet ? 48 : 24),
                    backgroundColor: '#FDF9F3'
                }}
            >
                <TouchableOpacity
                    onPress={handleClose}
                    style={{ height: isTablet ? 110 : 70 }}
                    className="bg-[#b30069] rounded-[32px] items-center justify-center shadow-xl shadow-primary/20"
                >
                    <Text 
                        className="text-white font-headline-bold"
                        style={{ fontSize: isTablet ? 32 : 20 }}
                    >Done</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

export default HousieResultsScreen;
