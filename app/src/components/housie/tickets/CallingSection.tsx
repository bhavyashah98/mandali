import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import HousieClaimCheckingIndicator from '../HousieClaimCheckingIndicator';

interface CallingSectionProps {
    latestNumber: number | string;
    calledCount: number;
    remainingCount: number;
    isPaused?: boolean;
    isAutoMode?: boolean;
    isHost?: boolean;
    isPlayerClaiming: boolean;
    isTablet: boolean;
    onTogglePause: () => void;
}

const CallingSection: React.FC<CallingSectionProps> = ({
    latestNumber,
    calledCount,
    remainingCount,
    isPaused,
    isAutoMode,
    isHost,
    isPlayerClaiming,
    isTablet,
    onTogglePause
}) => {
    return (
        <View className="bg-white border-b border-stone-100 z-10">
            <View className={`px-6 ${isTablet ? 'py-6' : 'py-3'} flex-row items-center justify-between`}>
                <View className="flex-row items-center flex-1">
                    <View
                        style={{ 
                            width: isTablet ? 120 : 64, 
                            height: isTablet ? 120 : 64, 
                            borderRadius: isTablet ? 60 : 32,
                            elevation: 8,
                            shadowColor: '#b30069',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.2,
                            shadowRadius: 8
                        }}
                        className="bg-primary items-center justify-center border-4 border-white"
                    >
                        <Text className={`text-white font-headline-bold ${isTablet ? 'text-4xl' : 'text-2xl'}`}>
                            {latestNumber || "--"}
                        </Text>
                    </View>
                    <View className="ml-4 flex-1">
                        <Text className={`text-stone-400 font-body-bold uppercase tracking-[2px] ${isTablet ? 'text-lg' : 'text-[9px]'}`}>
                            Now Calling
                        </Text>
                        <View className="flex-row items-center mt-0.5">
                            <Text className={`text-stone-800 font-headline-bold ${isTablet ? 'text-3xl' : 'text-base'}`}>
                                {calledCount} <Text className="text-stone-400 font-body-medium text-[11px] uppercase tracking-tighter">Called</Text>
                            </Text>
                            <View className="mx-3 h-4 w-[1px] bg-stone-100" />
                            <Text className={`text-stone-800 font-headline-bold ${isTablet ? 'text-3xl' : 'text-base'}`}>
                                {remainingCount} <Text className="text-stone-400 font-body-medium text-[11px] uppercase tracking-tighter">Left</Text>
                            </Text>
                        </View>
                    </View>
                </View>

                {isHost && isAutoMode && (
                    <TouchableOpacity
                        onPress={onTogglePause}
                        className={`rounded-2xl flex-row items-center border border-stone-100 ${isTablet ? 'px-6 py-3' : 'px-4 py-2'} ${isPaused ? 'bg-orange-50' : 'bg-white'}`}
                    >
                        <MaterialIcons 
                            name={isPaused ? 'play-arrow' : 'pause'} 
                            size={isTablet ? 24 : 18} 
                            color={isPaused ? '#f97316' : '#b30069'} 
                        />
                        <Text className={`font-headline-bold ml-2 uppercase tracking-tight ${isPaused ? 'text-orange-600' : 'text-primary'} ${isTablet ? 'text-xl' : 'text-[11px]'}`}>
                            {isPaused ? 'Resume' : 'Pause'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
            
            {(isPlayerClaiming || isPaused) && (
                <View className={`${isPaused && !isPlayerClaiming ? 'bg-orange-50' : 'bg-amber-50'} py-3 border-t ${isPaused && !isPlayerClaiming ? 'border-orange-100' : 'border-amber-100'} items-center flex-row justify-center`}>
                    {isPlayerClaiming ? (
                        <HousieClaimCheckingIndicator visible={isPlayerClaiming} />
                    ) : (
                        <View className="flex-row items-center">
                            <MaterialIcons name="pause-circle-filled" size={isTablet ? 24 : 16} color="#f97316" />
                            <Text className={`text-orange-600 font-headline-bold ml-2 uppercase tracking-widest ${isTablet ? 'text-lg' : 'text-[10px]'}`}>
                                Game Paused by Host
                            </Text>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
};

export default React.memo(CallingSection);
