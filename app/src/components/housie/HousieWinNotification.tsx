import React, { useEffect, useState } from 'react';
import { View, Text, Animated, Image, useWindowDimensions } from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

interface HousieWinNotificationProps {
    visible: boolean;
    type: 'win' | 'boggy';
    playerName: string;
    avatarUrl?: string;
    prizeName?: string;
    onComplete: () => void;
}

const HousieWinNotification: React.FC<HousieWinNotificationProps> = ({
    visible,
    type,
    playerName,
    avatarUrl,
    prizeName,
    onComplete
}) => {
    const { width, height } = useWindowDimensions();
    const [opacity] = useState(new Animated.Value(0));
    const [scale] = useState(new Animated.Value(0.8));

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.spring(scale, {
                    toValue: 1,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true,
                })
            ]).start();

            // Auto-hide after 3 seconds as requested
            const timer = setTimeout(() => {
                hide();
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [visible]);

    const hide = () => {
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
            }),
            Animated.timing(scale, {
                toValue: 0.9,
                duration: 400,
                useNativeDriver: true,
            })
        ]).start(() => {
            onComplete();
        });
    };

    if (!visible) return null;

    const isWin = type === 'win';
    
    // Premium Gradients
    const winGradient: [string, string, ...string[]] = ['#4c1d95', '#b30069', '#f59e0b']; // Purple -> Mandali Pink -> Gold
    const boggyGradient: [string, string, ...string[]] = ['#450a0a', '#991b1b', '#1c1c1c']; // Dark Red -> Crimson -> Nearly Black

    return (
        <Animated.View 
            style={{ 
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 9999,
                opacity,
                transform: [{ scale }],
            }}
            pointerEvents="none"
        >
            <View className="overflow-hidden rounded-[48px] shadow-2xl shadow-black/60 w-[85%] max-w-[420px]">
                <LinearGradient
                    colors={isWin ? winGradient : boggyGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ padding: 2 }}
                >
                    <View className="overflow-hidden rounded-[46px] bg-white/10">
                        <BlurView intensity={20} tint={isWin ? 'light' : 'dark'} className="items-center p-10">
                            {/* Floating Decoration Icons */}
                            <View className="absolute top-6 right-6">
                                {isWin ? (
                                    <FontAwesome5 name="crown" size={24} color="#f59e0b" style={{ transform: [{ rotate: '15deg' }] }} />
                                ) : (
                                    <MaterialIcons name="warning" size={28} color="#ef4444" />
                                )}
                            </View>

                            {/* Large Avatar with Glowing Ring */}
                            <View className={`rounded-full p-2 mb-6 ${isWin ? 'bg-yellow-400/30' : 'bg-red-500/20'}`}>
                                <View className={`rounded-full p-1 ${isWin ? 'bg-white/40' : 'bg-red-500/40'}`}>
                                    <View className="rounded-full overflow-hidden border-4 border-white" style={{ width: 130, height: 130 }}>
                                        {avatarUrl ? (
                                            <Image source={{ uri: avatarUrl }} className="w-full h-full" />
                                        ) : (
                                            <View className={`w-full h-full items-center justify-center ${isWin ? 'bg-amber-500' : 'bg-red-700'}`}>
                                                <Text className="text-white font-headline-bold text-5xl">
                                                    {playerName.charAt(0).toUpperCase()}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </View>

                            {/* Main Content */}
                            <View className="items-center">
                                <View className={`px-4 py-1 rounded-full mb-3 ${isWin ? 'bg-white/20' : 'bg-red-900/40'}`}>
                                    <Text className={`font-body-bold text-[10px] uppercase tracking-[3px] text-white`}>
                                        {isWin ? 'CLAIM ACCEPTED' : 'BOGGY ALERT'}
                                    </Text>
                                </View>
                                
                                <Text className="font-headline-bold text-4xl text-center mb-3 text-white shadow-sm shadow-black">
                                    {playerName}
                                </Text>
                                
                                <View className="flex-row items-center justify-center bg-white/90 px-6 py-4 rounded-3xl shadow-lg">
                                    {isWin ? (
                                        <FontAwesome5 name="trophy" size={22} color="#b30069" style={{ marginRight: 10 }} />
                                    ) : (
                                        <MaterialIcons name="block" size={24} color="#ef4444" style={{ marginRight: 10 }} />
                                    )}
                                    <Text className={`font-headline-bold text-xl ${isWin ? 'text-[#b30069]' : 'text-red-600'}`}>
                                        {prizeName}
                                    </Text>
                                </View>

                                {isWin && (
                                    <Text className="text-white/80 font-body-bold mt-5 text-center text-lg">
                                        BIG WINNER! 👑
                                    </Text>
                                )}
                            </View>
                        </BlurView>
                    </View>
                </LinearGradient>
            </View>
        </Animated.View>
    );
};

export default HousieWinNotification;
