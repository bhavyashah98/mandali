import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../../stores/authStore';

interface LobbyGameCardProps {
    game: any;
    memberCount: number;
    onPress: (game: any) => void;
}

export const LobbyGameCard = ({ game, memberCount, onPress }: LobbyGameCardProps) => {

    const isLive = game.status === 'active';
    const isStarting = game.status === 'starting';
    const hasTicket = game.myTicketCount > 0;
    const { user } = useAuthStore();
    const isHost = user?.id === game.host_id;
    const isManual = game.settings?.callingMode === 'manual';

    let buttonLabel = 'Join Room';
    let buttonIcon: any = 'play';

    if (game.status === 'waiting') {
        buttonLabel = hasTicket ? 'Enter Lobby' : 'Get Tickets';
        buttonIcon = 'ticket-alt';
    } else if (isLive || isStarting) {
        if (isHost) {
            if (hasTicket) {
                buttonLabel = 'Play Now';
                buttonIcon = 'gamepad';
            } else if (isManual) {
                buttonLabel = 'Resume Host';
                buttonIcon = 'play-circle';
            } else {
                buttonLabel = 'Spectate';
                buttonIcon = 'eye';
            }
        } else {
            buttonLabel = hasTicket ? 'Play Now' : 'Spectate';
            buttonIcon = hasTicket ? 'gamepad' : 'eye';
        }
    }

    return (
        <TouchableOpacity
            onPress={() => onPress(game)}
            activeOpacity={0.9}
            style={{
                backgroundColor: 'white',
                shadowColor: '#b30069',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: isLive ? 0.08 : 0.03,
                shadowRadius: 15,
                elevation: 4
            }}
            className={`w-full rounded-[32px] p-6 mb-5 border ${isLive ? 'border-[#b30069]/20' : 'border-stone-100'}`}
        >
            <View className="flex-row items-start justify-between mb-4">
                <View className="flex-1 mr-4">
                    <View className="flex-row items-center mb-1">
                        <Text className="text-stone-800 font-headline-bold text-xl flex-shrink" numberOfLines={1}>
                            {game.title || 'Housie Room'}
                        </Text>
                        {hasTicket && (
                            <View className="ml-2 bg-green-50 p-1 rounded-full">
                                <MaterialIcons name="check-circle" size={14} color="#16a34a" />
                            </View>
                        )}
                    </View>
                    <Text className="text-stone-500 font-body text-sm">by {game.hostName}</Text>
                </View>

                {isLive ? (
                    <View className="bg-red-500 px-3 py-1.5 rounded-full flex-row items-center">
                        <View className="w-2 h-2 bg-white rounded-full mr-2" />
                        <Text className="text-white font-headline-bold text-[10px] tracking-widest">LIVE</Text>
                    </View>
                ) : isStarting ? (
                    <View className="bg-orange-500 px-3 py-1.5 rounded-full">
                        <Text className="text-white font-headline-bold text-[10px] tracking-widest">STARTING</Text>
                    </View>
                ) : (
                    <View className="bg-blue-50 px-3 py-1.5 rounded-full">
                        <Text className="text-blue-600 font-headline-bold text-[10px] tracking-widest">OPEN</Text>
                    </View>
                )}
            </View>

            <View className="flex-row items-center justify-between mt-2">
                <View className="flex-row items-center">
                    <View className="flex-row items-center mr-4">
                        <Ionicons name="people" size={16} color="#a09d96" />
                        <Text className="text-stone-400 font-body-bold text-xs ml-1">
                            {game.participantCount || 0}/{memberCount}
                        </Text>
                    </View>

                    {hasTicket && (
                        <Text className="text-green-600 font-body-bold text-xs">
                            {game.myTicketCount} ticket{game.myTicketCount > 1 ? 's' : ''}
                        </Text>
                    )}
                </View>

                <LinearGradient
                    colors={['#b30069', '#d4007d']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    className="rounded-2xl"
                >
                    <View className="px-5 py-2.5 flex-row items-center">
                        <FontAwesome5 name={buttonIcon} size={14} color="white" />
                        <Text className="text-white font-headline-bold ml-2 text-sm">{buttonLabel}</Text>
                    </View>
                </LinearGradient>
            </View>
        </TouchableOpacity>
    );
};
