import React from 'react';
import { Text, View } from 'react-native';
import { formatPlanDateLabel, formatPlanTimeLabel } from '../planChipFormat';
import CreateDateTimeButton from './CreateDateTimeButton';

interface CreateDateTimeSectionProps {
    selectedDate: Date | null;
    selectedTime: Date | null;
    onDatePress: () => void;
    onTimePress: () => void;
}

const CreateDateTimeSection = ({
    selectedDate,
    selectedTime,
    onDatePress,
    onTimePress,
}: CreateDateTimeSectionProps) => (
    <View className="mb-5">
        <Text className="font-body-bold text-[#594048] mb-2 text-xs uppercase tracking-widest ml-1">
            Date & Time
        </Text>
        <View className="flex-row gap-3">
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
    </View>
);

export default CreateDateTimeSection;
