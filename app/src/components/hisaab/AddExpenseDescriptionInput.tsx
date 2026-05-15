import React from 'react';
import { View, Text, TextInput } from 'react-native';

interface DescriptionInputProps {
    isTablet: boolean;
    description: string;
    setDescription: (val: string) => void;
}

const AddExpenseDescriptionInput = ({ isTablet, description, setDescription }: DescriptionInputProps) => (
    <View>
        <Text className={`font-body-bold text-[#594048] mb-3 ml-1 uppercase tracking-wider ${isTablet ? 'text-xl' : 'text-[12px]'}`}>What is this for?</Text>
        <View
            className="bg-white rounded-[24px] px-6 justify-center border border-stone-100 shadow-sm"
            style={{ height: isTablet ? 110 : 64 }}
        >
            <TextInput
                placeholder="E.g. Dinner, Movie tickets..."
                placeholderTextColor="#a09d96"
                style={{
                    height: isTablet ? 110 : 64,
                    fontSize: isTablet ? 32 : 18,
                    color: '#1c1c18',
                    textAlignVertical: 'center'
                }}
                className="font-body-bold"
                value={description}
                onChangeText={setDescription}
                selectionColor="#b30069"
            />
        </View>
    </View>
);

export default AddExpenseDescriptionInput;
