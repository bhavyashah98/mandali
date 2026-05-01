import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { fetchHousieGameStyles } from '../../../lib/api';

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

    const { data, isLoading } = useQuery({
        queryKey: ['housieStyles'],
        queryFn: fetchHousieGameStyles
    });

    const styles = data?.styles || [
        { id: 'classic', title: 'Classic Housie', description: 'Standard rules and numbers', icon: 'ticket-confirmation-outline' }
    ];

    const selectedStyle = styles.find(s => s.id === gameStyle) || styles[0];

    if (isLoading) {
        return (
            <View className="mb-8 p-4 bg-white rounded-2xl border border-stone-100 items-center justify-center">
                <ActivityIndicator color="#b30069" />
                <Text className="text-stone-400 font-body-medium text-xs mt-2">Loading Twists...</Text>
            </View>
        );
    }

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
                    <MaterialCommunityIcons name={(selectedStyle.icon || 'ticket-confirmation-outline') as any} size={24} color="#b30069" />
                </View>
                <View className="flex-1">
                    <View className="flex-row items-center">
                        <Text className="font-headline-bold text-[#1c1c18]" style={{ fontSize: isTablet ? 20 : 16 }}>
                            {selectedStyle.title}
                        </Text>
                        {gameStyle !== 'classic' && (
                            <View className="bg-[#31302d] px-2 py-0.5 rounded-lg ml-2 flex-row items-center shadow-sm">
                                <MaterialCommunityIcons name="crown" size={10} color="#fbbf24" />
                                <Text className="text-[7px] font-headline-bold text-[#fbbf24] uppercase ml-1">Premium</Text>
                            </View>
                        )}
                    </View>
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
                    {styles.map((style, idx) => (
                        <TouchableOpacity
                            key={style.id}
                            activeOpacity={0.8}
                            onPress={() => { setGameStyle(style.id); setIsDropdownOpen(false); }}
                            className={`p-4 flex-row items-center ${gameStyle === style.id ? 'bg-pink-50' : 'bg-white'} ${idx < styles.length - 1 ? 'border-b border-stone-100' : ''}`}
                        >
                            <MaterialCommunityIcons
                                name={(style.icon || 'ticket-confirmation-outline') as any}
                                size={24}
                                color={gameStyle === style.id ? '#b30069' : '#a09d96'}
                                style={{ marginRight: 16 }}
                            />
                            <View className="flex-1">
                                <View className="flex-row items-center">
                                    <Text
                                        className="font-headline-bold"
                                        style={{ color: gameStyle === style.id ? '#b30069' : '#1c1c18' }}
                                    >
                                        {style.title}
                                    </Text>
                                    {style.id !== 'classic' && (
                                        <View className="bg-[#31302d] px-1.5 py-0.5 rounded-lg ml-2 flex-row items-center">
                                            <MaterialCommunityIcons name="crown" size={8} color="#fbbf24" />
                                            <Text className="text-[7px] font-headline-bold text-[#fbbf24] uppercase ml-1">Premium</Text>
                                        </View>
                                    )}
                                </View>
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
