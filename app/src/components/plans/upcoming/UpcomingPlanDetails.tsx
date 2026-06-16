import React, { useEffect } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { usePlanRsvpActions } from '../../../hooks/plans/usePlanRsvpActions';
import { resolvePlanGoing } from '../../../hooks/plans/planGoing';
import type { PlanCardPlan } from '../PlanCard';
import UpcomingPeopleStrip from './UpcomingPeopleStrip';
import UpcomingPlanHero from './UpcomingPlanHero';
import UpcomingPlanInfo from './UpcomingPlanInfo';
import UpcomingRsvpSection from './UpcomingRsvpSection';
import UpcomingSaveBar from './UpcomingSaveBar';
import type { UpcomingRsvp } from './useUpcomingRsvp';

const UpcomingPlanDetails = ({ plan }: { plan: PlanCardPlan }) => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const isHost = !!plan.isHost;
    const hasRsvp = !!plan.hasRsvp;
    const { going } = resolvePlanGoing(plan);

    const {
        rsvp,
        setRsvp,
        note,
        setNote,
        handleSaveRsvp,
        handleCancelPlan,
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
            >
                <UpcomingPlanHero plan={plan} onBack={() => navigation.goBack()} />
                <UpcomingPlanInfo plan={plan} />
                <UpcomingPeopleStrip going={going} />
                {plan.description?.trim() ? (
                    <View className="px-6 mt-7">
                        <Text className="font-body-bold text-[#1c1c18] mb-2">About this plan</Text>
                        <Text className="font-body-medium text-[#594048] leading-5">{plan.description}</Text>
                    </View>
                ) : null}
                {plan.groupDescription?.trim() ? (
                    <View className="px-6 mt-7">
                        <Text className="font-body-bold text-[#1c1c18] mb-2">About the Mandali</Text>
                        <Text className="font-body-medium text-[#594048] leading-5">{plan.groupDescription}</Text>
                    </View>
                ) : null}
                {!isHost && (
                    <UpcomingRsvpSection
                        rsvp={rsvp}
                        setRsvp={setRsvp}
                        note={note}
                        setNote={setNote}
                        locked={rsvpLocked}
                        lockedStatus={plan.myRsvp?.status as UpcomingRsvp | undefined}
                    />
                )}
                {isHost && hasRsvp && (
                    <View className="px-6 mt-7">
                        <Text className="font-body-medium text-stone-400 text-sm">
                            You&apos;re going — you created this plan.
                        </Text>
                    </View>
                )}
            </ScrollView>
            <UpcomingSaveBar
                bottom={Math.max(insets.bottom, 12)}
                isHost={isHost}
                rsvpLocked={rsvpLocked}
                onPress={isHost ? handleCancelPlan : handleSaveRsvp}
                loading={isSaving || isCanceling}
            />
        </SafeAreaView>
    );
};

export default UpcomingPlanDetails;
