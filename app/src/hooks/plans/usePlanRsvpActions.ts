import { useState } from 'react';
import { Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cancelPlan, submitPlanRsvp } from '../../lib/api';
import type { PlanRsvpStatus } from '../../types/plans';
import type { UpcomingRsvp } from '../../components/plans/upcoming/useUpcomingRsvp';

export function usePlanRsvpActions(planId: string, isHost: boolean, hasRsvp: boolean, onCanceled: () => void) {
    const queryClient = useQueryClient();
    const [rsvp, setRsvp] = useState<UpcomingRsvp>('going');
    const [note, setNote] = useState('');

    const rsvpMutation = useMutation({
        mutationFn: () => submitPlanRsvp(planId, { status: rsvp as PlanRsvpStatus, note: note.trim() || undefined }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plan', planId] });
            queryClient.invalidateQueries({ queryKey: ['plans'] });
            Alert.alert('RSVP saved', 'Your response has been recorded.');
        },
        onError: (err: any) => {
            Alert.alert('Error', err?.response?.data?.error || err?.message || 'Failed to save RSVP');
        },
    });

    const cancelMutation = useMutation({
        mutationFn: () => cancelPlan(planId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plans'] });
            Alert.alert('Plan canceled', 'This plan has been removed.', [{ text: 'OK', onPress: onCanceled }]);
        },
        onError: (err: any) => {
            Alert.alert('Error', err?.response?.data?.error || err?.message || 'Failed to cancel plan');
        },
    });

    const handleSaveRsvp = () => {
        if (hasRsvp) return;
        rsvpMutation.mutate();
    };

    const handleCancelPlan = () => {
        Alert.alert(
            'Cancel plan?',
            'This will remove the plan for everyone in your Mandali.',
            [
                { text: 'Keep plan', style: 'cancel' },
                { text: 'Cancel plan', style: 'destructive', onPress: () => cancelMutation.mutate() },
            ]
        );
    };

    return {
        rsvp,
        setRsvp,
        note,
        setNote,
        handleSaveRsvp,
        handleCancelPlan,
        isSaving: rsvpMutation.isPending,
        isCanceling: cancelMutation.isPending,
        rsvpLocked: hasRsvp && !isHost,
    };
}
