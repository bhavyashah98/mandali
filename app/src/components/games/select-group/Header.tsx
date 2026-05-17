import React from 'react';
import { View, Text } from 'react-native';
import { useIsTablet } from '../../../hooks/useIsTablet';

export const Header: React.FC = () => {
    const isTablet = useIsTablet();

    return (
        <View className="px-6 py-4 flex-row items-center justify-center">
            {/* Centered Header Section */}
            <View
                className="items-center w-full"
                style={{
                    marginTop: isTablet ? 30 : 12,
                    marginBottom: isTablet ? 20 : 12
                }}
            >
                <Text
                    className="font-headline-bold text-[#1c1c18] text-center tracking-tight"
                    style={{ fontSize: isTablet ? 72 : 42 }}
                    adjustsFontSizeToFit
                    numberOfLines={1}
                >
                    Games
                </Text>
                <Text
                    className="font-body-bold text-[#b30069] text-center tracking-[4px] uppercase"
                    style={{
                        fontSize: isTablet ? 20 : 12,
                        marginTop: isTablet ? 8 : 4
                    }}
                >
                    Pick a Mandali
                </Text>
            </View>
        </View>
    );
};
