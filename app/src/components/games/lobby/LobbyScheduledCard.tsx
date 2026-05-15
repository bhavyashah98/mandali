import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

interface LobbyScheduledCardProps {
    game: any;
    memberCount: number;
    onPress: (game: any) => void;
    activeColor?: string;
}

export const LobbyScheduledCard = ({ game, memberCount, onPress, activeColor = '#b30069' }: LobbyScheduledCardProps) => {

    const scheduledDate = new Date(game.scheduled_at);
    const timeString = scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateString = scheduledDate.toLocaleDateString([], { weekday: 'short' });

    return (
        <TouchableOpacity
            onPress={() => onPress(game)}
            activeOpacity={0.9}
            style={{
                backgroundColor: 'white',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.04,
                shadowRadius: 10,
                elevation: 2
            }}
            className="w-full rounded-[32px] p-6 mb-5 border border-stone-100"
        >
            <View className="flex-row items-center">
                <View className="w-16 h-16 bg-stone-50 rounded-2xl items-center justify-center mr-4">
                    <Text 
                        style={{ color: activeColor }}
                        className="font-headline-bold text-lg"
                    >{scheduledDate.getDate()}</Text>
                    <Text className="text-stone-400 font-body-bold text-[10px] uppercase">{scheduledDate.toLocaleDateString([], { month: 'short' })}</Text>
                </View>

                <View className="flex-1">
                    <Text className="text-stone-800 font-headline-bold text-lg mb-1" numberOfLines={1}>
                        {game.title || 'Upcoming Game'}
                    </Text>
                    <Text className="text-stone-500 font-body text-sm">Hosted by {game.hostName}</Text>
                </View>

                <View className="items-end bg-stone-50 p-3 rounded-2xl">
                    <Text className="text-stone-800 font-headline-bold text-md">{timeString}</Text>
                </View>
            </View>

            <View className="w-full h-[1px] bg-stone-50 my-4" />

            <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                    <Ionicons name="calendar-outline" size={16} color={activeColor} />
                    <Text className="text-stone-400 font-body-bold text-xs ml-2 uppercase tracking-tighter mr-4">{dateString}</Text>

                    <View className="flex-row items-center">
                        <Ionicons name="people" size={16} color="#a09d96" />
                        <Text className="text-stone-400 font-body-bold text-xs ml-1">
                            {game.participantCount || 0}/{memberCount}
                        </Text>
                    </View>
                </View>

                <View className="flex-row items-center">
                    <Text style={{ color: activeColor }} className="font-body-bold text-sm mr-2">Pre-Join Lobby</Text>
                    <MaterialIcons name="chevron-right" size={20} color={activeColor} />
                </View>
            </View>
        </TouchableOpacity>
    );
};
