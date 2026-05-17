import React from 'react';
import { View, Text } from 'react-native';

export const BlinkSpectatorPanel = () => {
    return (
        <View className="flex-1 items-center justify-center px-6">
            <View 
                className="bg-white rounded-[32px] border border-stone-100 p-6 items-center justify-center w-full"
                style={{ elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }}
            >
                <View className="bg-green-100 rounded-full flex-row items-center border border-green-200 px-3 py-1 mb-4">
                    <View className="rounded-full bg-green-500 w-2 h-2 mr-2" />
                    <Text className="text-green-800 font-body-bold uppercase tracking-widest text-[9px]">Live Spectator</Text>
                </View>
                <Text className="text-[#594048] font-headline-bold text-center text-lg mb-2">
                    Spectating Blink Match
                </Text>
                <Text className="text-stone-400 font-body-medium text-center text-xs px-2 leading-5">
                    You are watching this fast-paced match in real-time. Match-tapping is disabled for spectators. Watch the players above race to finish their cards!
                </Text>
            </View>
        </View>
    );
};
