import { useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPlan, updatePlan } from '../../../lib/api';
import type { AsyncSelectItem } from '../PlanAsyncSelect';
import type { SelectedPlanActivity } from '../PlanActivitySelector';
import type { PlanLocationValue } from '../PlanLocationPicker';
import { defaultPlanTime, mergeDateAndTime } from './createPlanDate';

interface EditablePlan {
    id: string;
    groupId: string;
    groupName: string;
    groupCoverUrl?: string | null;
    activityId: string;
    activityLabel: string;
    startsAt: string;
    endsAt?: string | null;
    location?: string | null;
    placeId?: string | null;
    placePhotoUrl?: string | null;
    description?: string | null;
}

function splitDateTime(value?: string | null) {
    if (!value) return { date: null, time: null };
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return { date: null, time: null };
    return { date: parsed, time: parsed };
}

export function useCreatePlanForm(onDone: () => void, editingPlan?: EditablePlan | null) {
    const queryClient = useQueryClient();
    const isEditMode = !!editingPlan;
    const initialStart = useMemo(() => splitDateTime(editingPlan?.startsAt), [editingPlan?.startsAt]);
    const initialEnd = useMemo(() => splitDateTime(editingPlan?.endsAt), [editingPlan?.endsAt]);
    const [selectedGroup, setSelectedGroup] = useState<AsyncSelectItem | null>(
        editingPlan ? { id: editingPlan.groupId, name: editingPlan.groupName, imageUrl: editingPlan.groupCoverUrl || null } : null
    );
    const [activity, setActivity] = useState<SelectedPlanActivity | null>(
        editingPlan ? { id: editingPlan.activityId, name: editingPlan.activityLabel } : null
    );
    const [selectedDate, setSelectedDate] = useState<Date | null>(initialStart.date);
    const [selectedTime, setSelectedTime] = useState<Date | null>(initialStart.time);
    const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(initialEnd.date);
    const [selectedEndTime, setSelectedEndTime] = useState<Date | null>(initialEnd.time);
    const [location, setLocation] = useState<PlanLocationValue>(
        editingPlan?.location
            ? {
                address: editingPlan.location,
                latitude: 0,
                longitude: 0,
                placeId: editingPlan.placeId || undefined,
                photoUrl: editingPlan.placePhotoUrl || undefined,
            }
            : null
    );
    const [description, setDescription] = useState(editingPlan?.description || '');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [showEndTimePicker, setShowEndTimePicker] = useState(false);
    const fallbackTime = useMemo(defaultPlanTime, []);

    const createMutation = useMutation({
        mutationFn: createPlan,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plans'] });
            Alert.alert('Plan created', 'Your plan has been saved.', [{ text: 'OK', onPress: onDone }]);
        },
        onError: (err: any) => {
            Alert.alert('Error', err?.response?.data?.error || err?.message || 'Failed to create plan');
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ planId, payload }: { planId: string; payload: Parameters<typeof updatePlan>[1] }) => updatePlan(planId, payload),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['plans'] });
            queryClient.invalidateQueries({ queryKey: ['plan', editingPlan?.id] });
            if (data?.plan?.id) {
                queryClient.invalidateQueries({ queryKey: ['plan', data.plan.id] });
            }
            Alert.alert('Plan updated', 'Your plan changes are live.', [{ text: 'OK', onPress: onDone }]);
        },
        onError: (err: any) => {
            Alert.alert('Error', err?.response?.data?.error || err?.message || 'Failed to update plan');
        },
    });

    const handleGroupSelect = (group: AsyncSelectItem | null) => {
        setSelectedGroup(group);
        if (!group) setActivity(null);
    };

    const handleDateSelect = (date: Date) => {
        setSelectedDate(date);
        if (!selectedEndDate || (selectedDate && selectedEndDate.getTime() === selectedDate.getTime())) {
            setSelectedEndDate(date);
        }
    };

    const handleTimeSelect = (time: Date) => {
        setSelectedTime(time);
        if (!selectedEndTime) {
            const defaultEnd = new Date(time);
            defaultEnd.setHours(defaultEnd.getHours() + 2);
            setSelectedEndTime(defaultEnd);

            if (selectedDate) {
                const starts = mergeDateAndTime(selectedDate, time);
                const ends = new Date(selectedDate);
                ends.setHours(defaultEnd.getHours(), defaultEnd.getMinutes(), 0, 0);
                if (ends <= starts) {
                    const tomorrow = new Date(selectedDate);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    setSelectedEndDate(tomorrow);
                } else {
                    setSelectedEndDate(selectedDate);
                }
            }
        }
    };

    const handleSubmit = () => {
        if (!selectedGroup) return Alert.alert('Choose Mandali', 'Please select which group this plan is for.');
        if (!activity) return Alert.alert('Choose Activity', 'Please select or create an activity.');
        if (!selectedDate || !selectedTime) return Alert.alert('Date & time', 'Please pick a date and time.');
        const startsAt = mergeDateAndTime(selectedDate, selectedTime);
        if (startsAt <= new Date()) {
            return Alert.alert('Pick a future time', 'Please choose a time later than now.');
        }

        let endsAt: Date | undefined;
        if (selectedEndDate && selectedEndTime) {
            endsAt = mergeDateAndTime(selectedEndDate, selectedEndTime);
            if (endsAt <= startsAt) {
                return Alert.alert('Invalid end time', 'Ending date & time must be after the start date & time.');
            }
        }

        const payload = {
            groupId: selectedGroup.id,
            activityId: activity.id,
            activityLabel: activity.name,
            startsAt: startsAt.toISOString(),
            endsAt: endsAt ? endsAt.toISOString() : undefined,
            location: location?.address?.trim() || undefined,
            placeId: location?.placeId,
            placePhotoUrl: location?.photoUrl,
            description: description.trim() || undefined,
        };

        if (isEditMode && editingPlan?.id) {
            const { groupId, ...updatePayload } = payload;
            updateMutation.mutate({ planId: editingPlan.id, payload: updatePayload });
            return;
        }

        createMutation.mutate(payload);
    };

    return {
        selectedGroup, activity, selectedDate, selectedTime, selectedEndDate, selectedEndTime, location, description,
        showDatePicker, showTimePicker, showEndDatePicker, showEndTimePicker, fallbackTime, createMutation, updateMutation, isEditMode,
        handleGroupSelect, setActivity, setSelectedDate: handleDateSelect, setSelectedEndDate, setSelectedTime: handleTimeSelect, setSelectedEndTime, setLocation,
        setDescription, setShowDatePicker, setShowTimePicker, setShowEndDatePicker, setShowEndTimePicker, handleSubmit,
    };
}
