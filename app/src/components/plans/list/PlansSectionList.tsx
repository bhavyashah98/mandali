import React from 'react';
import { Text, SectionList, RefreshControl } from 'react-native';
import PlanCard, { PlanCardPlan } from '../PlanCard';
import PlansEmptyState from './PlansEmptyState';
import type { PlanTab } from './planTabs';

interface PlansSectionListProps {
    sections: { title: string; data: PlanCardPlan[] }[];
    activeTab: PlanTab;
    isTablet: boolean;
    refreshing?: boolean;
    onRefresh?: () => void;
    onOpenPlan: (planId: string) => void;
}

const PlansSectionList = ({ sections, activeTab, isTablet, refreshing, onRefresh, onOpenPlan }: PlansSectionListProps) => (
    <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 110, flexGrow: 1 }}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        refreshControl={
            onRefresh ? (
                <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor="#b30069" colors={['#b30069']} />
            ) : undefined
        }
        ListEmptyComponent={<PlansEmptyState activeTab={activeTab} />}
        renderSectionHeader={({ section }) => (
            <Text className="font-body-bold text-[#594048] mb-3 mt-3 text-xs uppercase tracking-widest">
                {section.title}
            </Text>
        )}
        renderItem={({ item }) => (
            <PlanCard
                plan={item}
                isTablet={isTablet}
                showLiveBadge={activeTab === 'live'}
                onPress={() => onOpenPlan(item.id)}
            />
        )}
    />
);

export default PlansSectionList;
