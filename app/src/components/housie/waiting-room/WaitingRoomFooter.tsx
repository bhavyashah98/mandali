import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface WaitingRoomFooterProps {
    isHost: boolean;
    onStart: () => void;
    totalTickets: number;
    userTicketCount: number;
    isTablet: boolean;
    gameStatus?: string;
    scheduledAt?: string;
}

const WaitingRoomFooter: React.FC<WaitingRoomFooterProps> = ({ 
    isHost, 
    onStart, 
    totalTickets, 
    userTicketCount,
    isTablet,
    gameStatus,
    scheduledAt
}) => {
    const insets = useSafeAreaInsets();
    const canStart = totalTickets > 0;

    const renderUserTicketStatus = () => {
        if (userTicketCount === 0) return null;
        return (
            <View className="mb-4 items-center">
                <View className="bg-stone-100 px-4 py-2 rounded-full border border-stone-200">
                    <Text className={`font-body-bold text-stone-600 ${isTablet ? 'text-xl' : 'text-xs'}`}>
                        You have {userTicketCount} ticket{userTicketCount > 1 ? 's' : ''}
                    </Text>
                </View>
            </View>
        );
    };

    if (gameStatus === 'scheduled') {
        return (
            <View
                className="bg-[#fdf9f3] border-t border-stone-100"
                style={{
                    paddingHorizontal: isTablet ? 64 : 20,
                    paddingTop: isTablet ? 24 : 12,
                    paddingBottom: Math.max(insets.bottom, isTablet ? 40 : 16)
                }}
            >
                <View className={`rounded-[32px] p-5 border border-[#b30069]/20 bg-[#b30069]/5 items-center justify-center`}>
                    <Ionicons name="calendar" size={isTablet ? 32 : 20} color="#b30069" />
                    <Text className={`text-[#b30069] font-headline-bold text-center mt-1 ${isTablet ? 'text-2xl' : 'text-sm'}`}>
                        Game is Scheduled
                    </Text>
                    <Text className={`text-stone-500 font-body-medium text-center mt-0.5 ${isTablet ? 'text-xl' : 'text-[10px]'}`}>
                        Starts at {new Date(scheduledAt || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </View>
        );
    }


    return (
        <View
            className="bg-[#fdf9f3] border-t border-stone-100"
            style={{
                paddingHorizontal: isTablet ? 64 : 20,
                paddingTop: isTablet ? 24 : 12,
                paddingBottom: Math.max(insets.bottom, isTablet ? 40 : 16)
            }}
        >
            <View className="flex-row gap-3">
                <View className="flex-1">
                    {isHost ? (
                        <TouchableOpacity
                            onPress={onStart}
                            disabled={!canStart}
                            activeOpacity={0.9}
                            style={{ 
                                backgroundColor: !canStart ? 'rgba(179, 0, 105, 0.5)' : '#b30069',
                                elevation: 8,
                                shadowColor: '#b30069',
                                shadowOffset: { width: 0, height: 8 },
                                shadowOpacity: 0.3,
                                shadowRadius: 12
                            }}
                            className={`rounded-full flex-row items-center justify-center ${isTablet ? 'h-24' : 'h-16'}`}
                        >
                            <Ionicons name="rocket" size={isTablet ? 32 : 22} color="white" />
                            <Text className={`text-white font-headline-bold ml-3 ${isTablet ? 'text-3xl' : 'text-xl'}`}>Start Game →</Text>
                        </TouchableOpacity>
                    ) : (
                        <View className={`rounded-full flex-row items-center justify-center border border-stone-200 bg-stone-50 ${isTablet ? 'h-24' : 'h-16'}`}>
                            <ActivityIndicator color="#b30069" size={isTablet ? 'large' : 'small'} style={{ marginRight: 12 }} />
                            <Text className={`text-stone-400 font-headline-bold ${isTablet ? 'text-2xl' : 'text-base'}`}>Waiting for host...</Text>
                        </View>
                    )}
                </View>
            </View>
        </View>

    );
};

export default React.memo(WaitingRoomFooter);
