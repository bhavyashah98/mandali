import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BountyFooterProps {
    onStart: () => void;
    isStarting: boolean;
    canStart: boolean;
    isTablet: boolean;
    px: number;
}

const BountyFooter: React.FC<BountyFooterProps> = ({ onStart, isStarting, canStart, isTablet, px }) => {
    const insets = useSafeAreaInsets();

    return (
        <View
            className="bg-[#fdf9f3] border-t border-stone-100"
            style={{
                paddingHorizontal: px,
                paddingTop: isTablet ? 24 : 14,
                paddingBottom: Math.max(insets.bottom, isTablet ? 40 : 20),
            }}
        >
            <TouchableOpacity
                onPress={onStart}
                disabled={isStarting || !canStart}
                activeOpacity={0.9}
                className="flex-row items-center justify-center rounded-[40px]"
                style={{
                    height: isTablet ? 100 : 76,
                    backgroundColor: canStart ? '#b30069' : '#d6d3d1',
                    elevation: canStart ? 8 : 0,
                    shadowColor: '#b30069',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 10,
                }}
            >
                {isStarting ? (
                    <ActivityIndicator color="white" size={isTablet ? 'large' : 'small'} />
                ) : (
                    <>
                        <Ionicons name="lock-closed" size={isTablet ? 30 : 22} color="white" />
                        <Text className="font-headline-bold text-white ml-3"
                            style={{ fontSize: isTablet ? 26 : 18 }}>
                            Lock &amp; Start Game
                        </Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
    );
};

export default React.memo(BountyFooter);
