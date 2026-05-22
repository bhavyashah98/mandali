import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useIsTablet } from '../../hooks/useIsTablet';
import { createPlan } from '../../lib/api';
import PlanActivitySelector, { SelectedPlanActivity } from '../../components/plans/PlanActivitySelector';
import PlanGroupSelector from '../../components/plans/PlanGroupSelector';
import PlanLocationPicker, { PlanLocationValue } from '../../components/plans/PlanLocationPicker';
import PlanPickerRow from '../../components/plans/PlanPickerRow';
import { AsyncSelectItem } from '../../components/plans/PlanAsyncSelect';
import { MandaliDatePicker } from '../../components/MandaliDatePicker';
import { formatPlanDateLabel, formatPlanTimeLabel, startOfDay } from '../../components/plans/planChipFormat';

function mergeDateAndTime(date: Date, time: Date) {
    const merged = new Date(date);
    merged.setHours(time.getHours(), time.getMinutes(), 0, 0);
    return merged;
}

const FOOTER_HEIGHT = 88;

const CreatePlanScreen = () => {
    const navigation = useNavigation<any>();
    const queryClient = useQueryClient();
    const isTablet = useIsTablet();
    const insets = useSafeAreaInsets();

    const [selectedGroup, setSelectedGroup] = useState<AsyncSelectItem | null>(null);
    const [activity, setActivity] = useState<SelectedPlanActivity | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<Date | null>(null);
    const [location, setLocation] = useState<PlanLocationValue>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    const createMutation = useMutation({
        mutationFn: createPlan,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plans'] });
            Alert.alert('Plan created', 'Your plan has been saved.', [
                { text: 'OK', onPress: () => navigation.goBack() },
            ]);
        },
        onError: (err: any) => {
            Alert.alert('Error', err?.response?.data?.error || err?.message || 'Failed to create plan');
        },
    });

    const defaultTime = useMemo(() => {
        const d = new Date();
        d.setHours(19, 0, 0, 0);
        return d;
    }, []);

    const dateLabel = selectedDate ? formatPlanDateLabel(selectedDate) : null;
    const timeLabel = selectedTime ? formatPlanTimeLabel(selectedTime) : null;

    const buildStartsAt = (): Date | null => {
        if (!selectedDate || !selectedTime) return null;
        return mergeDateAndTime(selectedDate, selectedTime);
    };

    const handleNext = () => {
        if (!selectedGroup) {
            Alert.alert('Choose Mandali', 'Please select which group this plan is for.');
            return;
        }
        if (!activity) {
            Alert.alert('Choose Activity', 'Please select or create an activity.');
            return;
        }
        const startsAt = buildStartsAt();
        if (!startsAt) {
            Alert.alert('Date & time', 'Please pick a date and time.');
            return;
        }

        const payload = {
            groupId: selectedGroup.id,
            activityId: activity.id,
            activityLabel: activity.name,
            startsAt: startsAt.toISOString(),
            location: location?.address?.trim() || undefined,
        };

        createMutation.mutate(payload);
    };

    const footerBottomPad = Math.max(insets.bottom, 12);

    return (
        <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top']}>
            <View className={`flex-row items-center px-6 ${isTablet ? 'py-6' : 'py-3'}`}>
                <View style={{ width: isTablet ? 64 : 44 }}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={{
                            elevation: 2,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.05,
                            shadowRadius: 2,
                        }}
                        className={`items-center justify-center rounded-full bg-white border border-stone-100 ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}
                    >
                        <MaterialIcons
                            name="arrow-back-ios"
                            size={isTablet ? 28 : 18}
                            color="#594048"
                            style={{ marginLeft: isTablet ? 12 : 4 }}
                        />
                    </TouchableOpacity>
                </View>

                <View className="flex-1 items-center px-2">
                    <Text
                        className="font-headline-bold text-[#1c1c18] text-center"
                        style={{ fontSize: isTablet ? 32 : 20 }}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                    >
                        Create a Plan
                    </Text>
                    <Text
                        className="font-body-bold text-[#b30069] text-center uppercase tracking-widest"
                        style={{ fontSize: isTablet ? 14 : 9, marginTop: 2 }}
                    >
                        Let&apos;s plan something awesome!
                    </Text>
                </View>

                <View style={{ width: isTablet ? 64 : 44 }} />
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{
                    paddingHorizontal: 24,
                    paddingBottom: FOOTER_HEIGHT + footerBottomPad + 16,
                }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View className="mb-6">
                    <PlanGroupSelector
                        selected={selectedGroup}
                        onSelect={(g) => {
                            setSelectedGroup(g);
                            if (!g) setActivity(null);
                        }}
                        isTablet={isTablet}
                    />
                </View>

                <View className="mb-6">
                    <PlanActivitySelector
                        groupId={selectedGroup?.id ?? null}
                        selected={activity}
                        onSelect={setActivity}
                        isTablet={isTablet}
                    />
                </View>

                <View className="mb-6">
                    <PlanPickerRow
                        label="Pick Date"
                        icon="calendar-today"
                        value={dateLabel}
                        placeholder="Select date"
                        onPress={() => setShowDatePicker(true)}
                        isTablet={isTablet}
                    />
                </View>

                <View className="mb-6">
                    <PlanPickerRow
                        label="Time"
                        icon="schedule"
                        value={timeLabel}
                        placeholder="Select time"
                        onPress={() => setShowTimePicker(true)}
                        isTablet={isTablet}
                    />
                </View>

                <View className="mb-2">
                    <PlanLocationPicker value={location} onChange={setLocation} isTablet={isTablet} />
                </View>
            </ScrollView>

            <View
                className="absolute left-0 right-0 bg-[#fdf9f3] border-t border-stone-100/80 px-6 pt-3"
                style={{
                    bottom: 0,
                    paddingBottom: footerBottomPad,
                    shadowColor: '#b30069',
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.08,
                    shadowRadius: 12,
                    elevation: 12,
                }}
            >
                <TouchableOpacity
                    onPress={handleNext}
                    disabled={createMutation.isPending}
                    activeOpacity={0.9}
                    className="bg-[#b30069] rounded-[28px] items-center justify-center flex-row"
                    style={{
                        minHeight: isTablet ? 60 : 54,
                        opacity: createMutation.isPending ? 0.75 : 1,
                        shadowColor: '#b30069',
                        shadowOffset: { width: 0, height: 6 },
                        shadowOpacity: 0.35,
                        shadowRadius: 12,
                        elevation: 6,
                    }}
                >
                    {createMutation.isPending ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Text className="font-headline-bold text-white text-lg mr-2">Next</Text>
                            <MaterialIcons name="arrow-forward" size={22} color="#fff" />
                        </>
                    )}
                </TouchableOpacity>
            </View>

            <MandaliDatePicker
                visible={showDatePicker}
                mode="date"
                value={selectedDate || new Date()}
                minimumDate={new Date()}
                title="Pick date"
                onConfirm={(d) => {
                    setSelectedDate(startOfDay(d));
                    setShowDatePicker(false);
                }}
                onCancel={() => setShowDatePicker(false)}
            />

            <MandaliDatePicker
                visible={showTimePicker}
                mode="time"
                value={selectedTime || defaultTime}
                title="Pick time"
                onConfirm={(d) => {
                    setSelectedTime(d);
                    setShowTimePicker(false);
                }}
                onCancel={() => setShowTimePicker(false)}
            />
        </SafeAreaView>
    );
};

export default CreatePlanScreen;
