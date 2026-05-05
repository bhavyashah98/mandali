import React from 'react';
import { View, Text, TextInput } from 'react-native';

interface RoomDetailsSectionProps {
    title: string;
    setTitle: (title: string) => void;
}

export const RoomDetailsSection = ({ title, setTitle }: RoomDetailsSectionProps) => {
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
            <Text className="font-headline-bold text-stone-800 mb-4 text-lg">Room Details</Text>
            <TextInput
                className="bg-stone-50 p-4 rounded-2xl font-body-bold text-stone-800 border border-stone-100"
                placeholder="Enter Room Title (e.g. Sunday Bumper)"
                value={title}
                onChangeText={setTitle}
                placeholderTextColor="#a09d96"
                maxLength={30}
            />
        </View>
    );
};
