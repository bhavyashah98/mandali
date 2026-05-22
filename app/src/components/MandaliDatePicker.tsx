import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import { useIsTablet } from '../hooks/useIsTablet';

const padTime = (value: number) => value.toString().padStart(2, '0');

const normalizeToMinuteInterval = (date: Date, minuteInterval?: number) => {
    if (!minuteInterval || minuteInterval <= 1) return date;

    const normalized = new Date(date);
    const minutes = Math.round(normalized.getMinutes() / minuteInterval) * minuteInterval;
    normalized.setHours(normalized.getHours(), minutes, 0, 0);
    return normalized;
};

interface MandaliDatePickerProps {
    visible: boolean;
    mode: 'date' | 'time';
    value: Date;
    onConfirm: (date: Date) => void;
    onCancel: () => void;
    minimumDate?: Date;
    maximumDate?: Date;
    title?: string;
    minuteInterval?: 1 | 5 | 10 | 15 | 20 | 30;
}

export const MandaliDatePicker = ({
    visible,
    mode,
    value,
    onConfirm,
    onCancel,
    minimumDate,
    maximumDate,
    title,
    minuteInterval
}: MandaliDatePickerProps) => {
    const isTablet = useIsTablet();
    const [tempDate, setTempDate] = React.useState(value);

    // Sync tempDate when value or visibility changes
    React.useEffect(() => {
        if (visible) {
            setTempDate(normalizeToMinuteInterval(value, minuteInterval));
        }
    }, [visible, value, minuteInterval]);

    const handleConfirm = () => {
        onConfirm(tempDate);
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            if (event.type === 'set' && selectedDate) {
                onConfirm(selectedDate);
            } else {
                onCancel();
            }
        } else if (selectedDate) {
            setTempDate(selectedDate);
        }
    };

    const renderAndroidIntervalTimePicker = () => {
        const minuteOptions = Array.from(
            { length: Math.floor(60 / (minuteInterval || 15)) },
            (_, index) => index * (minuteInterval || 15)
        );
        const selectedHour = tempDate.getHours();
        const selectedMinute = tempDate.getMinutes();

        const setHour = (nextHour: number) => {
            const next = new Date(tempDate);
            next.setHours((nextHour + 24) % 24, selectedMinute, 0, 0);
            setTempDate(next);
        };

        const setMinute = (minute: number) => {
            const next = new Date(tempDate);
            next.setMinutes(minute, 0, 0);
            setTempDate(next);
        };

        return (
            <Modal
                visible={visible}
                animationType="fade"
                transparent={true}
                onRequestClose={onCancel}
            >
                <View className="flex-1 justify-center items-center bg-black/60 px-6">
                    <View
                        className={`bg-[#fdf9f3] rounded-[32px] overflow-hidden ${isTablet ? 'w-[60%]' : 'w-full'}`}
                        style={{
                            elevation: 10,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 10 },
                            shadowOpacity: 0.3,
                            shadowRadius: 20
                        }}
                    >
                        <View className={`flex-row items-center justify-between border-b border-stone-100 ${isTablet ? 'p-10 pb-6' : 'p-6 pb-4'}`}>
                            <Text className={`text-[#594048] font-headline-bold ${isTablet ? 'text-4xl' : 'text-2xl'}`}>
                                {title || 'Select Time'}
                            </Text>
                            <TouchableOpacity
                                onPress={onCancel}
                                className="bg-stone-100 p-2 rounded-full"
                            >
                                <MaterialIcons name="close" size={24} color="#a09d96" />
                            </TouchableOpacity>
                        </View>

                        <View className={`${isTablet ? 'p-10' : 'p-6'} bg-white/50`}>
                            <View className="flex-row items-center justify-center gap-6 mb-6">
                                <TouchableOpacity
                                    onPress={() => setHour(selectedHour - 1)}
                                    className="w-12 h-12 rounded-full bg-stone-100 items-center justify-center"
                                    activeOpacity={0.85}
                                >
                                    <MaterialIcons name="remove" size={24} color="#594048" />
                                </TouchableOpacity>
                                <View className="items-center min-w-[130px]">
                                    <Text className="font-headline-bold text-[#1c1c18]" style={{ fontSize: isTablet ? 44 : 36 }}>
                                        {padTime(selectedHour)}:{padTime(selectedMinute)}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => setHour(selectedHour + 1)}
                                    className="w-12 h-12 rounded-full bg-stone-100 items-center justify-center"
                                    activeOpacity={0.85}
                                >
                                    <MaterialIcons name="add" size={24} color="#594048" />
                                </TouchableOpacity>
                            </View>

                            <View className="flex-row flex-wrap gap-3 justify-center">
                                {minuteOptions.map((minute) => {
                                    const isSelected = selectedMinute === minute;
                                    return (
                                        <TouchableOpacity
                                            key={minute}
                                            onPress={() => setMinute(minute)}
                                            activeOpacity={0.85}
                                            className={`h-12 px-5 rounded-full items-center justify-center ${isSelected ? 'bg-[#b30069]' : 'bg-stone-100'}`}
                                        >
                                            <Text className={`font-body-bold ${isSelected ? 'text-white' : 'text-[#594048]'}`}>
                                                :{padTime(minute)}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        <View className={`${isTablet ? 'p-10 pt-4' : 'p-6 pt-2'}`}>
                            <TouchableOpacity
                                onPress={handleConfirm}
                                className="bg-[#b30069] rounded-full h-16 items-center justify-center shadow-lg shadow-[#b30069]/20"
                            >
                                <Text className="text-white font-headline-bold text-lg">Confirm Time</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={onCancel}
                                className="mt-4 h-12 items-center justify-center"
                            >
                                <Text className="text-stone-400 font-body-bold">Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    };

    if (Platform.OS === 'android' && visible && mode === 'time' && minuteInterval) {
        return renderAndroidIntervalTimePicker();
    }

    if (Platform.OS === 'android' && visible) {
        return (
            <DateTimePicker
                value={value}
                mode={mode}
                display="default"
                onChange={handleDateChange}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                minuteInterval={minuteInterval}
            />
        );
    }

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onCancel}
        >
            <View className="flex-1 justify-center items-center bg-black/60 px-6">
                <View 
                    className={`bg-[#fdf9f3] rounded-[40px] overflow-hidden ${isTablet ? 'w-[70%]' : 'w-full'}`}
                    style={{ 
                        elevation: 10, 
                        shadowColor: '#000', 
                        shadowOffset: { width: 0, height: 10 }, 
                        shadowOpacity: 0.3, 
                        shadowRadius: 20 
                    }}
                >
                    {/* Header */}
                    <View className={`flex-row items-center justify-between border-b border-stone-100 ${isTablet ? 'p-10 pb-6' : 'p-6 pb-4'}`}>
                        <Text className={`text-[#594048] font-headline-bold ${isTablet ? 'text-4xl' : 'text-2xl'}`}>
                            {title || (mode === 'date' ? 'Select Date' : 'Select Time')}
                        </Text>
                        <TouchableOpacity 
                            onPress={onCancel}
                            className="bg-stone-100 p-2 rounded-full"
                        >
                            <MaterialIcons name="close" size={24} color="#a09d96" />
                        </TouchableOpacity>
                    </View>

                    {/* Picker Container */}
                    <View className={`${isTablet ? 'p-10' : 'p-6'} items-center bg-white/50`}>
                        <DateTimePicker
                            value={tempDate}
                            mode={mode}
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={handleDateChange}
                            minimumDate={minimumDate}
                            maximumDate={maximumDate}
                            minuteInterval={minuteInterval}
                            textColor="#1c1c18"
                            style={{ width: '100%', height: 220 }}
                        />
                    </View>

                    {/* Actions */}
                    <View className={`${isTablet ? 'p-10 pt-4' : 'p-6 pt-2'}`}>
                        <TouchableOpacity
                            onPress={handleConfirm}
                            className="bg-[#b30069] rounded-full h-16 items-center justify-center shadow-lg shadow-[#b30069]/20"
                        >
                            <Text className="text-white font-headline-bold text-lg">
                                {mode === 'date' ? 'Confirm Date' : 'Confirm Time'}
                            </Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            onPress={onCancel}
                            className="mt-4 h-12 items-center justify-center"
                        >
                            <Text className="text-stone-400 font-body-bold">Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};
