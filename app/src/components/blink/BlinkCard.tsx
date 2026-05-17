import React, { useMemo, useRef } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { BLINK_SYMBOL_ASSETS } from '../../constants/blinkAssets';
import { generateLayout } from '../../lib/blinkLayout';

interface BlinkCardProps {
    cardId?: string;
    symbols: number[];
    isCenter?: boolean;
    onSymbolPress?: (symbolId: number) => void;
    size: number;
}

const TAP_DEBOUNCE_MS = 500;

export const BlinkCard = ({
    cardId,
    symbols,
    isCenter = false,
    onSymbolPress,
    size,
}: BlinkCardProps) => {

    const lastTapRef = useRef<number>(0);

    const handleSymbolPress = (sid: number) => {
        if (!onSymbolPress) return;

        const now = Date.now();

        if (now - lastTapRef.current < TAP_DEBOUNCE_MS) {
            return;
        }

        lastTapRef.current = now;
        onSymbolPress(sid);
    };

    const layout = useMemo(() => {
        return generateLayout(symbols, size, cardId ?? '-');
    }, [symbols, cardId, size]);

    return (
        <View
            style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: '#fff',
                borderWidth: 3,
                borderColor: isCenter ? '#b30069' : '#e7e5e4',
                alignItems: 'center',
                justifyContent: 'center',

                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isCenter ? 0.18 : 0.08,
                shadowRadius: 10,
                elevation: 6,
            }}
        >
            {layout.map((item, index) => {
                const source = BLINK_SYMBOL_ASSETS[item.sid];
                const cardIdStr = cardId || symbols.join('-');

                if (!source) return null;

                return (
                    <TouchableOpacity
                        key={`${cardIdStr}-${item.sid}-${index}`}
                        disabled={isCenter}
                        activeOpacity={0.7}
                        onPress={() => handleSymbolPress(item.sid)}
                        style={{
                            position: 'absolute',
                            transform: [
                                { translateX: item.x },
                                { translateY: item.y },
                                { rotate: `${item.rotation}deg` },
                            ],
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.2,
                            shadowRadius: 2,
                            elevation: 2,
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Image
                            source={source}
                            style={{
                                width: item.iconSize,
                                height: item.iconSize,
                            }}
                            contentFit="contain"
                        />
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};
