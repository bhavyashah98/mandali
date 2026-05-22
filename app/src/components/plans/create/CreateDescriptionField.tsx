import React from 'react';
import { Text, TextInput, View } from 'react-native';
import { createPlanCardShadow } from './createPlanStyles';

interface CreateDescriptionFieldProps {
    value: string;
    onChange: (value: string) => void;
}

const CreateDescriptionField = ({ value, onChange }: CreateDescriptionFieldProps) => (
    <View className="mb-5">
        <Text className="font-body-bold text-[#594048] mb-2 text-xs uppercase tracking-widest ml-1">
            Add Details (Optional)
        </Text>
        <TextInput
            value={value}
            onChangeText={onChange}
            placeholder="Any notes about this plan..."
            placeholderTextColor="#c7c2bd"
            multiline
            className="bg-white border border-stone-100 rounded-[18px] px-4 py-4 font-body-medium text-[#1c1c18]"
            style={{ minHeight: 112, textAlignVertical: 'top', ...createPlanCardShadow }}
        />
    </View>
);

export default CreateDescriptionField;
