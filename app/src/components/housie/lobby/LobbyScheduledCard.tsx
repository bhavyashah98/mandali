import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

interface LobbyScheduledCardProps {
    game: any;
    onPress: (game: any) => void;
}

export const LobbyScheduledCard = ({ game, onPress }: LobbyScheduledCardProps) => {
    const scheduledDate = new Date(game.scheduled_at);
    const timeString = scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateString = scheduledDate.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' });

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
                    <Text className="text-[#b30069] font-headline-bold text-lg">{scheduledDate.getDate()}</Text>
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
                    <Ionicons name="calendar-outline" size={16} color="#b30069" />
                    <Text className="text-stone-400 font-body-bold text-xs ml-2 uppercase tracking-tighter">{dateString}</Text>
                </View>
                <View className="flex-row items-center">
                    <Text className="text-[#b30069] font-body-bold text-sm mr-2">Pre-Join Lobby</Text>
                    <MaterialIcons name="chevron-right" size={20} color="#b30069" />
                </View>
            </View>
        </TouchableOpacity>
    );
};
