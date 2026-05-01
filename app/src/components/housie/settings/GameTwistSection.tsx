import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

export const GAME_STYLES = [
    { id: 'classic', title: 'Classic Housie', description: 'Standard rules and numbers', icon: 'ticket-confirmation-outline' },
    { id: 'plus_one', title: '+1 Housie', description: 'Mark the number + 1 (e.g. Call 10, Mark 11)', icon: 'plus-circle-outline' },
    { id: 'minus_one', title: '-1 Housie', description: 'Mark the number - 1 (e.g. Call 10, Mark 9)', icon: 'minus-circle-outline' },
    { id: 'reverse', title: 'Reverse Housie', description: 'Mark the reversed digits (e.g. Call 12, Mark 21)', icon: 'swap-horizontal-circle-outline' },
];

interface GameTwistSectionProps {
    gameStyle: string;
    setGameStyle: (style: string) => void;
    isTablet: boolean;
}

export const GameTwistSection: React.FC<GameTwistSectionProps> = React.memo(({
    gameStyle,
    setGameStyle,
    isTablet,
}) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const selectedStyle = GAME_STYLES.find(s => s.id === gameStyle) || GAME_STYLES[0];

    return (
        <View className="mb-8 z-50">
            <Text className="font-headline-bold text-[#1c1c18] mb-4" style={{ fontSize: isTablet ? 24 : 18 }}>
                Game Twist
            </Text>

            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setIsDropdownOpen(v => !v)}
                className="bg-white border border-stone-200 shadow-sm rounded-2xl p-4 flex-row items-center"
            >
                <View className="w-12 h-12 rounded-full bg-pink-50 items-center justify-center mr-4">
                    <MaterialCommunityIcons name={selectedStyle.icon as any} size={24} color="#b30069" />
                </View>
                <View className="flex-1">
                    <Text className="font-headline-bold text-[#1c1c18]" style={{ fontSize: isTablet ? 20 : 16 }}>
                        {selectedStyle.title}
                    </Text>
                    <Text className="font-body-regular text-stone-500 mt-1" style={{ fontSize: isTablet ? 14 : 12 }}>
                        {selectedStyle.description}
                    </Text>
                </View>
                <MaterialIcons
                    name={isDropdownOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                    size={28}
                    color="#a09d96"
                />
            </TouchableOpacity>

            {isDropdownOpen && (
                <View className="bg-white border border-stone-100 rounded-2xl mt-2 overflow-hidden shadow-xl">
                    {GAME_STYLES.map((style, idx) => (
                        <TouchableOpacity
                            key={style.id}
                            activeOpacity={0.8}
                            onPress={() => { setGameStyle(style.id); setIsDropdownOpen(false); }}
                            className={`p-4 flex-row items-center ${gameStyle === style.id ? 'bg-pink-50' : 'bg-white'} ${idx < GAME_STYLES.length - 1 ? 'border-b border-stone-100' : ''}`}
                        >
                            <MaterialCommunityIcons
                                name={style.icon as any}
                                size={24}
                                color={gameStyle === style.id ? '#b30069' : '#a09d96'}
                                style={{ marginRight: 16 }}
                            />
                            <View className="flex-1">
                                <Text
                                    className="font-headline-bold"
                                    style={{ color: gameStyle === style.id ? '#b30069' : '#1c1c18' }}
                                >
                                    {style.title}
                                </Text>
                                <Text className="font-body-regular text-stone-400 mt-0.5" style={{ fontSize: 12 }}>
                                    {style.description}
                                </Text>
                            </View>
                            {gameStyle === style.id && (
                                <MaterialIcons name="check" size={20} color="#b30069" />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
});
