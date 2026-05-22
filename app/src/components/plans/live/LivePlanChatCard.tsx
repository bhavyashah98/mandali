import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const cardStyle = {
    shadowColor: '#b30069',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
};

const LivePlanChatCard = () => (
    <TouchableOpacity
        activeOpacity={0.85}
        className="mx-6 mt-7 bg-white border border-stone-100 rounded-[26px] px-6 py-5 flex-row items-center"
        style={cardStyle}
    >
        <View className="w-16 h-16 rounded-full bg-[#fdeaf4] items-center justify-center mr-5">
            <MaterialIcons name="chat-bubble-outline" size={34} color="#d1007a" />
        </View>
        <View className="flex-1">
            <Text className="font-headline-bold text-[#1c1c18] text-2xl">Plan Chat</Text>
            <Text className="font-body-medium text-stone-400 text-base mt-1">
                Discuss anything about the plan
            </Text>
        </View>
        <View className="w-9 h-9 rounded-full bg-[#d1007a] items-center justify-center mr-4">
            <Text className="font-body-bold text-white">8</Text>
        </View>
        <MaterialIcons name="chevron-right" size={30} color="#8a7a80" />
    </TouchableOpacity>
);

export default LivePlanChatCard;
