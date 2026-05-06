import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface GameModeCardProps {
    title?: string;
    gameCode: string;
    settings: any;
    isTablet: boolean;
}

const GameModeCard: React.FC<GameModeCardProps> = ({ title, gameCode, settings, isTablet }) => {

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
            className={`rounded-3xl items-center mb-6 ${isTablet ? 'p-12' : 'p-6'}`}
        >
            {/* 1. Game Title - Small font at top */}
            <Text 
                className="text-white/50 font-body-bold mb-2 uppercase tracking-[2px]"
                style={{ fontSize: isTablet ? 16 : 9 }}
                numberOfLines={1}
            >
                {title || settings?.title || 'Housie Gathering'}

            </Text>

            {/* 2. Mode Title */}
            <Text
                className="text-white font-headline-bold"
                style={{ fontSize: isTablet ? 40 : 28 }}
                numberOfLines={1}
            >
                {callingInfo.mode}
            </Text>

            {/* 3. Mode Detail */}
            <Text
                className="text-white/80 font-body-bold uppercase tracking-wider mb-5"
                style={{ fontSize: isTablet ? 18 : 12 }}
                numberOfLines={1}
            >
                {callingInfo.detail}
            </Text>

            {/* Divider */}
            <View className="w-12 h-[1px] bg-white/20 mb-5" />

            {/* 4. Game Twist Title */}
            <View className="flex-row items-center mb-1">
                <Ionicons name="sparkles" size={isTablet ? 20 : 14} color="white" />
                <Text 
                    className={`text-white font-headline-bold ml-2 ${isTablet ? 'text-2xl' : 'text-base'}`}
                    numberOfLines={1}
                >
                    {modeInfo.title}
                </Text>
            </View>

            {/* 5. Game Twist Description */}
            <Text 
                className={`text-white/70 font-body-medium ${isTablet ? 'text-lg' : 'text-[11px]'}`}
                numberOfLines={1}
            >
                {modeInfo.description}
            </Text>
        </View>


    );
};

export default React.memo(GameModeCard);
