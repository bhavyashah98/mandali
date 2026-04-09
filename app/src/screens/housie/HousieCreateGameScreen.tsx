import React, { useState } from 'react';
import { 
    View, 
    Text, 
    TouchableOpacity, 
    TextInput, 
    ActivityIndicator, 
    Alert, 
    Keyboard,
    TouchableWithoutFeedback,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { createHousieGame } from '../../lib/api';

const HousieCreateGameScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute();
    const { groupId } = (route.params as { groupId: string }) || {};
    const [ticketPrice, setTicketPrice] = useState('50');
    const [isLoading, setIsLoading] = useState(false);

    const handleCreateGame = async () => {
        if (!groupId) {
            Alert.alert('Error', 'No group selected');
            return;
        }

        const price = parseFloat(ticketPrice);
        if (isNaN(price) || price <= 0) {
            Alert.alert('Error', 'Please enter a valid ticket price');
            return;
        }

        try {
            setIsLoading(true);
            const response = await createHousieGame(groupId, price);
            if (response.success) {
                navigation.replace('HousieWaitingRoom', {
                    gameCode: response.game.game_code,
                    groupId: groupId
                });
            }
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to initialize game');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top', 'bottom']}>
                {/* Minimal Header */}
                <View className="px-8 py-6 flex-row items-center justify-between">
                    <TouchableOpacity 
                        onPress={() => navigation.goBack()}
                        className="w-12 h-12 rounded-full bg-white items-center justify-center shadow-sm"
                    >
                        <MaterialIcons name="close" size={24} color="#594048" />
                    </TouchableOpacity>
                    <Text className="text-stone-400 font-body-bold text-[10px] uppercase tracking-[4px]">Housie Host</Text>
                    <View className="w-12" />
                </View>

                <View className="flex-1 px-8 justify-between pb-10">
                    {/* Hero Title Section with Premium Icon */}
                    <View className="mt-4">
                        <View className="flex-row items-center mb-6">
                            <View className="w-14 h-14 rounded-2xl bg-primary/10 items-center justify-center rotate-[10deg]">
                                <FontAwesome5 name="medal" size={24} color="#b30069" />
                            </View>
                            <View className="ml-4 -rotate-[2deg]">
                                <Text className="text-stone-400 font-body-bold text-[10px] uppercase tracking-[3px]">Mandali Master</Text>
                                <Text className="text-primary font-headline-bold text-lg">Session Host</Text>
                            </View>
                        </View>
                        
                        <Text className="text-[44px] font-headline-bold text-on-surface leading-[48px]">
                            Set the{"\n"}Stakes
                        </Text>
                        <Text className="text-stone-500 font-body-medium text-lg mt-3 leading-6 max-w-[280px]">
                            Choose the ticket price to define the final prize pool.
                        </Text>
                    </View>

                    {/* Central Price Token */}
                    <View className="items-center py-6">
                        <View className="w-full bg-white rounded-[60px] p-10 shadow-2xl shadow-black/[0.04] border border-stone-100 items-center">
                            <Text className="text-stone-300 font-body-bold text-[24px] uppercase tracking-[3px] mb-4">Ticket Value(₹)</Text>
                            
                            <View className="flex-row items-baseline justify-center w-full">
                                <TextInput
                                    value={ticketPrice}
                                    onChangeText={(val) => setTicketPrice(val.replace(/[^0-9]/g, ''))}
                                    keyboardType="number-pad"
                                    placeholder="0"
                                    placeholderTextColor="#e6d9d0"
                                    style={{ 
                                        fontSize: 90, 
                                        fontFamily: Platform.OS === 'ios' ? 'NotoSerif_700Bold' : 'serif',
                                        color: '#b30069',
                                        textAlign: 'center',
                                        padding: 0,
                                        margin: 0,
                                        minWidth: 160,
                                        includeFontPadding: false,
                                        height: 100
                                    }}
                                />
                            </View>

                            {/* Preset Selection Pills */}
                            <View className="flex-row items-center justify-center gap-4 mt-10">
                                {['20', '50', '100', '200'].map((p) => (
                                    <TouchableOpacity 
                                        key={p}
                                        onPress={() => setTicketPrice(p)}
                                        className={`w-14 h-14 rounded-full border items-center justify-center ${ticketPrice === p ? 'bg-primary border-primary' : 'bg-transparent border-stone-100'}`}
                                    >
                                        <Text className={`text-sm font-body-bold ${ticketPrice === p ? 'text-white' : 'text-stone-400'}`}>
                                            {p}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>

                    {/* Bottom CTA Section styled like Lobby's Start Game */}
                    <View>
                        <TouchableOpacity 
                            onPress={handleCreateGame}
                            disabled={isLoading || !ticketPrice}
                            activeOpacity={0.9}
                            className={`bg-primary h-20 rounded-[32px] flex-row items-center justify-center shadow-lg shadow-primary/30 ${isLoading || !ticketPrice ? 'opacity-50' : 'opacity-100'}`}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <MaterialIcons name="bolt" size={28} color="white" />
                                    <Text className="text-white font-headline-bold text-2xl ml-3">Initialize Game</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        </TouchableWithoutFeedback>
    );
};

export default HousieCreateGameScreen;
