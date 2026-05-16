import React from 'react';
import { View, TouchableOpacity, Animated } from 'react-native';
import { Image } from 'expo-image';
import { BLINK_SYMBOL_ASSETS, BLINK_SYMBOL_COLORS } from '../../constants/blinkAssets';

interface BlinkCardProps {
    symbols: number[];
    isCenter?: boolean;
    onSymbolPress?: (symbolId: number) => void;
    size: number;
}

const SymbolIcon = ({ symbolId, iconSize }: { symbolId: number; iconSize: number }) => {
    const source = BLINK_SYMBOL_ASSETS[symbolId];
    if (!source) return null;

    return (
        <View style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 1.5,
            // elevation: 3 // Optional: Might just look like a square on Android, better to omit if testing on Android
        }}>
            <Image 
                source={source} 
                style={{ width: iconSize, height: iconSize }} 
                contentFit="contain"
            />
        </View>
    );
};

export const BlinkCard = ({ symbols, isCenter = false, onSymbolPress, size }: BlinkCardProps) => {
    if (!symbols || symbols.length === 0) return null;

    const cardRadius = size / 2;

    // Card seed
    const seed = symbols.reduce((acc, s) => acc + s, 0);

    // Ring radius: where surrounding icons are placed
    const ringRadius = cardRadius * 0.62;

    // Rotate the whole layout per card
    const layoutRotation = (seed % 360) * (Math.PI / 180);

    // ── Assign size tiers: 2 big, 4 medium, 2 small ──────────────────
    // Deterministically shuffle indices and assign tiers in order
    const indices = symbols.map((_, i) => i);
    const shuffled = [...indices].sort((a, b) => {
        const ha = (symbols[a] * seed * 31 + a * 17) % 1000;
        const hb = (symbols[b] * seed * 31 + b * 17) % 1000;
        return ha - hb;
    });
    // shuffled[0..1] = big, shuffled[2..5] = medium, shuffled[6..7] = small
    const tierMap = new Map<number, 'big' | 'medium' | 'small'>();
    shuffled.forEach((origIdx, rank) => {
        if (rank < 2) tierMap.set(origIdx, 'big');
        else if (rank < 6) tierMap.set(origIdx, 'medium');
        else tierMap.set(origIdx, 'small');
    });

    // ── Icon size tiers scaled to card diameter ─────────────────────
    // big  = ~17% of card size, medium = ~12%, small = ~8%
    const TIER_SIZES = {
        big:    [Math.round(size * 0.16), Math.round(size * 0.19)],
        medium: [Math.round(size * 0.11), Math.round(size * 0.13)],
        small:  [Math.round(size * 0.075), Math.round(size * 0.09)],
    } as const;

    return (
        <View
            className={`bg-white rounded-full items-center justify-center ${
                isCenter ? 'border-[3px] border-[#b30069]' : 'border-[3px] border-stone-200'
            }`}
            style={{
                width: size,
                height: size,
                shadowColor: '#b30069',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isCenter ? 0.18 : 0.06,
                shadowRadius: 16,
                elevation: 7,
            }}
        >
            <View
                className="absolute w-full h-full items-center justify-center"
                pointerEvents="box-none"
            >
                {symbols.map((sid, idx) => {
                    const tier = tierMap.get(idx) ?? 'medium';
                    const [minSz, maxSz] = TIER_SIZES[tier];
                    const sizeNoise = (sid * 37 + idx * 11) % (maxSz - minSz + 1);
                    const iconSize = minSz + sizeNoise;

                    // Position
                    let x = 0;
                    let y = 0;

                    if (idx === 0) {
                        // First icon: center
                        x = 0;
                        y = 0;
                    } else {
                        // Rest: evenly distributed on a ring
                        const surrounding = symbols.length - 1;
                        const angle = layoutRotation + (idx - 1) * (2 * Math.PI / surrounding);

                        // Small per-icon jitter so they don't look too robotic
                        const jitter = ((sid * 7 + idx * 13) % 14) - 7;
                        const dist = Math.min(ringRadius + jitter, cardRadius - iconSize / 2 - 6);

                        x = Math.cos(angle) * dist;
                        y = Math.sin(angle) * dist;
                    }

                    // Playful rotation per icon
                    const iconRotation = ((sid * 23 + idx * 17) % 71) - 35;

                    return (
                        <TouchableOpacity
                            key={`${sid}-${idx}`}
                            onPress={() => onSymbolPress?.(sid)}
                            disabled={isCenter}
                            className="absolute"
                            style={{
                                transform: [
                                    { translateX: x },
                                    { translateY: y },
                                    { rotate: `${iconRotation}deg` },
                                ],
                            }}
                            activeOpacity={0.65}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <SymbolIcon symbolId={sid} iconSize={iconSize} />
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};
