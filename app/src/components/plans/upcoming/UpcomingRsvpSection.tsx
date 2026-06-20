import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import type { PlanCardPlan } from '../PlanCard';
import type { PlanRsvpUser, PlanRsvpStatus } from '../../../types/plans';
import type { UpcomingRsvp } from './useUpcomingRsvp';
import RsvpChoiceButtons from './RsvpChoiceButtons';
import RsvpProgress from './RsvpProgress';
import RsvpSocialHeader from './RsvpSocialHeader';
import RsvpSocialModal from './RsvpSocialModal';
import RsvpStatusPill from './RsvpStatusPill';

type UpcomingRsvpSectionProps = {
    plan: PlanCardPlan;
    going: PlanRsvpUser[];
    myRsvpStatus: PlanRsvpStatus | null;
    updateRsvpDirectly: (status: UpcomingRsvp) => void;
    isSaving: boolean;
    isHost: boolean;
};

const UpcomingRsvpSection = ({
    plan,
    going,
    myRsvpStatus,
    updateRsvpDirectly,
    isSaving,
    isHost,
}: UpcomingRsvpSectionProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [showSocial, setShowSocial] = useState(false);

    const totalMembers = plan.memberCount || Math.max(going.length + 5, 12);
    const goingCount = going.length;
    const creatorWaiting = plan.createdBy && !going.some((g) => g.userId === plan.createdBy);
    const keyWaitingName = creatorWaiting ? plan.creatorName || 'the host' : null;

    const showSelection = !isHost && (myRsvpStatus === null || isEditing);

    const handleSelectOption = async (option: UpcomingRsvp) => {
        updateRsvpDirectly(option);
        setIsEditing(false);
    };

    return (
        <View
            className="bg-white border border-stone-100 rounded-[28px] p-6 mx-6 mt-6 shadow-sm"
            style={{ shadowColor: '#b30069', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 }}
        >
            <RsvpSocialHeader going={going} goingCount={goingCount} keyWaitingName={keyWaitingName} onPress={() => setShowSocial(true)} />
            <RsvpProgress goingCount={goingCount} totalMembers={totalMembers} />

            <View style={{ minHeight: 88 }} className="justify-center">
                {isSaving ? (
                    <View className="items-center justify-center py-4">
                        <ActivityIndicator size="small" color="#b30069" />
                    </View>
                ) : showSelection ? (
                    <RsvpChoiceButtons onSelect={handleSelectOption} />
                ) : (
                    <RsvpStatusPill isHost={isHost} status={myRsvpStatus} onEdit={() => setIsEditing(true)} />
                )}
            </View>
            <RsvpSocialModal
                visible={showSocial}
                going={going}
                goingCount={goingCount}
                totalMembers={totalMembers}
                keyWaitingName={keyWaitingName}
                onClose={() => setShowSocial(false)}
            />
        </View>
    );
};

export default UpcomingRsvpSection;
