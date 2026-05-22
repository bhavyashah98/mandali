import React from 'react';
import { ScrollView } from 'react-native';
import PlanSelectionChip from './PlanSelectionChip';
import { formatTimeChipParts } from './planChipFormat';

export const DEFAULT_TIME_SLOTS = [
    { label: '6:00 PM', hours: 18, minutes: 0 },
    { label: '7:00 PM', hours: 19, minutes: 0 },
    { label: '8:00 PM', hours: 20, minutes: 0 },
];

interface PlanTimeChipsProps {
    selectedTime: Date | null;
    onSelectPreset: (hours: number, minutes: number) => void;
    onCustomPress: () => void;
    isTablet: boolean;
    customSelected: boolean;
}

const PlanTimeChips = ({
    selectedTime,
    onSelectPreset,
    onCustomPress,
    isTablet,
    customSelected,
}: PlanTimeChipsProps) => {
    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {DEFAULT_TIME_SLOTS.map((slot) => {
                const selected =
                    selectedTime &&
                    !customSelected &&
                    selectedTime.getHours() === slot.hours &&
                    selectedTime.getMinutes() === slot.minutes;
                const parts = formatTimeChipParts(
                    (() => {
                        const d = new Date();
                        d.setHours(slot.hours, slot.minutes, 0, 0);
                        return d;
                    })()
                );
                return (
                    <PlanSelectionChip
                        key={slot.label}
                        variant="time"
                        selected={!!selected}
                        onPress={() => onSelectPreset(slot.hours, slot.minutes)}
                        isTablet={isTablet}
                        weekday={parts.ampm}
                        primary={`${parts.hour}${parts.minutes}`}
                        secondary=""
                    />
                );
            })}
            {customSelected && selectedTime ? (
                (() => {
                    const parts = formatTimeChipParts(selectedTime);
                    return (
                        <PlanSelectionChip
                            variant="time"
                            selected
                            onPress={onCustomPress}
                            isTablet={isTablet}
                            weekday={parts.ampm}
                            primary={`${parts.hour}${parts.minutes}`}
                            secondary=""
                        />
                    );
                })()
            ) : (
                <PlanSelectionChip
                    variant="custom"
                    selected={false}
                    onPress={onCustomPress}
                    isTablet={isTablet}
                    customIcon="schedule"
                    customLabel="Custom"
                />
            )}
        </ScrollView>
    );
};

export default PlanTimeChips;
