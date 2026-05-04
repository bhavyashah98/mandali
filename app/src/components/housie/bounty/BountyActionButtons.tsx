import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
    onOpenSelection: () => void;
}

const BountyActionButtons: React.FC<Props> = ({ onOpenSelection }) => (
    <View className="mt-4 gap-3">
        <TouchableOpacity
            onPress={onOpenSelection}
            className="flex-row items-center justify-center bg-white py-5 rounded-[32px] border border-dashed border-stone-200"
        >
            <Ionicons name="gift-outline" size={20} color="#a8a29e" />
            <Text className="font-body-bold text-stone-400 ml-2">Add Other Rewards</Text>
        </TouchableOpacity>
    </View>
);

export default BountyActionButtons;
