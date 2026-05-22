import { useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPlan } from '../../../lib/api';
import type { AsyncSelectItem } from '../PlanAsyncSelect';
import type { SelectedPlanActivity } from '../PlanActivitySelector';
import type { PlanLocationValue } from '../PlanLocationPicker';
import { defaultPlanTime, mergeDateAndTime } from './createPlanDate';

export function useCreatePlanForm(onCreated: () => void) {
    const queryClient = useQueryClient();
    const [selectedGroup, setSelectedGroup] = useState<AsyncSelectItem | null>(null);
    const [activity, setActivity] = useState<SelectedPlanActivity | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<Date | null>(null);
    const [location, setLocation] = useState<PlanLocationValue>(null);
    const [description, setDescription] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const fallbackTime = useMemo(defaultPlanTime, []);

    const createMutation = useMutation({
        mutationFn: createPlan,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plans'] });
            Alert.alert('Plan created', 'Your plan has been saved.', [{ text: 'OK', onPress: onCreated }]);
        },
        onError: (err: any) => {
            Alert.alert('Error', err?.response?.data?.error || err?.message || 'Failed to create plan');
        },
    });

    const handleGroupSelect = (group: AsyncSelectItem | null) => {
        setSelectedGroup(group);
        if (!group) setActivity(null);
    };

    const handleCreate = () => {
        if (!selectedGroup) return Alert.alert('Choose Mandali', 'Please select which group this plan is for.');
        if (!activity) return Alert.alert('Choose Activity', 'Please select or create an activity.');
        if (!selectedDate || !selectedTime) return Alert.alert('Date & time', 'Please pick a date and time.');
        const startsAt = mergeDateAndTime(selectedDate, selectedTime);
        if (startsAt <= new Date()) {
            return Alert.alert('Pick a future time', 'Please choose a time later than now.');
        }
        createMutation.mutate({
            groupId: selectedGroup.id,
            activityId: activity.id,
            activityLabel: activity.name,
            startsAt: startsAt.toISOString(),
            location: location?.address?.trim() || undefined,
            placeId: location?.placeId,
            placePhotoUrl: location?.photoUrl,
            description: description.trim() || undefined,
        });
    };

    return {
        selectedGroup, activity, selectedDate, selectedTime, location, description,
        showDatePicker, showTimePicker, fallbackTime, createMutation,
        handleGroupSelect, setActivity, setSelectedDate, setSelectedTime, setLocation,
        setDescription, setShowDatePicker, setShowTimePicker, handleCreate,
    };
}
