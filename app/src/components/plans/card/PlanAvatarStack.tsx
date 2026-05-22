import React from 'react';
import { View, Text } from 'react-native';
import type { PlanRsvpUser } from '../../../types/plans';
import PlanGoingAvatars from './PlanGoingAvatars';

const PlanAvatarStack = ({ going, goingCount }: { going?: PlanRsvpUser[]; goingCount?: number }) => {
    const list = going ?? [];
    const count = goingCount ?? list.length;

    return (
        <View className="flex-row items-center justify-between">
            <PlanGoingAvatars going={list} maxVisible={5} size="sm" />
            <Text className="font-body-bold text-[#594048] text-xs">{count} Going</Text>
        </View>
    );
};

export default PlanAvatarStack;
