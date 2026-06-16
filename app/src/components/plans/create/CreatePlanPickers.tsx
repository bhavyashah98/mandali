import React from 'react';
import { MandaliDatePicker } from '../../MandaliDatePicker';
import { startOfDay } from '../planChipFormat';
import { roundToQuarterHour, todayStart } from './createPlanDate';

interface CreatePlanPickersProps {
    showDatePicker: boolean;
    showTimePicker: boolean;
    showEndDatePicker: boolean;
    showEndTimePicker: boolean;
    selectedDate: Date | null;
    selectedTime: Date | null;
    selectedEndDate: Date | null;
    selectedEndTime: Date | null;
    fallbackTime: Date;
    onDateChange: (date: Date) => void;
    onTimeChange: (time: Date) => void;
    onEndDateChange: (date: Date) => void;
    onEndTimeChange: (time: Date) => void;
    setShowDatePicker: (visible: boolean) => void;
    setShowTimePicker: (visible: boolean) => void;
    setShowEndDatePicker: (visible: boolean) => void;
    setShowEndTimePicker: (visible: boolean) => void;
}

const CreatePlanPickers = (props: CreatePlanPickersProps) => (
    <>
        <MandaliDatePicker
            visible={props.showDatePicker}
            mode="date"
            value={props.selectedDate || new Date()}
            minimumDate={todayStart()}
            title="Pick start date"
            onConfirm={(date) => {
                props.onDateChange(startOfDay(date));
                props.setShowDatePicker(false);
            }}
            onCancel={() => props.setShowDatePicker(false)}
        />
        <MandaliDatePicker
            visible={props.showTimePicker}
            mode="time"
            value={props.selectedTime || props.fallbackTime}
            title="Pick start time"
            minuteInterval={15}
            onConfirm={(time) => {
                props.onTimeChange(roundToQuarterHour(time));
                props.setShowTimePicker(false);
            }}
            onCancel={() => props.setShowTimePicker(false)}
        />
        <MandaliDatePicker
            visible={props.showEndDatePicker}
            mode="date"
            value={props.selectedEndDate || props.selectedDate || new Date()}
            minimumDate={props.selectedDate || todayStart()}
            title="Pick end date"
            onConfirm={(date) => {
                props.onEndDateChange(startOfDay(date));
                props.setShowEndDatePicker(false);
            }}
            onCancel={() => props.setShowEndDatePicker(false)}
        />
        <MandaliDatePicker
            visible={props.showEndTimePicker}
            mode="time"
            value={props.selectedEndTime || props.selectedTime || props.fallbackTime}
            title="Pick end time"
            minuteInterval={15}
            onConfirm={(time) => {
                props.onEndTimeChange(roundToQuarterHour(time));
                props.setShowEndTimePicker(false);
            }}
            onCancel={() => props.setShowEndTimePicker(false)}
        />
    </>
);

export default CreatePlanPickers;
