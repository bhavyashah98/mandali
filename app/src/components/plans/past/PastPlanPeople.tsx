import React from 'react';
import { Text, View } from 'react-native';
import type { PlanRsvpUser } from '../../../types/plans';
import PlanGoingAvatars from '../card/PlanGoingAvatars';

interface PastPlanPeopleProps {
    going: PlanRsvpUser[];
}

const PastPlanPeople = ({ going }: PastPlanPeopleProps) => (
    <View className="px-6 mt-7">
        <View className="flex-row items-center justify-between mb-3">
            <Text className="font-body-bold text-[#1c1c18]">Went ({going.length})</Text>
        </View>
        {going.length > 0 ? (
            <PlanGoingAvatars going={going} maxVisible={8} size="md" />
        ) : (
            <Text className="font-body-medium text-stone-400 text-sm">No going RSVPs were recorded.</Text>
        )}
    </View>
);

export default PastPlanPeople;
