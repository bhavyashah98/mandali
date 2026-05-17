import React, { useRef } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { BLINK_SYMBOL_ASSETS } from '../../constants/blinkAssets';

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
        }}>
            <Image
                source={source}
                style={{ width: iconSize, height: iconSize }}
                contentFit="contain"
            />
        </View>
    );
};

// Debounce duration in ms — prevents double-emit from rapid taps
const TAP_DEBOUNCE_MS = 600;

export const BlinkCard = ({ symbols, isCenter = false, onSymbolPress, size }: BlinkCardProps) => {
    if (!symbols || symbols.length === 0) return null;

    // Ref-based debounce — does not cause re-render
    const lastTapRef = useRef<number>(0);

    const handleSymbolPress = (sid: number) => {
        if (!onSymbolPress) return;
        const now = Date.now();
        if (now - lastTapRef.current < TAP_DEBOUNCE_MS) return; // drop rapid taps
        lastTapRef.current = now;
        onSymbolPress(sid);
    };

    const cardRadius = size / 2;

    // Stable but random-per-instance shuffle of indices
    const shuffledIndices = React.useMemo(() => {
        const arr = symbols.map((_, i) => i);
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }, [symbols]);


    // Ring radius: where surrounding icons are placed
    const ringRadius = cardRadius * 0.62;

    // Rotate the whole layout per card instance
    const layoutRotation = React.useMemo(() => (Math.random() * 360) * (Math.PI / 180), [symbols]);

    // ── Assign size tiers ───────────────────────────────────────────
    const tierMap = React.useMemo(() => {
        const tMap = new Map<number, 'big' | 'medium' | 'small'>();
        // Just assign based on the shuffled order
        shuffledIndices.forEach((origIdx, rank) => {
            if (rank < 2) tMap.set(origIdx, 'big');
            else if (rank < 6) tMap.set(origIdx, 'medium');
            else tMap.set(origIdx, 'small');
        });
        return tMap;
    }, [shuffledIndices]);

    // ── Icon size tiers scaled to card diameter ─────────────────────
    const TIER_SIZES = {
        big: [Math.round(size * 0.16), Math.round(size * 0.19)],
        medium: [Math.round(size * 0.11), Math.round(size * 0.13)],
        small: [Math.round(size * 0.075), Math.round(size * 0.09)],
    } as const;

    return (
        <View
            className={`bg-white rounded-full items-center justify-center ${isCenter ? 'border-[3px] border-[#b30069]' : 'border-[3px] border-stone-200'
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
                {shuffledIndices.map((sidIdx, renderIdx) => {
                    const sid = symbols[sidIdx];
                    const tier = tierMap.get(sidIdx) ?? 'medium';
                    const [minSz, maxSz] = TIER_SIZES[tier];
                    const sizeNoise = (sid * 37 + sidIdx * 11) % (maxSz - minSz + 1);
                    const iconSize = minSz + sizeNoise;

                    let x = 0;
                    let y = 0;

                    if (renderIdx === 0) {
                        x = 0;
                        y = 0;
                    } else {
                        const surrounding = symbols.length - 1;
                        const angle = layoutRotation + (renderIdx - 1) * (2 * Math.PI / surrounding);
                        const jitter = ((sid * 7 + sidIdx * 13) % 14) - 7;
                        const dist = Math.min(ringRadius + jitter, cardRadius - iconSize / 2 - 6);
                        x = Math.cos(angle) * dist;
                        y = Math.sin(angle) * dist;
                    }

                    const iconRotation = ((sid * 23 + sidIdx * 17) % 71) - 35;

                    return (
                        <TouchableOpacity
                            key={`${sid}-${sidIdx}`}
                            onPress={() => handleSymbolPress(sid)}
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
