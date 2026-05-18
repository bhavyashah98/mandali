import React, { useEffect, useRef } from 'react';
import { View, Text, ScrollView, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface PlayerProgress {
    userId: string;
    name: string;
    cardsLeft: number;
    isYou?: boolean;
    isLeading?: boolean;
    totalCards: number;
    id: string;
    finishedAt?: number;
}

interface BlinkHeaderProps {
    players: PlayerProgress[];
}

const AVATAR = 40;
const STROKE = 2.5;
const R = (AVATAR - STROKE) / 2;
const CIRC = R * 2 * Math.PI;

const PlayerItem = ({ player }: { player: PlayerProgress }) => {
    // Animation refs
    const animatedProgress = useRef(new Animated.Value(1 - Math.min((player.cardsLeft + 1) / (player.totalCards + 1), 1))).current;
    const pulseValue = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Animate the ring progress
        const targetProgress = 1 - Math.min((player.cardsLeft + 1) / (player.totalCards + 1), 1);
        Animated.spring(animatedProgress, {
            toValue: targetProgress,
            useNativeDriver: true,
            tension: 20,
            friction: 7,
        }).start();

        // If leading or just made a move, pulse the avatar
        if (player.isLeading) {
            Animated.sequence([
                Animated.timing(pulseValue, { toValue: 1.1, duration: 200, useNativeDriver: true }),
                Animated.spring(pulseValue, { toValue: 1, friction: 3, useNativeDriver: true })
            ]).start();
        }
    }, [player.cardsLeft, player.isLeading]);

    const dashOffset = animatedProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [CIRC, 0],
    });

    const ringColor = player.isYou ? '#b30069' : '#10b981';

    return (
        <View className="items-center" style={{ marginRight: 14 }}>
            {/* Animated Container */}
            <Animated.View
                style={{
                    width: AVATAR,
                    height: AVATAR,
                    transform: [{ scale: pulseValue }]
                }}
                className="items-center justify-center"
            >
                <Svg
                    width={AVATAR}
                    height={AVATAR}
                    style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}
                >
                    {/* Track */}
                    <Circle
                        cx={AVATAR / 2} cy={AVATAR / 2} r={R}
                        stroke="#f5f5f4" strokeWidth={STROKE} fill="white"
                    />
                    {/* Progress */}
                    <AnimatedCircle
                        cx={AVATAR / 2} cy={AVATAR / 2} r={R}
                        stroke={ringColor} strokeWidth={STROKE}
                        fill="transparent"
                        strokeDasharray={CIRC}
                        strokeDashoffset={dashOffset}
                        strokeLinecap="round"
                    />
                </Svg>

                {/* Count */}
                <Text
                    className="font-headline-bold"
                    style={{
                        fontSize: 14,
                        color: player.isYou ? '#b30069' : '#1c1c18',
                        textShadowColor: 'rgba(0, 0, 0, 0.05)',
                        textShadowOffset: { width: 0, height: 1 },
                        textShadowRadius: 2
                    }}
                >
                    {player.cardsLeft + 1}
                </Text>

                {/* Leading Indicator (Badge) */}
                {player.isLeading && (
                    <View
                        className="absolute -top-1 -right-1 bg-amber-400 rounded-full items-center justify-center border border-white"
                        style={{ width: 14, height: 14 }}
                    >
                        <MaterialIcons name="workspace-premium" size={9} color="white" />
                    </View>
                )}
            </Animated.View>

            {/* Name row */}
            <View className="items-center mt-1">
                <Text
                    numberOfLines={1}
                    className="font-body-bold"
                    style={{
                        fontSize: 8,
                        color: player.isYou ? '#b30069' : '#78716c',
                        letterSpacing: 0.5
                    }}
                >
                    {player.isYou ? 'YOU' : player.name.split(' ')[0].toUpperCase()}
                </Text>
            </View>
        </View>
    );
};

export const BlinkHeader = ({ players }: BlinkHeaderProps) => {
    // 1. Calculate leadership (minimum cards left)
    const minCards = Math.min(...players.map(p => p.cardsLeft));
    const isEarlyGame = players.every(p => p.cardsLeft === p.totalCards);

    // 2. Map players to include dynamic leading status and sort by score
    const playersWithStatus = players.map(p => ({
        ...p,
        isLeading: !isEarlyGame && p.cardsLeft === minCards
    }));

    // Sort by cardsLeft ascending (leader first). If both are finished, the one who finished earlier goes first.
    const sorted = [...playersWithStatus].sort((a, b) => {
        if (a.cardsLeft === b.cardsLeft && a.cardsLeft === -1) {
            return (a.finishedAt || Number.MAX_SAFE_INTEGER) - (b.finishedAt || Number.MAX_SAFE_INTEGER);
        }
        return a.cardsLeft - b.cardsLeft;
    });

    const visible = sorted.slice(0, 5);
    const overflow = sorted.length - 5;

    return (
        <View className="px-5 pt-1 pb-1">
            {/* Player circles */}
            <ScrollView
                horizontal
                layout-animation-enabled="true"
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 8, paddingVertical: 4 }}
            >
                {visible.map((player) => (
                    <PlayerItem key={player.id} player={player} />
                ))}
                {overflow > 0 && (
                    <View className="items-center" style={{ marginRight: 8 }}>
                        <View
                            className="rounded-full bg-stone-50 border border-stone-200 items-center justify-center"
                            style={{ width: AVATAR, height: AVATAR }}
                        >
                            <Text className="text-stone-400 font-body-bold text-xs">+{overflow}</Text>
                        </View>
                        <Text className="text-[8px] font-body-bold text-stone-300 mt-1.5 uppercase tracking-tighter">Others</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
};
