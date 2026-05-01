import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, ActivityIndicator, useWindowDimensions } from 'react-native';
import { SafeAreaView as SafeAreaViewContext, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useIsTablet } from '../../hooks/useIsTablet';
import { useAuthStore } from '../../stores/authStore';
import MandaliCoin from '../../components/MandaliCoin';
import { API_URL, getAuthHeaders, getOptimizedImageUrl } from '../../lib/api';
import axios from 'axios';

type Period = 'all_time' | 'this_month' | 'this_year';

const TABS: { key: Period; label: string; icon: string }[] = [
    { key: 'all_time',   label: 'All Time',   icon: 'emoji-events' },
    { key: 'this_year',  label: 'This Year',  icon: 'calendar-today' },
    { key: 'this_month', label: 'This Month', icon: 'date-range' },
];

const MEDAL_COLORS = ['#FFD700', '#A8A9AD', '#CD7F32'];
const TOP_BG = [
    { bg: '#FFFBEB', border: '#FDE68A' },   // gold
    { bg: '#F8FAFC', border: '#CBD5E1' },   // silver
    { bg: '#FFF7ED', border: '#FED7AA' },   // bronze
];

const HousieLeaderboardScreen = () => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const route = useRoute();
    const { width } = useWindowDimensions();
    const isTablet = useIsTablet();
    const { groupId, groupName } = (route.params as any) || {};
    const { user } = useAuthStore();
    const [activePeriod, setActivePeriod] = useState<Period>('all_time');

    const { data, isLoading, isError } = useQuery({
        queryKey: ['groupLeaderboard', groupId, activePeriod],
        queryFn: async () => {
            const headers = await getAuthHeaders();
            const res = await axios.get(
                `${API_URL}/housie/group/${groupId}/leaderboard?period=${activePeriod}`,
                { headers }
            );
            return res.data;
        },
        enabled: !!groupId,
        staleTime: 30_000,
    });

    const leaderboard: any[] = data?.leaderboard || [];

    return (
        <SafeAreaViewContext className="flex-1 bg-[#fdf9f3]" edges={['top', 'bottom']}>
            {/* Header */}
            <View className={`flex-row items-center px-6 ${isTablet ? 'py-8' : 'py-4'}`}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}
                    className={`items-center justify-center rounded-full bg-white border border-stone-100 ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}
                >
                    <MaterialIcons name="arrow-back-ios" size={isTablet ? 28 : 18} color="#594048" style={{ marginLeft: isTablet ? 12 : 4 }} />
                </TouchableOpacity>
            </View>

            {/* Centered Header Section */}
            <View 
                className="items-center w-full"
                style={{ 
                    marginTop: isTablet ? 10 : 0,
                    marginBottom: isTablet ? 24 : 12 
                }}
            >
                <Text
                    className="font-headline-bold text-[#1c1c18] text-center tracking-tight"
                    style={{ fontSize: isTablet ? 72 : 38 }}
                    adjustsFontSizeToFit
                    numberOfLines={1}
                >
                    Leaderboard
                </Text>
                <Text 
                    className="font-body-bold text-[#b30069] text-center tracking-[4px] uppercase"
                    style={{ 
                        fontSize: isTablet ? 20 : 12,
                        marginTop: isTablet ? 8 : 4
                    }}
                >
                    {groupName || 'This Mandali'}
                </Text>
            </View>

            {/* Period Tabs */}
            <View 
                style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}
                className={`flex-row bg-white border border-stone-100 ${isTablet ? 'mx-16 mb-12 p-3 rounded-[32px]' : 'mx-6 mb-6 p-1.5 rounded-[20px]'}`}
            >
                {TABS.map(tab => {
                    const isActive = activePeriod === tab.key;
                    return (
                        <TouchableOpacity
                            key={tab.key}
                            onPress={() => setActivePeriod(tab.key)}
                            className={`flex-1 flex-row items-center justify-center rounded-[18px] ${isTablet ? 'py-6' : 'py-2.5'} ${isActive ? 'bg-[#b30069]' : ''}`}
                            activeOpacity={0.7}
                        >
                            <MaterialIcons
                                name={tab.icon as any}
                                size={isTablet ? 32 : 14}
                                color={isActive ? 'white' : '#a09d96'}
                            />
                            <Text
                                className={`font-body-bold ml-2 ${isTablet ? 'text-2xl' : 'text-xs'} ${isActive ? 'text-white' : 'text-stone-400'}`}
                                numberOfLines={1}
                            >
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Content */}
            <ScrollView
                className="flex-1 px-6"
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
            >
                {isLoading ? (
                    <View className="flex-1 items-center justify-center py-24">
                        <ActivityIndicator color="#b30069" size="large" />
                    </View>
                ) : isError ? (
                    <View className="items-center py-20">
                        <Text className="text-stone-400 font-body-medium">Could not load leaderboard.</Text>
                    </View>
                ) : leaderboard.length === 0 ? (
                    /* Empty State */
                    <View 
                        style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}
                        className="bg-white rounded-[32px] p-10 items-center border border-stone-100 mt-4"
                    >
                        <View 
                            style={{ backgroundColor: 'rgba(179, 0, 105, 0.05)' }}
                            className="w-20 h-20 rounded-full items-center justify-center mb-5"
                        >
                            <FontAwesome5 name="trophy" size={34} color="#e8c4d8" />
                        </View>
                        <Text className="text-[#594048] font-headline-bold text-xl mb-2 text-center">
                            No wins yet
                        </Text>
                        <Text className="text-stone-400 font-body-medium text-sm text-center leading-5">
                            Play a Housie session to start building{'\n'}this Mandali's hall of fame!
                        </Text>
                    </View>
                ) : (
                    <View className={`gap-${isTablet ? '6' : '3'}`}>
                        {leaderboard.map((player: any, index: number) => {
                            const isTop3 = index < 3;
                            const topStyle = isTop3 ? TOP_BG[index] : null;

                            return (
                                <View
                                    key={player.userId}
                                    className={`flex-row items-center rounded-[32px] border ${isTablet ? 'p-8' : 'p-4'} ${player.userId === user?.id ? 'border-[#b30069] bg-[#fdf0f7]' : ''}`}
                                    style={isTop3
                                        ? { backgroundColor: player.userId === user?.id ? '#fdf0f7' : topStyle!.bg, borderColor: player.userId === user?.id ? '#b30069' : topStyle!.border, elevation: player.userId === user?.id ? 4 : 2 }
                                        : { backgroundColor: player.userId === user?.id ? '#fdf0f7' : '#ffffff', borderColor: player.userId === user?.id ? '#b30069' : '#f1ede8', elevation: player.userId === user?.id ? 4 : 0 }
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
                                    <View className={`rounded-full bg-stone-100 overflow-hidden border-2 border-white ${isTablet ? 'w-24 h-24 mr-6' : 'w-10 h-10 mr-3'}`}
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
                                        <Text 
                                            className="text-stone-400 font-body-medium mt-1"
                                            style={{ fontSize: isTablet ? 20 : 11 }}
                                            numberOfLines={1}
                                        >
                                            {player.winCount} reward{player.winCount !== 1 ? 's' : ''} · {player.gamesPlayed} game{player.gamesPlayed !== 1 ? 's' : ''}
                                        </Text>
                                    </View>

                                    {/* Prize */}
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
                                        >total collected</Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}
            </ScrollView>

            {/* Bottom Done Button */}
            <View 
                className={`px-8 pt-4 ${isTablet ? 'px-20' : ''}`}
                style={{ 
                    paddingBottom: Math.max(insets.bottom, isTablet ? 40 : 20),
                    backgroundColor: '#fdf9f3'
                }}
            >
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={{ height: isTablet ? 110 : 64, elevation: 8, shadowColor: '#b30069', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 }}
                    className="bg-[#b30069] rounded-[32px] items-center justify-center"
                >
                    <Text 
                        className="text-white font-headline-bold"
                        style={{ fontSize: isTablet ? 32 : 18 }}
                    >Done</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaViewContext>
    );
};

export default HousieLeaderboardScreen;
