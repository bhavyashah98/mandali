import React, { useState } from 'react';
import {
    View, Text, TouchableOpacity, Image,
    ScrollView, ActivityIndicator, SafeAreaView
} from 'react-native';
import { SafeAreaView as SafeAreaViewContext } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { API_URL, getAuthHeaders } from '../../lib/api';
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
    const navigation = useNavigation<any>();
    const route = useRoute();
    const { groupId, groupName } = (route.params as any) || {};
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
        <SafeAreaViewContext className="flex-1 bg-[#fdf9f3]" edges={['top']}>
            {/* Header */}
            <View className="px-6 py-4 flex-row items-center justify-between">
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className="w-10 h-10 rounded-full bg-white items-center justify-center shadow-sm border border-stone-100"
                >
                    <MaterialIcons name="arrow-back-ios" size={18} color="#594048" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
                <View className="items-center">
                    <Text className="text-stone-400 font-body-bold text-[9px] uppercase tracking-widest">
                        {groupName || 'Mandali'}
                    </Text>
                    <Text className="text-[#594048] font-headline-bold text-lg">Leaderboard</Text>
                </View>
                <View className="w-10" />
            </View>

            {/* Period Tabs */}
            <View className="flex-row mx-6 mb-6 bg-white rounded-[20px] p-1.5 border border-stone-100 shadow-sm">
                {TABS.map(tab => {
                    const isActive = activePeriod === tab.key;
                    return (
                        <TouchableOpacity
                            key={tab.key}
                            onPress={() => setActivePeriod(tab.key)}
                            className={`flex-1 flex-row items-center justify-center py-2.5 rounded-[14px] ${isActive ? 'bg-primary' : ''}`}
                            activeOpacity={0.7}
                        >
                            <MaterialIcons
                                name={tab.icon as any}
                                size={14}
                                color={isActive ? 'white' : '#a09d96'}
                            />
                            <Text
                                className={`font-body-bold text-xs ml-1 ${isActive ? 'text-white' : 'text-stone-400'}`}
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
                    <View className="bg-white rounded-[32px] p-10 items-center border border-stone-100 shadow-sm mt-4">
                        <View className="w-20 h-20 rounded-full bg-primary/5 items-center justify-center mb-5">
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
                    <View className="gap-3">
                        {leaderboard.map((player: any, index: number) => {
                            const isTop3 = index < 3;
                            const topStyle = isTop3 ? TOP_BG[index] : null;

                            return (
                                <View
                                    key={player.userId}
                                    className="flex-row items-center p-4 rounded-[24px] border"
                                    style={isTop3
                                        ? { backgroundColor: topStyle!.bg, borderColor: topStyle!.border, elevation: 2 }
                                        : { backgroundColor: '#ffffff', borderColor: '#f1ede8' }
                                    }
                                >
                                    {/* Rank */}
                                    <View className="w-10 items-center mr-2">
                                        {isTop3 ? (
                                            <MaterialIcons
                                                name="emoji-events"
                                                size={28}
                                                color={MEDAL_COLORS[index]}
                                            />
                                        ) : (
                                            <Text className="text-stone-400 font-headline-bold text-base w-6 text-center">
                                                {index + 1}
                                            </Text>
                                        )}
                                    </View>

                                    {/* Avatar */}
                                    <View className="w-12 h-12 rounded-full bg-stone-100 mr-3 overflow-hidden border-2 border-white"
                                        style={{ shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 }}>
                                        {player.avatarUrl ? (
                                            <Image
                                                source={{ uri: player.avatarUrl }}
                                                className="w-full h-full"
                                                resizeMode="cover"
                                            />
                                        ) : (
                                            <View className="w-full h-full items-center justify-center bg-primary/10">
                                                <Text className="text-primary font-headline-bold text-lg">
                                                    {player.name?.[0]?.toUpperCase() || '?'}
                                                </Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Info */}
                                    <View className="flex-1">
                                        <Text className="text-[#594048] font-headline-bold text-base" numberOfLines={1}>
                                            {player.name}
                                        </Text>
                                        <Text className="text-stone-400 font-body-medium text-xs mt-0.5">
                                            {player.winCount} prize{player.winCount !== 1 ? 's' : ''} · {player.gamesPlayed} game{player.gamesPlayed !== 1 ? 's' : ''}
                                        </Text>
                                    </View>

                                    {/* Prize */}
                                    <View className="items-end">
                                        <Text
                                            className="font-headline-bold text-xl"
                                            style={{ color: isTop3 ? '#b30069' : '#594048' }}
                                        >
                                            ₹{player.totalWon.toLocaleString()}
                                        </Text>
                                        <Text className="text-stone-300 font-body-medium text-[10px]">total won</Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}
            </ScrollView>
        </SafeAreaViewContext>
    );
};

export default HousieLeaderboardScreen;
