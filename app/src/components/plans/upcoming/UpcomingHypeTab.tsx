import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useAuthStore } from '../../../stores/authStore';
import { usePlanHype } from '../../../hooks/plans/usePlanHype';
import { usePlanHypeActions } from '../../../hooks/plans/usePlanHypeActions';
import type { PlanCardPlan } from '../PlanCard';
import HypeFeedCard from './hype/HypeFeedCard';
import OutfitCard from './hype/OutfitCard';
import PredictionsCard from './hype/PredictionsCard';
import ShoutoutWall from './hype/ShoutoutWall';

const UpcomingHypeTab = ({ plan }: { plan: PlanCardPlan }) => {
    const { user } = useAuthStore();
    const { data, isLoading, isError } = usePlanHype(plan.id);
    const actions = usePlanHypeActions(plan.id);

    if (isLoading) {
        return (
            <View className="items-center justify-center py-12">
                <ActivityIndicator color="#b30069" />
            </View>
        );
    }

    if (isError || !data) {
        return (
            <View className="items-center justify-center px-6 py-12">
                <Text className="font-headline-bold text-lg text-[#1c1c18]">Hype is warming up</Text>
                <Text className="mt-2 text-center font-body-medium text-sm text-[#8a7a80]">
                    Could not load the hype tab right now.
                </Text>
            </View>
        );
    }

    return (
        <View className="bg-[#fafaf9] px-5 pb-24 pt-6">
            <PredictionsCard
                members={data.members}
                questions={data.predictionQuestions}
                votes={data.predictionVotes}
                currentUserId={user?.id}
                onVote={(questionId, targetUserId) => actions.votePrediction({ questionId, targetUserId })}
            />
            <HypeFeedCard feed={data.feed} />
            <OutfitCard
                outfits={data.outfits}
                currentUserId={user?.id}
                dressCode={data.dressCode}
                saving={actions.isSavingOutfit}
                savingDressCode={actions.isSavingDressCode}
                onSave={actions.saveOutfit}
                onSaveDressCode={actions.saveDressCode}
            />
            <ShoutoutWall
                shoutouts={data.shoutouts}
                currentUserId={user?.id}
                adding={actions.isAddingShoutout}
                onAdd={actions.addShoutout}
                onReact={(shoutoutId, emoji) => actions.reactToShoutout({ shoutoutId, emoji })}
            />
        </View>
    );
};

export default UpcomingHypeTab;
