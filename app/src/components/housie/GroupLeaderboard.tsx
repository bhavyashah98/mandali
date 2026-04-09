import React from 'react';
import { View, Text, ActivityIndicator, Image, ScrollView } from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { API_URL, getAuthHeaders } from '../../lib/api';
import axios from 'axios';

interface GroupLeaderboardProps {
    groupId: string;
}

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];
const RANK_BG = ['bg-yellow-50', 'bg-stone-50', 'bg-orange-50'];
const RANK_BORDER = ['border-yellow-200', 'border-stone-200', 'border-orange-200'];

const GroupLeaderboard = ({ groupId }: GroupLeaderboardProps) => {
    const { data, isLoading } = useQuery({
        queryKey: ['groupLeaderboard', groupId],
        queryFn: async () => {
            const headers = await getAuthHeaders();
            const response = await axios.get(
                `${API_URL}/housie/group/${groupId}/leaderboard`,
                { headers }
            );
            return response.data;
        },
        enabled: !!groupId,
        staleTime: 30_000, // 30s — refreshed after each game via invalidation
    });

    const leaderboard: any[] = data?.leaderboard || [];

    return (
        <View className="mt-6 mb-2">
            {/* Section Header */}
            <View className="flex-row items-center justify-between px-1 mb-4">
                <View className="flex-row items-center gap-2">
                    <FontAwesome5 name="trophy" size={14} color="#b30069" />
                    <Text className="text-[#594048] font-headline-bold text-lg ml-2">
                        All-Time Leaderboard
                    </Text>
                </View>
                <View className="bg-primary/10 px-3 py-1 rounded-full">
                    <Text className="text-primary font-body-bold text-[10px] uppercase tracking-widest">
                        This Mandali
                    </Text>
                </View>
            </View>

            {isLoading ? (
                <View className="items-center py-10">
                    <ActivityIndicator color="#b30069" />
                </View>
            ) : leaderboard.length === 0 ? (
                /* Empty State */
                <View className="bg-white rounded-[32px] p-8 items-center border border-stone-100 shadow-sm">
                    <View className="w-16 h-16 rounded-full bg-primary/5 items-center justify-center mb-4">
                        <FontAwesome5 name="trophy" size={28} color="#e8c4d8" />
                    </View>
                    <Text className="text-[#594048] font-headline-bold text-lg mb-1 text-center">
                        No wins yet!
                    </Text>
                    <Text className="text-stone-400 font-body-medium text-sm text-center leading-5">
                        Play your first Housie session to start building the leaderboard.
                    </Text>
                </View>
            ) : (
                <View className="gap-3">
                    {leaderboard.map((player: any, index: number) => {
                        const isTop3 = index < 3;
                        const medalColor = MEDAL_COLORS[index];
                        const rowBg = isTop3 ? RANK_BG[index] : 'bg-white';
                        const rowBorder = isTop3 ? RANK_BORDER[index] : 'border-stone-100';

                        return (
                            <View
                                key={player.userId}
                                className={`flex-row items-center p-4 rounded-[24px] border ${rowBg} ${rowBorder} shadow-sm`}
                                style={isTop3 ? { elevation: 2 } : {}}
                            >
                                {/* Rank */}
                                <View className="w-9 items-center mr-3">
                                    {isTop3 ? (
                                        <MaterialIcons
                                            name="emoji-events"
                                            size={26}
                                            color={medalColor}
                                        />
                                    ) : (
                                        <Text className="text-stone-400 font-headline-bold text-base">
                                            {index + 1}
                                        </Text>
                                    )}
                                </View>

                                {/* Avatar */}
                                <View className="w-12 h-12 rounded-full bg-stone-100 mr-3 overflow-hidden border-2 border-white shadow-sm">
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

                                {/* Name + Stats */}
                                <View className="flex-1">
                                    <Text
                                        className="text-[#594048] font-headline-bold text-base"
                                        numberOfLines={1}
                                    >
                                        {player.name}
                                    </Text>
                                    <Text className="text-stone-400 font-body-medium text-xs mt-0.5">
                                        {player.winCount} prize{player.winCount !== 1 ? 's' : ''} · {player.gamesPlayed} game{player.gamesPlayed !== 1 ? 's' : ''}
                                    </Text>
                                </View>

                                {/* Prize Amount */}
                                <View className={`items-end`}>
                                    <Text className={`font-headline-bold text-lg ${isTop3 ? 'text-primary' : 'text-[#594048]'}`}>
                                        ₹{player.totalWon.toLocaleString()}
                                    </Text>
                                    <Text className="text-stone-300 font-body-medium text-[10px]">
                                        total won
                                    </Text>
                                </View>
                            </View>
                        );
                    })}
                </View>
            )}
        </View>
    );
};

export default GroupLeaderboard;
