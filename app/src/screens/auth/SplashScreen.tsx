import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Dimensions, Animated, Easing } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';

import { useWindowDimensions } from 'react-native';

const SplashScreen = () => {
    const navigation = useNavigation<any>();
    const { width, height } = useWindowDimensions();

    // Dynamic Relative Sizing Constraints
    const MEDALLION_SIZE = Math.min(260, width * 0.65);
    const HALO_SIZES = [
        MEDALLION_SIZE + 60,
        MEDALLION_SIZE + 120,
        MEDALLION_SIZE + 190
    ];

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.85)).current;
    const floatAnim = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Entry Animations
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1200,
                easing: Easing.ease,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 6,
                tension: 40,
                useNativeDriver: true,
            })
        ]).start();

        // Continuous Floating & Rotation for "Atmospheric" feel
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, {
                    toValue: -15,
                    duration: 2500,
                    easing: Easing.linear,
                    useNativeDriver: true,
                }),
                Animated.timing(floatAnim, {
                    toValue: 0,
                    duration: 2500,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            ])
        ).start();

        Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 25000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();

        const timer = setTimeout(() => {
            navigation.navigate('Login');
        }, 2500);
        return () => clearTimeout(timer);
    }, []);

    const rotation = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

    return (
        <View className="flex-1 bg-[#FDF9F3] items-center justify-center overflow-hidden">
            {/* 1. Cinematic Background Layers */}
            <LinearGradient
                colors={['#FDF9F3', '#ffeaf2', '#FDF9F3']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* Dynamic Light Orbs */}
            <Animated.View
                style={[
                    styles.orb,
                    { top: -50, left: -50, backgroundColor: 'rgba(179,0,105,0.08)', transform: [{ scale: 1.2 }] }
                ]}
            />
            <Animated.View
                style={[
                    styles.orb,
                    { bottom: -100, right: -100, backgroundColor: 'rgba(179,0,105,0.06)', transform: [{ scale: 1.5 }] }
                ]}
            />

            {/* Rotating Atmospheric Textures (Organic Shapes) */}
            <Animated.View style={[styles.textureContainer, { transform: [{ rotate: rotation }] }]}>
                <Svg width={width * 1.8} height={width * 1.8} viewBox="0 0 200 200">
                    <Path
                        fill="rgba(179,0,105,0.025)"
                        d="M45.7,-74.6C59.9,-68.9,72.6,-57.6,80.1,-43.7C87.6,-29.8,89.9,-13.4,88.4,2.5C86.9,18.5,81.6,34,71.8,46.4C62,58.8,47.7,68,32.7,74.1C17.7,80.3,2,83.4,-13.5,81.5C-29,79.5,-44.2,72.6,-56.3,62.1C-68.4,51.6,-77.3,37.6,-81.9,22.3C-86.4,7,-86.6,-9.7,-81.7,-25.1C-76.8,-40.5,-66.8,-54.6,-53.4,-60.9C-40,-67.2,-23.2,-65.7,-7.1,-73.4C9.1,-81.1,24.3,-80.4,45.7,-74.6Z"
                        transform="translate(100 100)"
                    />
                </Svg>
            </Animated.View>

            {/* 2. Central "Luxe Medallion" */}
            <Animated.View
                style={{
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }, { translateY: floatAnim }],
                    alignItems: 'center'
                }}
            >
                <View className="relative items-center justify-center">
                    {/* Multi-layered Halo Effect */}
                    <View style={[styles.halo, { width: HALO_SIZES[0], height: HALO_SIZES[0], borderColor: 'rgba(179,0,105,0.1)' }]} />
                    <View style={[styles.halo, { width: HALO_SIZES[1], height: HALO_SIZES[1], borderColor: 'rgba(179,0,105,0.05)' }]} />
                    <View style={[styles.halo, { width: HALO_SIZES[2], height: HALO_SIZES[2], borderColor: 'rgba(179,0,105,0.02)' }]} />

                    {/* The Primary Medallion Seal */}
                    <View
                        className="rounded-full bg-white items-center justify-center shadow-2xl"
                        style={[
                            styles.medallionShadow,
                            {
                                overflow: 'hidden',
                                width: MEDALLION_SIZE,
                                height: MEDALLION_SIZE,
                                borderWidth: Math.max(6, MEDALLION_SIZE * 0.038), // Responsive border width
                                borderColor: '#b30069'
                            }
                        ]}
                    >
                        <Image
                            source={require('../../../assets/icon.png')}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                        />
                    </View>
                </View>

                {/* 3. High-End Branding Typography */}
                <View className="items-center mt-20 px-8 w-full">
                    <Text
                        className="text-[#b30069] font-headline-bold text-center"
                        style={[
                            styles.headline,
                            {
                                fontSize: Math.min(38, width * 0.1),
                                letterSpacing: Math.min(15, width * 0.035),
                                marginLeft: Math.min(15, width * 0.035),
                            }
                        ]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                    >
                        MANDALI
                    </Text>

                    {/* Decorative Elegant Line */}
                    <View className="h-[1px] w-16 bg-[#b30069]/30 mt-4 rounded-full" />

                    <Text className="text-[#594048]/50 font-body-bold text-center tracking-[4px] uppercase mt-10 text-[11px]">
                        Where your group comes alive
                    </Text>
                </View>
            </Animated.View>

            {/* 4. Footer Narrative & Loading State */}
            <View className="absolute bottom-16 items-center">
                <View className="flex-row items-center space-x-4 mb-6">
                    <Animated.View style={[styles.dot, { backgroundColor: '#b30069' }]} />
                    <Animated.View style={[styles.dot, { backgroundColor: '#b30069', opacity: 0.4 }]} />
                    <Animated.View style={[styles.dot, { backgroundColor: '#b30069', opacity: 0.1 }]} />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    orb: {
        position: 'absolute',
        width: 350,
        height: 350,
        borderRadius: 175,
        opacity: 0.5,
    },
    textureContainer: {
        position: 'absolute',
        zIndex: -1,
    },
    medallionShadow: {
        elevation: 40,
        shadowColor: '#b30069',
        shadowOffset: { width: 0, height: 25 },
        shadowOpacity: 0.35,
        shadowRadius: 35,
    },
    halo: {
        position: 'absolute',
        borderRadius: 999,
        borderWidth: 1.5,
    },
    headline: {
        fontWeight: '900',
        textShadowColor: 'rgba(179,0,105,0.15)',
        textShadowOffset: { width: 0, height: 8 },
        textShadowRadius: 15,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    }
});

export default SplashScreen;
