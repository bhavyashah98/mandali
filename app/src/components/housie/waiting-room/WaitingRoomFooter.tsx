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
                    paddingHorizontal: isTablet ? 64 : 24,
                    paddingTop: isTablet ? 32 : 16,
                    paddingBottom: Math.max(insets.bottom, isTablet ? 48 : 24)
                }}
            >
                {renderUserTicketStatus()}
                <View className={`rounded-[32px] p-6 border border-[#b30069]/20 bg-[#b30069]/5 items-center justify-center`}>
                    <Ionicons name="calendar" size={isTablet ? 32 : 24} color="#b30069" />
                    <Text className={`text-[#b30069] font-headline-bold text-center mt-2 ${isTablet ? 'text-2xl' : 'text-base'}`}>
                        Game is Scheduled
                    </Text>
                    <Text className={`text-stone-500 font-body-medium text-center mt-1 ${isTablet ? 'text-xl' : 'text-xs'}`}>
                        You can come back at {new Date(scheduledAt || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} to play directly.
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View
            className="bg-[#fdf9f3] border-t border-stone-100"
            style={{
                paddingHorizontal: isTablet ? 64 : 24,
                paddingTop: isTablet ? 32 : 16,
                paddingBottom: Math.max(insets.bottom, isTablet ? 48 : 24)
            }}
        >
            {renderUserTicketStatus()}
            
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
                            className={`rounded-[40px] flex-row items-center justify-center ${isTablet ? 'h-28' : 'h-20'}`}
                        >
                            <Ionicons name="trophy" size={isTablet ? 36 : 26} color="white" />
                            <Text className={`text-white font-headline-bold ml-4 ${isTablet ? 'text-4xl' : 'text-2xl'}`}>Set the Stage →</Text>
                        </TouchableOpacity>
                    ) : (
                        <View className={`rounded-[40px] flex-row items-center justify-center border border-stone-200 bg-stone-50 ${isTablet ? 'h-28' : 'h-20'}`}>
                            <ActivityIndicator color="#b30069" size={isTablet ? 'large' : 'small'} style={{ marginRight: 12 }} />
                            <Text className={`text-stone-400 font-headline-bold ${isTablet ? 'text-3xl' : 'text-lg'}`}>Waiting for host...</Text>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
};

export default React.memo(WaitingRoomFooter);
