import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import { useIsTablet } from '../hooks/useIsTablet';

interface MandaliDatePickerProps {
    visible: boolean;
    mode: 'date' | 'time';
    value: Date;
    onConfirm: (date: Date) => void;
    onCancel: () => void;
    minimumDate?: Date;
    maximumDate?: Date;
    title?: string;
}

export const MandaliDatePicker = ({
    visible,
    mode,
    value,
    onConfirm,
    onCancel,
    minimumDate,
    maximumDate,
    title
}: MandaliDatePickerProps) => {
    const isTablet = useIsTablet();
    const [tempDate, setTempDate] = React.useState(value);

    // Sync tempDate when value or visibility changes
    React.useEffect(() => {
        if (visible) {
            setTempDate(value);
        }
    }, [visible, value]);

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

    if (Platform.OS === 'android' && visible) {
        return (
            <DateTimePicker
                value={value}
                mode={mode}
                display="default"
                onChange={handleDateChange}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
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
