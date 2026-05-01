import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface WaitingRoomFooterProps {
    isHost: boolean;
    onStart: () => void;
    totalTickets: number;
    isTablet: boolean;
}

const WaitingRoomFooter: React.FC<WaitingRoomFooterProps> = ({ isHost, onStart, totalTickets, isTablet }) => {
    const insets = useSafeAreaInsets();
    const canStart = totalTickets > 0;

    return (
        <View
            className="bg-[#fdf9f3] border-t border-stone-100"
            style={{
                paddingHorizontal: isTablet ? 64 : 24,
                paddingTop: isTablet ? 32 : 16,
                paddingBottom: Math.max(insets.bottom, isTablet ? 48 : 24)
            }}
        >
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
                    <Text className={`text-stone-400 font-headline-bold ${isTablet ? 'text-3xl' : 'text-lg'}`}>Waiting for host to start...</Text>
                </View>
            )}
        </View>
    );
};

export default React.memo(WaitingRoomFooter);
