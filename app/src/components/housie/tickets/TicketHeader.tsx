import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { updateHousieStatus } from '../../../lib/api';

interface TicketHeaderProps {
    gameCode: string;
    hostName: string;
    hostId: string;
    userId?: string;
    isTablet: boolean;
    onBack: () => void;
}

const TicketHeader: React.FC<TicketHeaderProps> = ({
    gameCode, hostName, hostId, userId, isTablet, onBack
}) => {
    return (
        <View className={`px-6 items-center flex-row justify-between ${isTablet ? 'py-8' : 'py-4'}`}>
            <TouchableOpacity
                onPress={onBack}
                style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}
                className={`items-center justify-center rounded-full bg-white border border-stone-100 ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}
            >
                <MaterialIcons name="arrow-back-ios" size={isTablet ? 24 : 18} color="#594048" style={{ marginLeft: isTablet ? 10 : 5 }} />
            </TouchableOpacity>
            
            <View 
                style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}
                className={`bg-white rounded-full flex-row items-center border border-stone-100 ${isTablet ? 'px-6 py-2.5' : 'px-3 py-1.5'}`}
            >
                <View className={`rounded-full bg-green-500 ${isTablet ? 'w-3 h-3 mr-2.5' : 'w-2 h-2 mr-1.5'}`} />
                <Text className={`text-stone-600 font-body-bold uppercase tracking-widest ${isTablet ? 'text-lg' : 'text-[9px]'}`}>
                    {gameCode} <Text className="text-stone-300 mx-1">•</Text> LIVE <Text className="text-stone-300 mx-1">•</Text> {hostName}
                </Text>
            </View>

            {hostId === userId ? (
                <TouchableOpacity 
                    onPress={() => {
                        Alert.alert('End Game?', 'Are you sure you want to finish this session?', [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Finish', style: 'destructive', onPress: () => updateHousieStatus(gameCode, 'ended') }
                        ]);
                    }} 
                    className="bg-red-50 px-2 py-1 rounded-xl border border-red-100 flex-row items-center"
                >
                    <MaterialIcons name="power-settings-new" size={isTablet ? 20 : 14} color="#dc2626" />
                    <Text className={`text-[#dc2626] font-headline-bold ml-1 ${isTablet ? 'text-lg' : 'text-[9px] uppercase'}`}>Finish</Text>
                </TouchableOpacity>
            ) : (
                <View style={{ width: isTablet ? 64 : 40 }} />
            )}
        </View>
    );
};

export default React.memo(TicketHeader);
