import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { usePlanRsvpActions } from '../../../hooks/plans/usePlanRsvpActions';
import { resolvePlanGoing } from '../../../hooks/plans/planGoing';
import type { PlanCardPlan } from '../PlanCard';
import UpcomingPlanHero from './UpcomingPlanHero';
import UpcomingPlanInfo from './UpcomingPlanInfo';
import UpcomingRsvpSection from './UpcomingRsvpSection';
import UpcomingSaveBar from './UpcomingSaveBar';
import UpcomingHypeTab from './UpcomingHypeTab';
import UpcomingBringTab from './UpcomingBringTab';
import UpcomingDetailsTab from './UpcomingDetailsTab';
import type { UpcomingRsvp } from './useUpcomingRsvp';

const UpcomingPlanDetails = ({ plan }: { plan: PlanCardPlan }) => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const isHost = !!plan.isHost;
    const hasRsvp = !!plan.hasRsvp;
    const { going } = resolvePlanGoing(plan);

    const [activeTab, setActiveTab] = useState<'hype' | 'bring' | 'details'>('details');

    const {
        rsvp,
        setRsvp,
        note,
        setNote,
        handleCancelPlan,
        updateRsvpDirectly,
        isSaving,
        isCanceling,
        rsvpLocked,
    } = usePlanRsvpActions(plan.id, isHost, hasRsvp, () => navigation.goBack());

    useEffect(() => {
        if (plan.myRsvp?.status) {
            setRsvp(plan.myRsvp.status as UpcomingRsvp);
        }
        if (plan.myRsvp?.note) {
            setNote(plan.myRsvp.note);
        }
    }, [plan.myRsvp, setRsvp, setNote]);

    return (
        <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top']}>
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 12) + 112 }}
                showsVerticalScrollIndicator={false}
                stickyHeaderIndices={[3]}
            >
                {/* 0. Hero */}
                <UpcomingPlanHero plan={plan} onBack={() => navigation.goBack()} />

                <UpcomingRsvpSection
                    plan={plan}
                    going={going}
                    myRsvpStatus={plan.myRsvp?.status || null}
                    updateRsvpDirectly={updateRsvpDirectly}
                    isSaving={isSaving}
                    isHost={isHost}
                />

                {/* 3. Sticky Tab Bar — matches PlansTabBar style with underline indicator */}
                <View className="bg-[#fdf9f3] pt-4 px-6">
                    <View className="flex-row border-b border-stone-200/70">
                        {([
                            { key: 'hype', icon: '🔥', label: 'Hype' },
                            { key: 'bring', icon: '🎒', label: 'Bring' },
                            { key: 'details', icon: '📋', label: 'Details' },
                        ] as const).map((tab) => {
                            const active = activeTab === tab.key;
                            return (
                                <TouchableOpacity
                                    key={tab.key}
                                    onPress={() => setActiveTab(tab.key)}
                                    className="flex-1 items-center py-3"
                                >
                                    <Text
                                        className={`font-body-bold text-sm ${active ? 'text-[#b30069]' : 'text-[#594048]'}`}
                                    >
                                        {tab.icon} {tab.label}
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

                {/* 4. Tab Content */}
                <View className="flex-1 pb-10">
                    {activeTab === 'hype' && <UpcomingHypeTab />}
                    {activeTab === 'bring' && <UpcomingBringTab plan={plan} />}
                    {activeTab === 'details' && <UpcomingDetailsTab plan={plan} />}
                </View>
            </ScrollView>

            {/* Render UpcomingSaveBar only for the Host (to cancel the plan) */}
            {isHost && (
                <UpcomingSaveBar
                    bottom={Math.max(insets.bottom, 12)}
                    isHost={isHost}
                    rsvpLocked={rsvpLocked}
                    onPress={handleCancelPlan}
                    loading={isCanceling}
                />
            )}
        </SafeAreaView>
    );
};

export default UpcomingPlanDetails;
