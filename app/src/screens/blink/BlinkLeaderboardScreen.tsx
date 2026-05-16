import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView as SafeAreaViewContext, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useIsTablet } from '../../hooks/useIsTablet';
import { useAuthStore } from '../../stores/authStore';
import { API_URL, getAuthHeaders } from '../../lib/api';
import axios from 'axios';

type Period = 'all_time' | 'this_month' | 'this_year';

const TABS: { key: Period; label: string; icon: string }[] = [
    { key: 'all_time', label: 'All Time', icon: 'emoji-events' },
    { key: 'this_year', label: 'This Year', icon: 'calendar-today' },
    { key: 'this_month', label: 'This Month', icon: 'date-range' },
];

const BlinkLeaderboardScreen = () => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const route = useRoute();
    const isTablet = useIsTablet();
    const { groupId, groupName } = (route.params as any) || {};
    const [activePeriod, setActivePeriod] = useState<Period>('all_time');
    const primaryColor = '#b30069';

    const { data, isLoading } = useQuery({
        queryKey: ['blinkLeaderboard', groupId, activePeriod],
        queryFn: async () => {
            const headers = await getAuthHeaders();
            const res = await axios.get(
                `${API_URL}/blink/games/group/${groupId}/leaderboard?period=${activePeriod}`,
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
                            className="flex-1 flex-row items-center justify-center rounded-[20px] py-3"
                        >
                            <Text className={`font-headline-bold ml-2 ${isActive ? 'text-white' : 'text-stone-400'}`}>{tab.label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* List */}
            <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
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
                    leaderboard.map((player, index) => (
                        <View key={player.userId} className="bg-white rounded-3xl p-4 mb-3 border border-stone-100 flex-row items-center">
                            <Text className="font-headline-bold text-stone-400 w-8">{index + 1}</Text>
                            <View className="w-10 h-10 rounded-full bg-stone-100 mr-3 overflow-hidden">
                                {player.avatarUrl && <Image source={{ uri: player.avatarUrl }} className="w-full h-full" />}
                            </View>
                            <View className="flex-1">
                                <Text className="font-body-bold text-stone-800">{player.name}</Text>
                                <Text className="text-stone-400 text-[10px] uppercase font-body-bold" style={{ color: primaryColor }}>{player.winCount} Wins</Text>
                            </View>
                            <View className="items-end">
                                <Text className="font-headline-bold" style={{ color: primaryColor }}>{player.totalMatches}</Text>
                                <Text className="text-stone-300 text-[9px]">matches played</Text>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>

            <View className="px-6 py-6 border-t border-stone-100 bg-white" style={{ paddingBottom: Math.max(insets.bottom, 24) }}>
                <TouchableOpacity 
                    onPress={() => navigation.goBack()} 
                    style={{ backgroundColor: primaryColor }}
                    className="w-full rounded-3xl py-5 items-center"
                >
                    <Text className="text-white font-headline-bold text-lg">Close</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaViewContext>
    );
};

export default BlinkLeaderboardScreen;
