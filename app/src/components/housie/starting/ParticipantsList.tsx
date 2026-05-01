import React from 'react';
import { View, Text } from 'react-native';

interface ParticipantsListProps {
    participants: any[];
}

const ParticipantsList: React.FC<ParticipantsListProps> = ({ participants }) => {
    return (
        <View>
            {participants.map((player: any, idx: number) => (
                <View
                    key={player.id || idx}
                    className="flex-row items-center border-b border-stone-100 py-4 mb-1"
                >
                    <View className="w-10 h-10 rounded-full bg-pink-100 items-center justify-center border border-pink-200">
                        <Text className="font-headline-bold" style={{ color: '#b30069' }}>{player.name?.charAt(0)}</Text>
                    </View>
                    <View className="flex-1 ml-4">
                        <Text className="font-headline-bold text-[15px]" style={{ color: '#1c1c18' }}>{player.name}</Text>
                        <Text className="text-stone-400 font-body-medium text-[11px]">{player.ticketCount} Tickets • Confirmed</Text>
                    </View>
                </View>
            ))}
        </View>
    );
};

export default React.memo(ParticipantsList);
