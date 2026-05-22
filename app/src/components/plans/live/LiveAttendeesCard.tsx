import React from 'react';
import { View, Text } from 'react-native';
import type { PlanRsvpUser } from '../../../types/plans';
import PlanGoingAvatars from '../card/PlanGoingAvatars';

const cardStyle = {
    shadowColor: '#b30069',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
};

interface LiveAttendeesCardProps {
    going: PlanRsvpUser[];
}

const LiveAttendeesCard = ({ going }: LiveAttendeesCardProps) => (
    <View className="mx-6 mt-6 bg-white border border-stone-100 rounded-[20px] px-5 py-5" style={cardStyle}>
        <View className="flex-row items-center justify-between mb-3">
            <Text className="font-body-bold text-[#1c1c18]">Going ({going.length})</Text>
            <View className="rounded-full bg-[#ffe3f2] px-3 py-1">
                <Text className="font-body-bold text-[#b30069] text-xs">Live now</Text>
            </View>
        </View>
        {going.length > 0 ? (
            <PlanGoingAvatars going={going} maxVisible={8} size="md" />
        ) : (
            <Text className="font-body-medium text-stone-400 text-sm">No one has RSVP&apos;d going yet.</Text>
        )}
    </View>
);

export default LiveAttendeesCard;
