import React, { useCallback } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import LivePlanHub from '../../components/plans/live/LivePlanHub';
import PastPlanOverview from '../../components/plans/past/PastPlanOverview';
import UpcomingPlanDetails from '../../components/plans/upcoming/UpcomingPlanDetails';
import { usePlanDetails } from '../../hooks/plans/usePlanDetails';

const PlanDetailsScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const planId = route.params?.planId as string | undefined;
    const { data: plan, isLoading, isError, refetch } = usePlanDetails(planId);

    useFocusEffect(
        useCallback(() => {
            if (planId) refetch();
        }, [planId, refetch])
    );

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-[#fdf9f3] items-center justify-center" edges={['top']}>
                <ActivityIndicator size="large" color="#b30069" />
            </SafeAreaView>
        );
    }

    if (isError || !plan) {
        return (
            <SafeAreaView className="flex-1 bg-[#fdf9f3] items-center justify-center px-8" edges={['top']}>
                <Text className="font-headline-bold text-[#1c1c18] text-xl text-center">Plan not found</Text>
                <Text className="font-body-medium text-stone-400 text-center mt-2">
                    This plan may have been removed or you do not have access.
                </Text>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className="mt-6 bg-[#b30069] rounded-2xl px-8 py-3"
                    activeOpacity={0.85}
                >
                    <Text className="font-body-bold text-white">Go back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    if (plan.status === 'live') return <LivePlanHub plan={plan} />;
    if (plan.status === 'past') return <PastPlanOverview plan={plan} />;
    return <UpcomingPlanDetails plan={plan} />;
};

export default PlanDetailsScreen;
