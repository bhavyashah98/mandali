import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView as SafeAreaViewContext, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useIsTablet } from '../../hooks/useIsTablet';
import { useAuthStore } from '../../stores/authStore';
import { API_URL, getAuthHeaders, getOptimizedImageUrl } from '../../lib/api';
import MandaliCoin from '../../components/MandaliCoin';
import axios from 'axios';

type Period = 'all_time' | 'this_month' | 'this_year';

const TABS: { key: Period; label: string; icon: string }[] = [
    { key: 'all_time', label: 'All Time', icon: 'emoji-events' },
    { key: 'this_year', label: 'This Year', icon: 'calendar-today' },
    { key: 'this_month', label: 'This Month', icon: 'date-range' },
];

const MEDAL_COLORS = ['#FFD700', '#A8A9AD', '#CD7F32'];
const TOP_BG = [
    { bg: '#FFFBEB', border: '#FDE68A' },   // gold
    { bg: '#F8FAFC', border: '#CBD5E1' },   // silver
    { bg: '#FFF7ED', border: '#FED7AA' },   // bronze
];

const BlinkLeaderboardScreen = () => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const route = useRoute();
    const isTablet = useIsTablet();
    const { user } = useAuthStore();
    const { groupId, groupName } = (route.params as any) || {};
    const [activePeriod, setActivePeriod] = useState<Period>('all_time');
    const primaryColor = '#b30069';

    console.log(groupId, "BlinkLeaderboardScreen");

    const { data, isLoading, refetch, isFetching } = useQuery({
        queryKey: ['blinkLeaderboard', groupId, activePeriod],
        queryFn: async () => {
            const headers = await getAuthHeaders();
            const res = await axios.get(
                `${API_URL}/blink/games/group/${groupId}/leaderboard?period=${activePeriod}`,
                { headers }
            );
            return res.data;
        },
        enabled: !!groupId && groupId !== 'undefined',
        staleTime: 0, // Always fetch fresh data when mounted or when activePeriod changes
    });

    const leaderboard: any[] = data?.leaderboard || [];

    return (
        <SafeAreaViewContext className="flex-1 bg-[#fdf9f3]" edges={['top']}>
            {/* Header */}
            <View className={`flex-row items-center px-6 ${isTablet ? 'py-8' : 'py-4'}`}>
                <View style={{ width: isTablet ? 64 : 44 }}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        className={`items-center justify-center rounded-full bg-white border border-stone-100 ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}
                    >
                        <MaterialIcons name="arrow-back-ios" size={isTablet ? 28 : 18} color={primaryColor} style={{ marginLeft: isTablet ? 12 : 4 }} />
                    </TouchableOpacity>
                </View>

                <View className="flex-1 items-center">
                    <Text className="font-headline-bold text-[#1c1c18] text-center" style={{ fontSize: isTablet ? 32 : 20 }}>Leaderboard</Text>
                    <Text className="font-body-bold text-stone-400 uppercase tracking-widest text-center" style={{ fontSize: isTablet ? 16 : 9, marginTop: 2 }}>
                        {groupName || 'This Mandali'} • Blink
                    </Text>
                </View>
                <View style={{ width: isTablet ? 64 : 44 }} />
            </View>

            {/* Period Tabs */}
            <View className={`flex-row bg-white border border-stone-100 mx-6 mb-6 p-1.5 rounded-[24px]`}>
                {TABS.map(tab => {
                    const isActive = activePeriod === tab.key;
                    return (
                        <TouchableOpacity
                            key={tab.key}
                            onPress={() => setActivePeriod(tab.key)}
                            style={{ backgroundColor: isActive ? primaryColor : 'transparent' }}
                            className="flex-1 flex-row items-center justify-center rounded-[20px] py-3.5"
                        >
                            <Text className={`font-headline-bold text-center ${isActive ? 'text-white' : 'text-stone-400'}`} style={{ fontSize: isTablet ? 20 : 13 }}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* List */}
            <ScrollView
                className="flex-1 px-6"
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isFetching && !isLoading}
                        onRefresh={refetch}
                        colors={[primaryColor]}
                        tintColor={primaryColor}
                    />
                }
            >
                {isLoading ? (
                    <View className="flex-1 items-center justify-center py-20">
                        <ActivityIndicator color={primaryColor} size="large" />
                    </View>
                ) : leaderboard.length === 0 ? (
                    <View className="bg-white rounded-[32px] p-10 items-center border border-stone-100 mt-4">
                        <FontAwesome5 name="bolt" size={40} color="#d1d5db" className="mb-4" />
                        <Text className="text-stone-800 font-headline-bold text-xl mb-1">No Champions Yet</Text>
                        <Text className="text-stone-400 text-center font-body-medium">Be the first to win a Blink match in this Mandali!</Text>
                    </View>
                ) : (
                    leaderboard.map((player: any, index: number) => {
                        const isTop3 = index < 3;
                        const topStyle = isTop3 ? TOP_BG[index] : null;
                        const isCurrentUser = player.userId === user?.id;

                        return (
                            <TouchableOpacity
                                key={player.userId}
                                activeOpacity={0.9}
                                className={`flex-row items-center rounded-[32px] border ${isTablet ? 'p-8 mb-4' : 'p-4 mb-3'} ${isCurrentUser ? 'border-[#b30069] bg-[#fdf0f7]' : ''}`}
                                style={isTop3
                                    ? { backgroundColor: isCurrentUser ? '#fdf0f7' : topStyle!.bg, borderColor: isCurrentUser ? '#b30069' : topStyle!.border, elevation: isCurrentUser ? 4 : 2 }
                                    : { backgroundColor: isCurrentUser ? '#fdf0f7' : '#ffffff', borderColor: isCurrentUser ? '#b30069' : '#f1ede8', elevation: isCurrentUser ? 4 : 0 }
                                }
                            >
                                {/* Rank / Trophy */}
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

                                {/* Profile Image / Avatar */}
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
                                                style={{ fontSize: isTablet ? 36 : 16, color: primaryColor }}
                                            >
                                                {player.name?.[0]?.toUpperCase() || '?'}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {/* Info (Name, wins and matches below name) */}
                                <View className="flex-1 min-w-0 mr-2">
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
                                        {player.winCount} win{player.winCount !== 1 ? 's' : ''} · {player.totalMatches} match{player.totalMatches !== 1 ? 'es' : ''}
                                    </Text>
                                </View>

                                {/* Prize / Total Collected coins on right */}
                                <View className="items-end ml-2">
                                    <View className="flex-row items-center">
                                        <Text
                                            className="font-headline-bold"
                                            style={{
                                                fontSize: isTablet ? 42 : 16,
                                                color: isTop3 ? primaryColor : '#594048'
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
                                    >
                                        total collected
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })
                )}
            </ScrollView>

            {/* Bottom Actions */}
            <View className="px-6 py-6 border-t border-stone-100 bg-white" style={{ paddingBottom: Math.max(insets.bottom, 24) }}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={{ backgroundColor: primaryColor }}
                    className="w-full rounded-[24px] py-5 items-center shadow-md shadow-pink-200"
                >
                    <Text className="text-white font-headline-bold text-lg">Close</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaViewContext>
    );
};

export default BlinkLeaderboardScreen;
