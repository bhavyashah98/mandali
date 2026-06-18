import { Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    addHypeShoutout,
    betHypeCancel,
    reactToHypeShoutout,
    saveHypeDressCode,
    saveHypeOutfit,
    voteHypeShow,
    voteHypePrediction,
} from '../../lib/planHypeApi';

export function usePlanHypeActions(planId: string) {
    const queryClient = useQueryClient();
    const queryKey = ['plan-hype', planId];
    const refresh = () => queryClient.invalidateQueries({ queryKey });
    const onError = (fallback: string) => (err: any) => {
        Alert.alert('Hype check', err?.response?.data?.error || fallback);
    };

    const outfit = useMutation({
        mutationFn: (text: string) => saveHypeOutfit(planId, text),
        onSuccess: refresh,
        onError: onError('Could not save outfit.'),
    });
    const shoutout = useMutation({
        mutationFn: (message: string) => addHypeShoutout(planId, message),
        onSuccess: refresh,
        onError: onError('Could not add shoutout.'),
    });
    const dressCode = useMutation({
        mutationFn: (text: string) => saveHypeDressCode(planId, text),
        onSuccess: refresh,
        onError: onError('Could not save dress code.'),
    });
    const reaction = useMutation({
        mutationFn: (input: { shoutoutId: string; emoji: string }) =>
            reactToHypeShoutout(planId, input.shoutoutId, input.emoji),
        onSuccess: refresh,
    });
    const showVote = useMutation({
        mutationFn: (input: { targetUserId: string; vote: boolean }) =>
            voteHypeShow(planId, input.targetUserId, input.vote),
        onSuccess: refresh,
    });
    const cancelBet = useMutation({
        mutationFn: (targetUserId: string) => betHypeCancel(planId, targetUserId),
        onSuccess: refresh,
    });
    const predictionVote = useMutation({
        mutationFn: (input: { questionId: string; targetUserId: string }) =>
            voteHypePrediction(planId, input.questionId, input.targetUserId),
        onSuccess: refresh,
    });

    return {
        saveOutfit: outfit.mutate,
        saveDressCode: dressCode.mutate,
        addShoutout: shoutout.mutate,
        reactToShoutout: reaction.mutate,
        voteShow: showVote.mutate,
        betCancel: cancelBet.mutate,
        votePrediction: predictionVote.mutate,
        isSavingOutfit: outfit.isPending,
        isSavingDressCode: dressCode.isPending,
        isAddingShoutout: shoutout.isPending,
    };
}
