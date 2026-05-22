import React from 'react';
import { View, Text } from 'react-native';
import type { PlanRsvpUser } from '../../../types/plans';
import PlanGoingAvatars from '../card/PlanGoingAvatars';

interface UpcomingPeopleStripProps {
    going: PlanRsvpUser[];
}

const UpcomingPeopleStrip = ({ going }: UpcomingPeopleStripProps) => (
    <View className="px-6 mt-7">
        <View className="flex-row items-center justify-between mb-3">
            <Text className="font-body-bold text-[#1c1c18]">Going ({going.length})</Text>
        </View>
        <PlanGoingAvatars going={going} maxVisible={8} size="md" />
    </View>
);

export default UpcomingPeopleStrip;
