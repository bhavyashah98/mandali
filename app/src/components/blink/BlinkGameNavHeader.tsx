import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { fetchBlinkGame, endBlinkGame, fetchGroupDetail } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

interface BlinkGameNavHeaderProps {
    gameCode: string;
    groupId: string;
}

export const BlinkGameNavHeader = ({ gameCode, groupId }: BlinkGameNavHeaderProps) => {
    const { user } = useAuthStore();
    const navigation = useNavigation<any>();

    const { data } = useQuery({
        queryKey: ['blinkGame', gameCode],
        queryFn: () => fetchBlinkGame(gameCode),
        enabled: !!gameCode,
    });

    const { data: groupData } = useQuery({
        queryKey: ['group', groupId],
        queryFn: () => fetchGroupDetail(groupId),
        enabled: !!groupId,
    });

    const game = data?.game;
    const groupName = groupData?.group?.name;
    const isHost = game && user ? game.host_id === user.id : false;

    // Build a compact info line from game settings
    const infoTokens: string[] = [];
    if (game?.cards_per_player) infoTokens.push(`${game.cards_per_player} cards`);
    if (game?.symbols_per_card) infoTokens.push(`${game.symbols_per_card} symbols`);
    const infoLine = infoTokens.join(' · ');

    const handleGameOver = () => {
        Alert.alert(
            'End Game?',
            'Are you sure you want to finish this Blink session?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Finish Game', style: 'destructive', onPress: async () => { 
                    try {
                        await endBlinkGame(gameCode);
                    } catch (e) {
                        console.error("Failed to end game early", e);
                    } finally {
                        navigation.replace('BlinkLeaderboard', { gameId: game?.id, groupId }); 
                    }
                } },
            ]
        );
    };

    return (
        <View className="flex-row items-center justify-between px-5 py-2">
            {/* ── Back ── */}
            <TouchableOpacity
                onPress={() => navigation.goBack()}
                className="w-9 h-9 items-center justify-center rounded-full bg-white border border-stone-100"
                style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}
            >
                <MaterialIcons name="arrow-back-ios" size={16} color="#594048" style={{ marginLeft: 4 }} />
            </TouchableOpacity>

            {/* ── Center ── */}
            <View className="items-center flex-1 mx-3">
                <Text className="text-[#594048] font-body-bold text-stone-400 uppercase tracking-widest text-[9px]" numberOfLines={1}>
                    {groupName || 'Blink'} • {game?.hostName || 'Host'}
                </Text>
                {!!infoLine && (
                    <Text className="text-[12px] font-body-bold" numberOfLines={1}>
                        {infoLine}
                    </Text>
                )}
            </View>

            {/* ── Right: Finish (host) or spacer ── */}
            <View>
                {isHost && (
                    <TouchableOpacity
                        onPress={handleGameOver}
                        className="bg-red-50 px-2 py-1.5 rounded-xl border border-red-100 flex-row items-center"
                    >
                        <MaterialIcons name="power-settings-new" size={13} color="#dc2626" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};
