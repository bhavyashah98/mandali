import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LobbyEmptyStateProps {
    type: 'active' | 'scheduled';
}

export const LobbyEmptyState = ({ type }: LobbyEmptyStateProps) => {
    return (
        <View className="items-center justify-center py-10 bg-white rounded-[40px] border border-dashed border-stone-200 min-h-[320px]">

            <View className="w-24 h-24 bg-stone-50 rounded-full items-center justify-center mb-6">
                <Ionicons name={type === 'active' ? "game-controller" : "calendar-clear"} size={40} color="#d4d4d8" />
            </View>
            <Text className="font-headline-bold text-stone-800 text-lg">No {type} rooms</Text>
            <Text className="font-body text-stone-400 text-center px-10 mt-2">
                {type === 'active' 
                    ? "There are no games running right now. Why not host one?" 
                    : "Check back later for newly scheduled games!"}
            </Text>
        </View>
    );
};
