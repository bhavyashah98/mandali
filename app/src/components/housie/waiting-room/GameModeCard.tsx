import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface GameModeCardProps {
    gameCode: string;
    settings: any;
    isTablet: boolean;
}

const GameModeCard: React.FC<GameModeCardProps> = ({ gameCode, settings, isTablet }) => {
    const modeInfo = useMemo(() => {
        const style = settings?.gameStyle || 'classic';
        const modeMap: Record<string, { title: string; description: string }> = {
            classic: { title: 'Classic Housie', description: 'Standard rules: Mark numbers as they are called.' },
            plus_one: { title: '+1 Housie', description: 'Twist: Mark the number that is 1 higher than the one called.' },
            minus_one: { title: '-1 Housie', description: 'Twist: Mark the number that is 1 lower than the one called.' },
            reverse: { title: 'Reverse Housie', description: 'Twist: Reverse the digits (e.g., 12 becomes 21) before marking.' },
        };
        return modeMap[style] || modeMap.classic;
    }, [settings?.gameStyle]);

    const callingInfo = useMemo(() => {
        if (settings?.callingMode === 'auto') {
            return {
                mode: 'Automatic Mode',
                detail: `New number every ${settings.autoCallSeconds} seconds`
            };
        }
        return {
            mode: 'Manual Mode',
            detail: 'Host calls the numbers at their pace'
        };
    }, [settings?.callingMode, settings?.autoCallSeconds]);

    return (
        <View 
            style={{ 
                backgroundColor: '#b30069', 
                elevation: 12, 
                shadowColor: '#b30069', 
                shadowOffset: { width: 0, height: 10 }, 
                shadowOpacity: 0.2, 
                shadowRadius: 20 
            }}
            className={`rounded-[48px] items-center mb-6 ${isTablet ? 'p-12' : 'p-8'}`}
        >
            <View className="items-center mb-6">
                <Text
                    className="text-white font-headline-bold text-center"
                    style={{ fontSize: isTablet ? 48 : 32 }}
                >
                    {callingInfo.mode}
                </Text>
                <Text
                    className="text-white/80 font-body-bold text-center mt-1 uppercase tracking-wider"
                    style={{ fontSize: isTablet ? 20 : 13 }}
                >
                    {callingInfo.detail}
                </Text>
            </View>

            <View className="w-full pt-6 border-t border-white/20 items-center">
                <View className="flex-row items-center mb-2">
                    <Ionicons name="sparkles" size={isTablet ? 24 : 16} color="white" />
                    <Text className={`text-white font-headline-bold ml-2 ${isTablet ? 'text-2xl' : 'text-base'}`}>
                        {modeInfo.title}
                    </Text>
                </View>
                <Text className={`text-white/70 font-body-medium text-center leading-relaxed ${isTablet ? 'text-lg' : 'text-xs'}`}>
                    {modeInfo.description}
                </Text>
            </View>
        </View>
    );
};

export default React.memo(GameModeCard);
