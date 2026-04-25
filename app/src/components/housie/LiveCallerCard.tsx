import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

interface LiveCallerCardProps {
    currentNumber: number | string;
    recentNumbers: (number | string)[];
    secondsSinceLastCall: number;
    isPlayerClaiming: boolean;
    isCallingNumber: boolean;
    isEndingGame: boolean;
    onCallNumber: () => void;
    isTablet: boolean;
    gameStatus: string;
}

export const LiveCallerCard: React.FC<LiveCallerCardProps> = ({
    currentNumber,
    recentNumbers,
    secondsSinceLastCall,
    isPlayerClaiming,
    isCallingNumber,
    isEndingGame,
    onCallNumber,
    isTablet,
    gameStatus
}) => {
    return (
        <View className={`bg-white rounded-[40px] items-center shadow-md border border-stone-100 mb-6 ${isTablet ? 'p-10' : 'p-4'}`}>
            <View className="w-full flex-row items-center justify-between px-2 mb-4">
                <Text className={`text-stone-400 font-body-bold uppercase tracking-[3px] ${isTablet ? 'text-xl' : 'text-[9px]'}`}>LIVE CALLER</Text>
                {gameStatus === 'active' && !isPlayerClaiming && (
                    <View className="bg-stone-50 px-3 py-1 rounded-full border border-stone-100 flex-row items-center">
                        <MaterialIcons name="timer" size={isTablet ? 18 : 12} color="#b30069" />
                        <Text className={`text-stone-400 font-headline-bold ml-1.5 uppercase ${isTablet ? 'text-base' : 'text-[9px]'}`}>
                            {secondsSinceLastCall}s Ago
                        </Text>
                    </View>
                )}
            </View>

            <View className="w-full items-center justify-center mb-8">
                <View className="flex-row items-center justify-center gap-x-5 px-4">
                    <View className="items-center">
                        <View style={{ width: isTablet ? 90 : 58, height: isTablet ? 90 : 58, borderRadius: 45 }} className="bg-[#b30069]/10 border border-[#b30069]/20 items-center justify-center">
                            <Text className={`text-[#594048] font-headline-bold text-center ${isTablet ? 'text-3xl' : 'text-lg'}`}>{recentNumbers[1] || '--'}</Text>
                        </View>
                    </View>
                    <View className="items-center">
                        <View style={{ width: isTablet ? 110 : 72, height: isTablet ? 110 : 72, borderRadius: 55 }} className="bg-[#b30069]/20 border border-[#b30069]/30 items-center justify-center">
                            <Text className={`text-[#594048] font-headline-bold text-center ${isTablet ? 'text-4xl' : 'text-2xl'}`}>{recentNumbers[0] || '--'}</Text>
                        </View>
                    </View>
                    <View className="items-center">
                        <View
                            style={{ width: isTablet ? 180 : 110, height: isTablet ? 180 : 110, borderRadius: 90, elevation: 12 }}
                            className="bg-[#b30069] items-center justify-center shadow-2xl shadow-[#b30069]/30 border-[5px] border-white"
                        >
                            <Text className={`text-white font-headline-bold text-center ${isTablet ? 'text-[84px]' : 'text-[54px]'}`}>{currentNumber}</Text>
                        </View>
                    </View>
                </View>
            </View>

            <View className="w-full">
                {isPlayerClaiming ? (
                    <View className={`bg-amber-50 border border-amber-200 rounded-[24px] flex-row items-center justify-center ${isTablet ? 'h-24' : 'h-14'}`}>
                        <ActivityIndicator color="#d97706" size="small" />
                        <Text className={`text-amber-600 font-headline-bold ml-3 ${isTablet ? 'text-2xl' : 'text-xs uppercase'}`}>A player is claiming...</Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        onPress={onCallNumber}
                        disabled={isCallingNumber || isEndingGame}
                        className={`bg-[#b30069] rounded-[24px] flex-row items-center justify-center shadow-md shadow-[#b30069]/20 ${isTablet ? 'h-24' : 'h-14'} ${isEndingGame ? 'opacity-50' : ''}`}
                    >
                        {isCallingNumber ? (
                            <ActivityIndicator color="white" size={isTablet ? 'large' : 'small'} />
                        ) : (
                            <>
                                <Ionicons name="megaphone-sharp" size={isTablet ? 32 : 18} color="white" />
                                <Text className={`text-white font-headline-bold ml-4 ${isTablet ? 'text-3xl' : 'text-lg'}`}>Next Number</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};
