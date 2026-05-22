import React, { useMemo } from 'react';
import { ScrollView } from 'react-native';
import PlanSelectionChip from './PlanSelectionChip';
import { formatDateChipParts, isSameDay, startOfDay } from './planChipFormat';

interface PlanDateChipsProps {
    selectedDate: Date | null;
    onSelectDate: (date: Date) => void;
    onCustomPress: () => void;
    isTablet: boolean;
}

const PRESET_DAY_COUNT = 3;

const PlanDateChips = ({ selectedDate, onSelectDate, onCustomPress, isTablet }: PlanDateChipsProps) => {
    const days = useMemo(() => {
        const list: Date[] = [];
        const today = startOfDay(new Date());
        for (let i = 0; i < PRESET_DAY_COUNT; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            list.push(d);
        }
        return list;
    }, []);

    const customSelected =
        selectedDate && !days.some((d) => isSameDay(d, selectedDate));

    const customParts = customSelected && selectedDate ? formatDateChipParts(selectedDate) : null;

    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {days.map((day) => {
                const selected = selectedDate && isSameDay(day, selectedDate);
                const parts = formatDateChipParts(day);
                return (
                    <PlanSelectionChip
                        key={day.toISOString()}
                        variant="date"
                        selected={!!selected}
                        onPress={() => onSelectDate(day)}
                        isTablet={isTablet}
                        weekday={parts.weekday}
                        primary={parts.day}
                        secondary={parts.month}
                    />
                );
            })}
            {customSelected && customParts ? (
                <PlanSelectionChip
                    variant="date"
                    selected
                    onPress={onCustomPress}
                    isTablet={isTablet}
                    weekday={customParts.weekday}
                    primary={customParts.day}
                    secondary={customParts.month}
                />
            ) : (
                <PlanSelectionChip
                    variant="custom"
                    selected={false}
                    onPress={onCustomPress}
                    isTablet={isTablet}
                    customIcon="calendar-today"
                    customLabel="Custom"
                />
            )}
        </ScrollView>
    );
};

export default PlanDateChips;
