import React, { useState } from 'react';
import {
    View, Text, TouchableOpacity, Image,
    ScrollView, ActivityIndicator, useWindowDimensions
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
    const { width } = useWindowDimensions();
    const isTablet = width > 500;
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
            <View className={`flex-row items-center px-6 ${isTablet ? 'py-8' : 'py-4'}`}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className={`items-center justify-center rounded-full bg-white shadow-sm border border-stone-100 ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}
                >
                    <MaterialIcons name="arrow-back-ios" size={isTablet ? 28 : 18} color="#594048" style={{ marginLeft: isTablet ? 12 : 4 }} />
                </TouchableOpacity>
            </View>

            {/* Centered Header Section */}
            <View 
                className="items-center w-full"
                style={{ 
                    marginTop: isTablet ? 20 : 0,
                    marginBottom: isTablet ? 80 : 32 
                }}
            >
                <Text
                    className="font-headline-bold text-on-surface text-center tracking-tight text-[#1c1c18]"
                    style={{ fontSize: isTablet ? 72 : 38 }}
                    adjustsFontSizeToFit
                    numberOfLines={1}
                >
                    Leaderboard
                </Text>
                <Text 
                    className="font-body-medium text-on-surface-variant text-center leading-relaxed opacity-60"
                    style={{ 
                        fontSize: isTablet ? 22 : 15,
                        marginTop: isTablet ? 20 : 12,
                        paddingHorizontal: isTablet ? 80 : 32
                    }}
                >
                    Hall of Fame for {groupName || 'this Mandali'}
                </Text>
                <View 
                    className="bg-primary/20 rounded-full"
                    style={{ 
                        height: 4, 
                        width: isTablet ? 120 : 40,
                        marginTop: isTablet ? 36 : 20 
                    }} 
                />
            </View>

            {/* Period Tabs */}
            <View className={`flex-row bg-white border border-stone-100 shadow-sm ${isTablet ? 'mx-16 mb-12 p-3 rounded-[32px]' : 'mx-6 mb-6 p-1.5 rounded-[20px]'}`}>
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
                    <View className={`gap-${isTablet ? '6' : '3'}`}>
                        {leaderboard.map((player: any, index: number) => {
                            const isTop3 = index < 3;
                            const topStyle = isTop3 ? TOP_BG[index] : null;

                            return (
                                <View
                                    key={player.userId}
                                    className={`flex-row items-center rounded-[32px] border ${isTablet ? 'p-8' : 'p-4'}`}
                                    style={isTop3
                                        ? { backgroundColor: topStyle!.bg, borderColor: topStyle!.border, elevation: 2 }
                                        : { backgroundColor: '#ffffff', borderColor: '#f1ede8' }
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
                                    <View className={`rounded-full bg-stone-100 mr-6 overflow-hidden border-2 border-white ${isTablet ? 'w-24 h-24' : 'w-12 h-12'}`}
                                        style={{ shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 }}>
                                        {player.avatarUrl ? (
                                            <Image
                                                source={{ uri: player.avatarUrl }}
                                                className="w-full h-full"
                                                resizeMode="cover"
                                            />
                                        ) : (
                                            <View className="w-full h-full items-center justify-center bg-primary/10">
                                                <Text 
                                                    className="text-primary font-headline-bold"
                                                    style={{ fontSize: isTablet ? 36 : 18 }}
                                                >
                                                    {player.name?.[0]?.toUpperCase() || '?'}
                                                </Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Info */}
                                    <View className="flex-1">
                                        <Text 
                                            className="text-[#594048] font-headline-bold" 
                                            style={{ fontSize: isTablet ? 32 : 16 }}
                                            numberOfLines={1}
                                        >
                                            {player.name}
                                        </Text>
                                        <Text 
                                            className="text-stone-400 font-body-medium mt-1.5"
                                            style={{ fontSize: isTablet ? 20 : 12 }}
                                        >
                                            {player.winCount} prize{player.winCount !== 1 ? 's' : ''} · {player.gamesPlayed} game{player.gamesPlayed !== 1 ? 's' : ''}
                                        </Text>
                                    </View>

                                    {/* Prize */}
                                    <View className="items-end">
                                        <Text
                                            className="font-headline-bold"
                                            style={{ 
                                                fontSize: isTablet ? 42 : 20,
                                                color: isTop3 ? '#b30069' : '#594048' 
                                            }}
                                        >
                                            ₹{player.totalWon.toLocaleString()}
                                        </Text>
                                        <Text 
                                            className="text-stone-300 font-body-medium"
                                            style={{ fontSize: isTablet ? 18 : 10 }}
                                        >total won</Text>
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
