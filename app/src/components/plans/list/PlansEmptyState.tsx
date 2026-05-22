import React from 'react';
import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { PlanTab } from './planTabs';

const emptyTitle: Record<PlanTab, string> = {
    active: 'No active plans',
    live: 'No live plans',
    past: 'No completed plans',
};

const PlansEmptyState = ({ activeTab }: { activeTab: PlanTab }) => (
    <View className="items-center py-16 px-6">
        <View className="w-20 h-20 bg-white rounded-full items-center justify-center mb-4 border border-stone-100">
            <MaterialIcons name="event-busy" size={38} color="#d6d3d1" />
        </View>
        <Text className="font-headline-bold text-[#1c1c18] text-lg text-center">
            {emptyTitle[activeTab]}
        </Text>
        <Text className="font-body-medium text-stone-400 text-center mt-2">
            Tap + to plan something with the group
        </Text>
    </View>
);

export default PlansEmptyState;
