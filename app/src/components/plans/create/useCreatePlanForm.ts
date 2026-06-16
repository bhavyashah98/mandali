import { useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPlan } from '../../../lib/api';
import type { AsyncSelectItem } from '../PlanAsyncSelect';
import type { SelectedPlanActivity } from '../PlanActivitySelector';
import type { PlanLocationValue } from '../PlanLocationPicker';
import { defaultPlanTime, mergeDateAndTime, mergeDateAndEndTime } from './createPlanDate';

export function useCreatePlanForm(onCreated: () => void) {
    const queryClient = useQueryClient();
    const [selectedGroup, setSelectedGroup] = useState<AsyncSelectItem | null>(null);
    const [activity, setActivity] = useState<SelectedPlanActivity | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<Date | null>(null);
    const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null);
    const [selectedEndTime, setSelectedEndTime] = useState<Date | null>(null);
    const [location, setLocation] = useState<PlanLocationValue>(null);
    const [description, setDescription] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [showEndTimePicker, setShowEndTimePicker] = useState(false);
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

    const handleCreate = () => {
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

        createMutation.mutate({
            groupId: selectedGroup.id,
            activityId: activity.id,
            activityLabel: activity.name,
            startsAt: startsAt.toISOString(),
            endsAt: endsAt ? endsAt.toISOString() : undefined,
            location: location?.address?.trim() || undefined,
            placeId: location?.placeId,
            placePhotoUrl: location?.photoUrl,
            description: description.trim() || undefined,
        });
    };

    return {
        selectedGroup, activity, selectedDate, selectedTime, selectedEndDate, selectedEndTime, location, description,
        showDatePicker, showTimePicker, showEndDatePicker, showEndTimePicker, fallbackTime, createMutation,
        handleGroupSelect, setActivity, setSelectedDate: handleDateSelect, setSelectedEndDate, setSelectedTime: handleTimeSelect, setSelectedEndTime, setLocation,
        setDescription, setShowDatePicker, setShowTimePicker, setShowEndDatePicker, setShowEndTimePicker, handleCreate,
    };
}
