import React from 'react';
import { MandaliDatePicker } from '../../MandaliDatePicker';
import { startOfDay } from '../planChipFormat';
import { roundToQuarterHour, todayStart } from './createPlanDate';

interface CreatePlanPickersProps {
    showDatePicker: boolean;
    showTimePicker: boolean;
    selectedDate: Date | null;
    selectedTime: Date | null;
    fallbackTime: Date;
    onDateChange: (date: Date) => void;
    onTimeChange: (time: Date) => void;
    setShowDatePicker: (visible: boolean) => void;
    setShowTimePicker: (visible: boolean) => void;
}

const CreatePlanPickers = (props: CreatePlanPickersProps) => (
    <>
        <MandaliDatePicker
            visible={props.showDatePicker}
            mode="date"
            value={props.selectedDate || new Date()}
            minimumDate={todayStart()}
            title="Pick date"
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
            title="Pick time"
            minuteInterval={15}
            onConfirm={(time) => {
                props.onTimeChange(roundToQuarterHour(time));
                props.setShowTimePicker(false);
            }}
            onCancel={() => props.setShowTimePicker(false)}
        />
    </>
);

export default CreatePlanPickers;
