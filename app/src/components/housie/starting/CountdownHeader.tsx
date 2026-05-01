import React from 'react';
import { View, Text, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CountdownHeaderProps {
    secondsLeft: number;
    progressAnim: Animated.Value;
    pulseAnim: Animated.Value;
    isTablet: boolean;
    modeName?: string;
    modeDescription?: string;
}

const CountdownHeader: React.FC<CountdownHeaderProps> = ({
    secondsLeft,
    progressAnim,
    pulseAnim,
    isTablet,
    modeName,
    modeDescription
}) => {
    const radius = isTablet ? 60 : 45;
    const strokeWidth = isTablet ? 10 : 6;
    const circumference = 2 * Math.PI * radius;
    
    const strokeDashoffset = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [circumference, 0]
    });

    return (
        <View className={`items-center ${isTablet ? 'py-4' : 'py-2'}`}>
            <Animated.View 
                style={{ 
                    width: radius * 2 + strokeWidth * 2, 
                    height: radius * 2 + strokeWidth * 2,
                    transform: [{ scale: pulseAnim }]
                }}
                className="items-center justify-center"
            >
                <Svg height={radius * 2 + strokeWidth * 2} width={radius * 2 + strokeWidth * 2}>
                    <Circle
                        cx={radius + strokeWidth}
                        cy={radius + strokeWidth}
                        r={radius}
                        stroke="#f5f5f4"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                    />
                    <AnimatedCircle
                        cx={radius + strokeWidth}
                        cy={radius + strokeWidth}
                        r={radius}
                        stroke="#b30069"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                    />
                </Svg>
                <View style={{ position: 'absolute', alignItems: 'center' }}>
                    <Text className={`font-headline-bold ${isTablet ? 'text-5xl' : 'text-3xl'}`} style={{ color: '#1c1c18' }}>
                        {secondsLeft}
                    </Text>
                    <Text className="text-stone-400 font-body-bold tracking-[2px] uppercase text-[8px] mt-0.5">Secs</Text>
                </View>
            </Animated.View>

            <View className={`mt-4 items-center px-8 ${isTablet ? 'mb-4' : 'mb-2'}`}>
                <Text className={`font-headline-bold text-center tracking-tight ${isTablet ? 'text-3xl' : 'text-xl'}`} style={{ color: '#1c1c18' }}>
                    {modeName || 'Match Starting Soon'}
                </Text>
                <Text className={`text-stone-400 font-body-medium text-center mt-1 ${isTablet ? 'text-lg px-20' : 'text-[11px]'}`}>
                    {modeDescription || 'Finalizing Bounty List'}
                </Text>
            </View>
        </View>
    );
};

export default React.memo(CountdownHeader);
