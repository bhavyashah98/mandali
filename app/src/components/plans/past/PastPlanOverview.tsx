import React from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { resolvePlanGoing } from '../../../hooks/plans/planGoing';
import type { PlanCardPlan } from '../PlanCard';
import PastNote from './PastNote';
import PastPlanHero from './PastPlanHero';
import PastPlanMeta from './PastPlanMeta';
import PastPlanPeople from './PastPlanPeople';
import PastPlanRecap from './PastPlanRecap';
import PastPlanTitle from './PastPlanTitle';
import PastStatsCard from './PastStatsCard';

const PastPlanOverview = ({ plan }: { plan: PlanCardPlan }) => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const { going, goingCount } = resolvePlanGoing(plan);

    return (
        <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top']}>
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 24 }}
                showsVerticalScrollIndicator={false}
            >
                <PastPlanHero plan={plan} onBack={() => navigation.goBack()} />
                <PastPlanTitle plan={plan} />
                <PastPlanMeta plan={plan} />
                <PastPlanPeople going={going} />
                <PastStatsCard plan={plan} goingCount={goingCount} />
                <PastPlanRecap plan={plan} />
                <PastNote plan={plan} />
                <View className="h-6" />
            </ScrollView>
        </SafeAreaView>
    );
};

export default PastPlanOverview;
