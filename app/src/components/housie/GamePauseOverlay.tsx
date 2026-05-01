import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

interface GamePauseOverlayProps {
    visible: boolean;
    isTablet: boolean;
}

const GamePauseOverlay: React.FC<GamePauseOverlayProps> = ({ visible, isTablet }) => {
    if (!visible) return null;

    return (
        <View style={StyleSheet.absoluteFill} className="z-50 items-center justify-center">
            <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="light" />
            <View className="bg-white/90 rounded-[40px] px-10 py-8 items-center shadow-2xl border border-white">
                <View className="bg-orange-100 p-6 rounded-full mb-6">
                    <MaterialIcons name="pause-circle-filled" size={isTablet ? 80 : 48} color="#f97316" />
                </View>
                <Text className={`font-headline-bold text-[#1c1c18] text-center ${isTablet ? 'text-4xl' : 'text-2xl'}`}>
                    Game Paused
                </Text>
                <Text className={`font-body-medium text-stone-500 text-center mt-2 ${isTablet ? 'text-xl px-12' : 'text-sm px-6'}`}>
                    The host has paused the game. Please wait for it to resume.
                </Text>
                
                <View className="flex-row items-center mt-8 bg-orange-50 px-4 py-2 rounded-2xl">
                    <Animated.View className="w-2 h-2 rounded-full bg-orange-400 mr-2" />
                    <Text className="text-orange-600 font-body-bold uppercase tracking-widest text-[10px]">
                        Syncing State...
                    </Text>
                </View>
            </View>
        </View>
    );
};

export default React.memo(GamePauseOverlay);
