import React, { useEffect } from 'react';
import { View, Text, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface HousieClaimCheckingIndicatorProps {
    visible: boolean;
}

const HousieClaimCheckingIndicator: React.FC<HousieClaimCheckingIndicatorProps> = ({ visible }) => {
    const fadeAnim = React.useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(fadeAnim, {
                        toValue: 0.4,
                        duration: 800,
                        useNativeDriver: true,
                    })
                ])
            ).start();
        } else {
            fadeAnim.setValue(0);
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <Animated.View 
            style={{ opacity: fadeAnim }}
            className="flex-row items-center justify-center mt-4 bg-amber-50 px-4 py-2 rounded-full border border-amber-100"
        >
            <MaterialIcons name="hourglass-empty" size={16} color="#d97706" />
            <Text className="text-amber-600 font-headline-bold ml-2 uppercase tracking-widest text-[10px]">
                Host is checking a claim...
            </Text>
        </Animated.View>
    );
};

export default HousieClaimCheckingIndicator;
