import React from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useIsTablet } from '../../hooks/useIsTablet';
import CreateDateTimeSection from '../../components/plans/create/CreateDateTimeSection';
import CreateDescriptionField from '../../components/plans/create/CreateDescriptionField';
import CreateLocationSection from '../../components/plans/create/CreateLocationSection';
import CreatePlanFooter from '../../components/plans/create/CreatePlanFooter';
import CreatePlanHeader from '../../components/plans/create/CreatePlanHeader';
import CreatePlanPickers from '../../components/plans/create/CreatePlanPickers';
import CreatePlanSelectors from '../../components/plans/create/CreatePlanSelectors';
import { useCreatePlanForm } from '../../components/plans/create/useCreatePlanForm';

const FOOTER_HEIGHT = 88;

const CreatePlanScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const isTablet = useIsTablet();
    const form = useCreatePlanForm(() => navigation.goBack());
    const footerBottomPad = Math.max(insets.bottom, 12);
    const scrollContent = { paddingHorizontal: 24, paddingBottom: FOOTER_HEIGHT + footerBottomPad + 16 };

    return (
        <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top']}>
            <CreatePlanHeader isTablet={isTablet} onBack={() => navigation.goBack()} />
            <ScrollView
                className="flex-1"
                contentContainerStyle={scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <CreatePlanSelectors selectedGroup={form.selectedGroup} activity={form.activity} onGroupSelect={form.handleGroupSelect} onActivitySelect={form.setActivity} isTablet={isTablet} />
                <CreateDateTimeSection
                    selectedDate={form.selectedDate}
                    selectedTime={form.selectedTime}
                    selectedEndDate={form.selectedEndDate}
                    selectedEndTime={form.selectedEndTime}
                    onDatePress={() => form.setShowDatePicker(true)}
                    onTimePress={() => form.setShowTimePicker(true)}
                    onEndDatePress={() => form.setShowEndDatePicker(true)}
                    onEndTimePress={() => form.setShowEndTimePicker(true)}
                />
                <CreateLocationSection location={form.location} onChange={form.setLocation} isTablet={isTablet} />
                <CreateDescriptionField value={form.description} onChange={form.setDescription} />
            </ScrollView>
            <CreatePlanFooter isPending={form.createMutation.isPending} isTablet={isTablet} bottomPad={footerBottomPad} onCreate={form.handleCreate} />
            <CreatePlanPickers
                showDatePicker={form.showDatePicker}
                showTimePicker={form.showTimePicker}
                showEndDatePicker={form.showEndDatePicker}
                showEndTimePicker={form.showEndTimePicker}
                selectedDate={form.selectedDate}
                selectedTime={form.selectedTime}
                selectedEndDate={form.selectedEndDate}
                selectedEndTime={form.selectedEndTime}
                fallbackTime={form.fallbackTime}
                onDateChange={form.setSelectedDate}
                onTimeChange={form.setSelectedTime}
                onEndDateChange={form.setSelectedEndDate}
                onEndTimeChange={form.setSelectedEndTime}
                setShowDatePicker={form.setShowDatePicker}
                setShowTimePicker={form.setShowTimePicker}
                setShowEndDatePicker={form.setShowEndDatePicker}
                setShowEndTimePicker={form.setShowEndTimePicker}
            />
        </SafeAreaView>
    );
};

export default CreatePlanScreen;
