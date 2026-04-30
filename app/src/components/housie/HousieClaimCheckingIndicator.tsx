//lib
import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface HousieClaimCheckingIndicatorProps {
    visible: boolean;
}

const HousieClaimCheckingIndicator: React.FC<HousieClaimCheckingIndicatorProps> = ({ visible }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (visible) {
            // Fade in
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }).start();

            // Continuous Rotation
            Animated.loop(
                Animated.timing(rotateAnim, {
                    toValue: 1,
                    duration: 2000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            ).start();

            // Continuous Pulse
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.1, duration: 800, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1.0, duration: 800, useNativeDriver: true })
                ])
            ).start();
        } else {
            // Fade out
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    if (!visible && fadeAnim === (0 as any)) return null;

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

    return (
        <Animated.View 
            style={{ 
                opacity: fadeAnim,
                transform: [{ scale: pulseAnim }],
                zIndex: 100
            }}
            className="items-center justify-center pointer-events-none"
        >
            <View className="shadow-lg shadow-orange-500/30">
                <LinearGradient
                    colors={['#fff7ed', '#ffedd5']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="flex-row items-center px-4 py-2 rounded-full border border-orange-200"
                >
                    <Animated.View style={{ transform: [{ rotate: spin }] }}>
                        <MaterialIcons name="hourglass-empty" size={14} color="#f97316" />
                    </Animated.View>
                    
                    <View className="ml-2.5 mr-1">
                        <Text className="text-orange-600 font-headline-bold uppercase tracking-[2px] text-[9px]">
                            Host is verifying a claim
                        </Text>
                        <View className="h-[1px] bg-orange-200 w-full mt-0.5" />
                        <Text className="text-orange-400 font-body-bold uppercase text-[7px] tracking-[1px] mt-0.5">
                            Numbers are paused
                        </Text>
                    </View>

                    <View className="w-1.5 h-1.5 rounded-full bg-orange-500 ml-1" />
                </LinearGradient>
            </View>
        </Animated.View>
    );
};

export default HousieClaimCheckingIndicator;
