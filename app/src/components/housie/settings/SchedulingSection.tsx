import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface SchedulingSectionProps {
    isScheduled: boolean;
    setIsScheduled: (val: boolean) => void;
    scheduledAt: Date;
    setShowDatePicker: (val: boolean) => void;
    setShowTimePicker: (val: boolean) => void;
}

export const SchedulingSection = ({
    isScheduled,
    setIsScheduled,
    scheduledAt,
    setShowDatePicker,
    setShowTimePicker
}: SchedulingSectionProps) => {

    const handleScheduleClick = () => {
        setIsScheduled(true);
    };


    return (
        <View
            style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2
            }}
            className="mb-8 bg-white p-6 rounded-[32px] border border-stone-100"
        >
            <Text className="font-headline-bold text-stone-800 mb-4 text-lg">Schedule Time</Text>
            <View className="flex-row bg-stone-50 p-1.5 rounded-2xl mb-4">
                <TouchableOpacity
                    onPress={() => setIsScheduled(false)}
                    className={`flex-1 py-3 rounded-xl items-center ${!isScheduled ? 'bg-white' : ''}`}
                    style={!isScheduled ? {
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.1,
                        shadowRadius: 2,
                        elevation: 1
                    } : {}}
                >
                    <Text className={`font-body-bold ${!isScheduled ? 'text-[#b30069]' : 'text-stone-400'}`}>Start Now</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={handleScheduleClick}
                    className={`flex-1 py-3 rounded-xl items-center ${isScheduled ? 'bg-white' : ''}`}
                    style={isScheduled ? {
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.1,
                        shadowRadius: 2,
                        elevation: 1
                    } : {}}
                >
                    <Text className={`font-body-bold ${isScheduled ? 'text-[#b30069]' : 'text-stone-400'}`}>Schedule</Text>
                </TouchableOpacity>
            </View>

            {isScheduled && (
                <View className="flex-row">
                    <TouchableOpacity
                        onPress={() => setShowDatePicker(true)}
                        className="flex-1 bg-stone-50 p-4 rounded-2xl border border-stone-100 flex-row items-center justify-between mr-2"
                    >
                        <Text className="font-body-bold text-stone-700">{scheduledAt.toLocaleDateString()}</Text>
                        <MaterialIcons name="calendar-today" size={20} color="#b30069" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setShowTimePicker(true)}
                        className="flex-1 bg-stone-50 p-4 rounded-2xl border border-stone-100 flex-row items-center justify-between ml-2"
                    >
                        <Text className="font-body-bold text-stone-700">{scheduledAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                        <MaterialIcons name="access-time" size={20} color="#b30069" />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};
