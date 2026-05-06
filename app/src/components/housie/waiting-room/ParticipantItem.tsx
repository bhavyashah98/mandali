import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { getOptimizedImageUrl } from '../../../lib/api';

import { Ionicons } from '@expo/vector-icons';

interface ParticipantItemProps {
    participant: any;
    hostId: string;
    isTablet: boolean;
    isCurrentUser?: boolean;
    onEdit?: () => void;
}

const ParticipantItem: React.FC<ParticipantItemProps> = ({
    participant,
    hostId,
    isTablet,
    isCurrentUser,
    onEdit
}) => {
    const isParticipantHost = participant.id === hostId;

    return (
        <View
            style={{ 
                elevation: isCurrentUser ? 4 : 2, 
                shadowColor: isCurrentUser ? '#b30069' : '#000', 
                shadowOffset: { width: 0, height: isCurrentUser ? 2 : 1 }, 
                shadowOpacity: isCurrentUser ? 0.15 : 0.05, 
                shadowRadius: isCurrentUser ? 4 : 2 
            }}
            className={`flex-row items-center border mb-4 ${isTablet ? 'rounded-3xl p-8' : 'rounded-2xl p-4'} ${isCurrentUser ? 'bg-pink-50/50 border-[#b30069]/30' : 'bg-white border-stone-100'}`}
        >

            <View className={`rounded-full bg-stone-50 items-center justify-center overflow-hidden border border-stone-100 ${isTablet ? 'w-24 h-24' : 'w-12 h-12'}`}>
                {participant.avatar ? (
                    <Image source={{ uri: getOptimizedImageUrl(participant.avatar, 'w_150,q_auto,f_auto') }} className="w-full h-full" />
                ) : (
                    <Text className={`text-primary font-headline-bold ${isTablet ? 'text-5xl' : 'text-lg'}`}>{participant.name[0]}</Text>
                )}
            </View>
            <View className="ml-4 flex-1">
                <View className="flex-row items-center">
                    <Text className={`font-headline-bold text-[#594048] ${isTablet ? 'text-3xl' : 'text-base'}`}>{participant.name}</Text>
                    {isParticipantHost && (
                        <View
                            style={{ backgroundColor: 'rgba(179, 0, 105, 0.1)' }}
                            className="px-2 py-0.5 rounded-md ml-2"
                        >
                            <Text className="text-primary font-body-bold text-2xs uppercase">Host</Text>
                        </View>
                    )}
                </View>
                <Text className={`text-stone-400 font-body-medium ${isTablet ? 'text-xl mt-1' : 'text-xs'}`}>
                    {participant.ticketCount} {participant.ticketCount === 1 ? 'Ticket' : 'Tickets'} Bought
                </Text>
            </View>

            {isCurrentUser && (
                <TouchableOpacity
                    onPress={onEdit}
                    className="w-10 h-10 rounded-full bg-stone-50 items-center justify-center border border-stone-100"
                >
                    <Ionicons name="pencil" size={18} color="#b30069" />
                </TouchableOpacity>
            )}
        </View>
    );
};

export default ParticipantItem;
