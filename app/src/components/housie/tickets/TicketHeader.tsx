import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { updateHousieStatus } from '../../../lib/api';
import { useQuery } from '@tanstack/react-query';
import { fetchHousieGameStyles } from '../../../lib/api';

interface TicketHeaderProps {
    gameTitle?: string;
    gameSettings?: any;
    hostName: string;
    hostId: string;
    gameCode: string;
    userId?: string;
    isTablet: boolean;
    onBack: () => void;
}

const TicketHeader: React.FC<TicketHeaderProps> = ({
    gameTitle, gameSettings, hostName, hostId, gameCode, userId, isTablet, onBack
}) => {
    // Fetch styles from cache (parent screen should have pre-fetched)
    const { data: stylesData } = useQuery({
        queryKey: ['housieStyles'],
        queryFn: fetchHousieGameStyles,
        staleTime: Infinity,
    });

    const isAuto = gameSettings?.callingMode === 'auto';
    const twistId = gameSettings?.gameStyle || 'classic';

    // Resolve the display title from backend data
    const twistLabel = React.useMemo(() => {
        const styles = stylesData?.styles || [];
        const matched = styles.find((s: any) => s.id === twistId);
        return matched.title;
    }, [twistId, stylesData]);

    return (
        <View className={`px-6 flex-row items-center justify-between ${isTablet ? 'py-8' : 'py-4'}`}>
            {/* Back Button */}
            <View style={{ width: isTablet ? 80 : 40 }}>
                <TouchableOpacity
                    onPress={onBack}
                    style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}
                    className={`items-center justify-center rounded-full bg-white border border-stone-100 ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}
                >
                    <MaterialIcons name="arrow-back-ios" size={isTablet ? 24 : 18} color="#594048" style={{ marginLeft: isTablet ? 10 : 5 }} />
                </TouchableOpacity>
            </View>

            {/* Central Info Stack */}
            <View className="flex-1 items-center">
                <Text
                    numberOfLines={1}
                    className={`text-[#594048] font-headline-bold text-center ${isTablet ? 'text-3xl' : 'text-[15px]'}`}
                >
                    {gameTitle || 'Housie Session'}
                </Text>

                <View className="flex-row items-center mt-1">
                    <View
                        style={{ elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}
                        className={`bg-white rounded-full flex-row items-center border border-stone-100 ${isTablet ? 'px-4 py-1.5' : 'px-2 py-0.5'}`}
                    >
                        <View className={`rounded-full bg-green-500 ${isTablet ? 'w-2.5 h-2.5 mr-2' : 'w-1.5 h-1.5 mr-1'}`} />
                        <Text className={`text-stone-500 font-body-bold uppercase tracking-wider ${isTablet ? 'text-base' : 'text-[8px]'}`}>
                            {isAuto ? `${gameSettings.autoCallSeconds}s Auto` : 'Manual'}
                            <Text className="text-stone-300 mx-1">•</Text> {twistLabel}
                            <Text className="text-stone-300 mx-1">•</Text> Host: {hostName}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Actions (Finish for host) */}
            <View style={{ width: isTablet ? 80 : 40, alignItems: 'flex-end' }}>
                {hostId === userId && (
                    <TouchableOpacity
                        onPress={() => {
                            Alert.alert('End Game?', 'Are you sure you want to finish this session?', [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Finish', style: 'destructive', onPress: () => updateHousieStatus(gameCode, 'ended') }
                            ]);
                        }}
                        className="bg-red-50 p-1.5 rounded-xl border border-red-100"
                    >
                        <MaterialIcons name="power-settings-new" size={isTablet ? 24 : 16} color="#dc2626" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};


export default React.memo(TicketHeader);
