import React, { useCallback, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useIsTablet } from '../../hooks/useIsTablet';
import { usePlans } from '../../hooks/plans/usePlans';
import PlansHeader from '../../components/plans/list/PlansHeader';
import PlansSectionList from '../../components/plans/list/PlansSectionList';
import PlansTabBar from '../../components/plans/list/PlansTabBar';
import { PlanTab } from '../../components/plans/list/planTabs';
import { usePlanSections } from '../../components/plans/list/usePlanSections';
import { usePlanLiveSync } from '../../hooks/plans/usePlanLiveSync';

const PlansHomeScreen = () => {
    const navigation = useNavigation<any>();
    const isTablet = useIsTablet();
    const [activeTab, setActiveTab] = useState<PlanTab>('active');
    const { plans, isLoading, isRefetching, onRefresh, refetch } = usePlans(activeTab);
    const sections = usePlanSections(plans);
    usePlanLiveSync();

    useFocusEffect(
        useCallback(() => {
            refetch();
        }, [refetch])
    );

    return (
        <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top']}>
            <PlansHeader isTablet={isTablet} onCreate={() => navigation.navigate('CreatePlan')} />
            <PlansTabBar activeTab={activeTab} onChange={setActiveTab} isTablet={isTablet} />
            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#b30069" />
                </View>
            ) : (
                <PlansSectionList
                    sections={sections}
                    activeTab={activeTab}
                    isTablet={isTablet}
                    refreshing={isRefetching}
                    onRefresh={onRefresh}
                    onOpenPlan={(planId) => navigation.navigate('PlanDetails', { planId })}
                />
            )}
        </SafeAreaView>
    );
};

export default PlansHomeScreen;
