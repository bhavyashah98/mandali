import React from 'react';
import { Text, View } from 'react-native';
import { formatPlanDateLabel, formatPlanTimeLabel } from '../planChipFormat';
import CreateDateTimeButton from './CreateDateTimeButton';

interface CreateDateTimeSectionProps {
    selectedDate: Date | null;
    selectedTime: Date | null;
    selectedEndDate: Date | null;
    selectedEndTime: Date | null;
    onDatePress: () => void;
    onTimePress: () => void;
    onEndDatePress: () => void;
    onEndTimePress: () => void;
}

const CreateDateTimeSection = ({
    selectedDate,
    selectedTime,
    selectedEndDate,
    selectedEndTime,
    onDatePress,
    onTimePress,
    onEndDatePress,
    onEndTimePress,
}: CreateDateTimeSectionProps) => (
    <View className="mb-5">
        <Text className="font-body-bold text-[#594048] mb-2.5 text-xs uppercase tracking-widest ml-1">
            Starts
        </Text>
        <View className="flex-row gap-3 mb-4">
            <CreateDateTimeButton
                icon="calendar-today"
                label={selectedDate ? formatPlanDateLabel(selectedDate) : null}
                placeholder="Pick date"
                onPress={onDatePress}
                grow
            />
            <CreateDateTimeButton
                icon="schedule"
                label={selectedTime ? formatPlanTimeLabel(selectedTime) : null}
                placeholder="Time"
                onPress={onTimePress}
            />
        </View>

        <Text className="font-body-bold text-[#594048] mb-2.5 text-xs uppercase tracking-widest ml-1">
            Ends
        </Text>
        <View className="flex-row gap-3">
            <CreateDateTimeButton
                icon="calendar-today"
                label={selectedEndDate ? formatPlanDateLabel(selectedEndDate) : null}
                placeholder="Pick date"
                onPress={onEndDatePress}
                grow
            />
            <CreateDateTimeButton
                icon="schedule"
                label={selectedEndTime ? formatPlanTimeLabel(selectedEndTime) : null}
                placeholder="Time"
                onPress={onEndTimePress}
            />
        </View>
    </View>
);

export default CreateDateTimeSection;
