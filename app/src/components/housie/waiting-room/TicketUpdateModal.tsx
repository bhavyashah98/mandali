import React, { useState } from 'react';
import { 
    View, 
    Text, 
    Modal, 
    TouchableOpacity, 
    TouchableWithoutFeedback, 
    ActivityIndicator,
    Alert
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { updateHousieTicketCount } from '../../../lib/api';
import { useQueryClient } from '@tanstack/react-query';

interface TicketUpdateModalProps {
    visible: boolean;
    onClose: () => void;
    currentCount: number;
    gameCode: string;
}

const TicketUpdateModal: React.FC<TicketUpdateModalProps> = ({ 
    visible, 
    onClose, 
    currentCount,
    gameCode 
}) => {
    const [count, setCount] = useState(currentCount);
    const [isUpdating, setIsUpdating] = useState(false);
    const queryClient = useQueryClient();

    React.useEffect(() => {
        if (visible) {
            setCount(currentCount);
        }
    }, [visible, currentCount]);

    const handleUpdate = async () => {
        try {
            setIsUpdating(true);
            const response = await updateHousieTicketCount(gameCode, count);
            if (response.success) {
                // Invalidate relevant queries
                queryClient.invalidateQueries({ queryKey: ['housieParticipants', gameCode] });
                queryClient.invalidateQueries({ queryKey: ['housieGame', gameCode] });
                queryClient.invalidateQueries({ queryKey: ['housieTickets', gameCode] });
                onClose();
            }
        } catch (error: any) {
            Alert.alert('Update Failed', error.response?.data?.error || 'Could not update tickets');
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View className="flex-1 bg-black/60 justify-center px-6">
                    <TouchableWithoutFeedback>
                        <View className="bg-[#fdf9f3] rounded-3xl p-8">
                            <View className="items-center mb-6">
                                <View className="w-16 h-16 rounded-2xl bg-primary/10 items-center justify-center mb-4">
                                    <MaterialIcons name="local-activity" size={32} color="#b30069" />
                                </View>
                                <Text className="text-[#594048] font-headline-bold text-2xl text-center">
                                    Adjust Tickets
                                </Text>
                                <Text className="text-stone-400 font-body-medium text-center mt-1">
                                    Set your total tickets for this game
                                </Text>
                            </View>

                            <View className="flex-row items-center justify-center mb-8 gap-8">
                                <TouchableOpacity 
                                    onPress={() => setCount(Math.max(0, count - 1))}
                                    className={`w-14 h-14 rounded-full bg-white border border-stone-100 items-center justify-center shadow-sm ${count === 0 ? 'opacity-30' : ''}`}
                                    disabled={count === 0}
                                >
                                    <Ionicons name="remove" size={28} color="#b30069" />
                                </TouchableOpacity>

                                <View className="items-center min-w-[60px]">
                                    <Text className="text-[#594048] font-headline-bold text-5xl">
                                        {count}
                                    </Text>
                                    <Text className="text-stone-400 font-body-bold text-2xs uppercase tracking-widest">
                                        {count === 1 ? 'Ticket' : 'Tickets'}
                                    </Text>
                                </View>

                                <TouchableOpacity 
                                    onPress={() => setCount(Math.min(6, count + 1))}
                                    className={`w-14 h-14 rounded-full bg-white border border-stone-100 items-center justify-center shadow-sm ${count === 6 ? 'opacity-30' : ''}`}
                                    disabled={count === 6}
                                >
                                    <Ionicons name="add" size={28} color="#b30069" />
                                </TouchableOpacity>
                            </View>

                            <View className="flex-row gap-4">
                                <TouchableOpacity 
                                    onPress={onClose}
                                    className="flex-1 py-4 rounded-2xl bg-stone-100 items-center"
                                >
                                    <Text className="text-stone-500 font-headline-bold">Cancel</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                    onPress={handleUpdate}
                                    disabled={isUpdating || count === currentCount}
                                    className={`flex-2 py-4 rounded-2xl bg-primary items-center justify-center ${isUpdating || count === currentCount ? 'opacity-50' : ''}`}
                                    style={{ flex: 2 }}
                                >
                                    {isUpdating ? (
                                        <ActivityIndicator color="white" size="small" />
                                    ) : (
                                        <Text className="text-white font-headline-bold">
                                            {count === 0 ? 'Leave Game' : 'Update Count'}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

export default TicketUpdateModal;
