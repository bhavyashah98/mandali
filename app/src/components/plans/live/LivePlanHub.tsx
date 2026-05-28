import React from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePlanFeatureNav } from '../../../hooks/plans/usePlanFeatureNav';
import { resolvePlanGoing } from '../../../hooks/plans/planGoing';
import { completePlan } from '../../../lib/api';
import type { PlanCardPlan } from '../PlanCard';
import LiveAttendeesCard from './LiveAttendeesCard';
import LivePlanActionsCard from './LivePlanActionsCard';
import LivePlanHero from './LivePlanHero';
import LivePlanInfoCard from './LivePlanInfoCard';

const LivePlanHub = ({ plan }: { plan: PlanCardPlan }) => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const queryClient = useQueryClient();
    const { openAction } = usePlanFeatureNav(plan.groupId, plan.groupName, plan.id);
    const { going } = resolvePlanGoing(plan);
    const completeMutation = useMutation({
        mutationFn: () => completePlan(plan.id),
        onSuccess: (data) => {
            queryClient.setQueryData(['plan', plan.id], data);
            queryClient.invalidateQueries({ queryKey: ['plan', plan.id] });
            queryClient.invalidateQueries({ queryKey: ['plans'] });
            Alert.alert('Plan completed', 'This plan has been moved to completed.');
        },
        onError: (err: any) => {
            Alert.alert('Error', err?.response?.data?.error || err?.message || 'Failed to complete plan');
        },
    });

    const handleCompletePlan = () => {
        Alert.alert(
            'Mark as completed?',
            'This will move the live plan to completed for everyone.',
            [
                { text: 'Keep live', style: 'cancel' },
                { text: 'Mark completed', style: 'destructive', onPress: () => completeMutation.mutate() },
            ]
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top']}>
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 18) + 26 }}
                showsVerticalScrollIndicator={false}
            >
                <LivePlanHero plan={plan} onBack={() => navigation.goBack()} />
                <LivePlanInfoCard plan={plan} />
                <LiveAttendeesCard going={going} />
                <LivePlanActionsCard onActionPress={openAction} />
                {plan.isHost ? (
                    <View className="mx-6 mt-6">
                        <TouchableOpacity
                            onPress={handleCompletePlan}
                            disabled={completeMutation.isPending}
                            activeOpacity={0.85}
                            className="rounded-[18px] border border-[#f7cfe3] bg-white px-5 py-4 items-center"
                        >
                            <Text className="font-body-bold text-[#b30069]">
                                {completeMutation.isPending ? 'Completing plan...' : 'Mark as Completed'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : null}
                <View className="h-4" />
            </ScrollView>
        </SafeAreaView>
    );
};

export default LivePlanHub;
