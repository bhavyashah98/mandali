import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { PLAN_TABS, PlanTab } from './planTabs';

interface PlansTabBarProps {
    activeTab: PlanTab;
    onChange: (tab: PlanTab) => void;
    isTablet: boolean;
}

const PlansTabBar = ({ activeTab, onChange, isTablet }: PlansTabBarProps) => (
    <View className="px-6 mb-3">
        <View className="flex-row border-b border-stone-200/70">
            {PLAN_TABS.map((tab) => {
                const active = activeTab === tab.key;
                return (
                    <TouchableOpacity key={tab.key} onPress={() => onChange(tab.key)} className="flex-1 items-center py-3">
                        <Text
                            className={`font-body-bold ${active ? 'text-[#b30069]' : 'text-[#594048]'}`}
                            style={{ fontSize: isTablet ? 16 : 13 }}
                        >
                            {tab.label}
                        </Text>
                        <View
                            className={`absolute bottom-0 h-[2px] rounded-full ${active ? 'bg-[#b30069]' : 'bg-transparent'}`}
                            style={{ width: '70%' }}
                        />
                    </TouchableOpacity>
                );
            })}
        </View>
    </View>
);

export default PlansTabBar;
