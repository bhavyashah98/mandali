import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { updateHousieStatus } from '../../../lib/api';
import { useQueryClient } from '@tanstack/react-query';

interface WaitingRoomHeaderProps {
    groupName: string;
    hostName: string;
    isHost: boolean;
    gameCode: string;
    groupId: string;
    isTablet: boolean;
    onBack: () => void;
}

const WaitingRoomHeader: React.FC<WaitingRoomHeaderProps> = ({
    groupName,
    hostName,
    isHost,
    gameCode,
    groupId,
    isTablet,
    onBack
}) => {
    const queryClient = useQueryClient();

    const handleCancelGame = () => {
        Alert.alert('Cancel Game', 'Are you sure you want to cancel this game?', [
            { text: 'No', style: 'cancel' },
            {
                text: 'Yes, Cancel',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await updateHousieStatus(gameCode, 'ended');
                        await queryClient.invalidateQueries({ queryKey: ['activeHousieGame', groupId] });
                    } catch (err) {
                        Alert.alert('Error', 'Failed to cancel game');
                    }
                }
            }
        ]);
    };

    return (
        <View className={`px-6 flex-row items-center justify-between ${isTablet ? 'py-8 px-12' : 'py-4 px-6'}`}>
            <View style={{ width: isTablet ? 64 : 44 }}>
                <TouchableOpacity
                    onPress={onBack}
                    style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}
                    className={`items-center justify-center rounded-full bg-white border border-stone-100 ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}
                >
                    <MaterialIcons name="arrow-back-ios" size={isTablet ? 28 : 18} color="#594048" style={{ marginLeft: isTablet ? 8 : 5 }} />
                </TouchableOpacity>
            </View>
            
            <View className="flex-1 items-center">
                <Text className={`text-stone-400 font-body-bold uppercase tracking-[3px] text-center ${isTablet ? 'text-lg' : 'text-[9px]'}`} numberOfLines={1}>
                    MANDALI • {groupName || '...'}
                </Text>
                <Text className={`text-[#1c1c18] font-headline-bold ${isTablet ? 'text-4xl mt-1' : 'text-lg'}`}>Waiting Room</Text>
                {hostName && (
                    <Text className={`text-[#b30069] font-body-bold mt-1 ${isTablet ? 'text-xl' : 'text-[11px]'}`}>
                        Hosted by {isHost ? 'You' : hostName}
                    </Text>
                )}
            </View>

            {isHost ? (
                <TouchableOpacity
                    onPress={handleCancelGame}
                    className={`items-center justify-center rounded-full bg-red-50 ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}
                >
                    <MaterialIcons name="delete-outline" size={isTablet ? 36 : 24} color="#ef4444" />
                </TouchableOpacity>
            ) : (
                <View style={{ width: isTablet ? 64 : 44 }} />
            )}
        </View>
    );
};

export default React.memo(WaitingRoomHeader);
