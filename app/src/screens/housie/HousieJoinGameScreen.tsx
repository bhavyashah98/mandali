import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    TouchableOpacity, 
    TextInput, 
    ActivityIndicator, 
    Alert, 
    Keyboard,
    TouchableWithoutFeedback,
    Platform,
    ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { fetchHousieGame, joinHousieGame } from '../../lib/api';

const HousieJoinGameScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute();
    const { gameCode: passedGameCode, groupId } = (route.params as { gameCode?: string, groupId?: string }) || {};

    const [gameCode, setGameCode] = useState(passedGameCode || '');
    const [ticketCount, setTicketCount] = useState('2');
    const [isLoading, setIsLoading] = useState(false);

    // Sync gameCode if passed from params (e.g. from Lobby)
    useEffect(() => {
        if (passedGameCode) {
            setGameCode(passedGameCode);
        }
    }, [passedGameCode]);

    // Fetch game to get the ticket price
    const { data: gameDetails } = useQuery({
        queryKey: ['housieGame', gameCode],
        queryFn: () => fetchHousieGame(gameCode),
        enabled: !!gameCode && gameCode.length >= 6
    });

    const ticketPrice = gameDetails?.ticket_price || 50; 

    const handleJoin = async () => {
        if (!gameCode || gameCode.length < 6) {
            Alert.alert('Invalid Code', 'Please enter a 6-character game code');
            return;
        }

        try {
            setIsLoading(true);
            const count = parseInt(ticketCount);
            if (isNaN(count) || count < 1) {
                Alert.alert('Invalid Selection', 'Please select at least 1 ticket');
                return;
            }

            const response = await joinHousieGame(gameCode.toUpperCase(), count);
            if (response.success) {
                // Navigate to waiting room
                navigation.replace('HousieWaitingRoom', {
                    gameCode: gameCode.toUpperCase(),
                    groupId: groupId
                });
            }
        } catch (error: any) {
            Alert.alert('Join Failed', error.response?.data?.error || 'Could not join this game');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top', 'bottom']}>
                <ScrollView 
                    className="flex-1" 
                    contentContainerStyle={{ flexGrow: 1 }}
                    keyboardShouldPersistTaps="handled"
                >
                    <View className="px-8 mt-12 flex-1 justify-center">
                        <Text className="text-primary font-headline-bold text-[42px] leading-[48px] mb-4">Join the{"\n"}Gathering</Text>
                        <Text className="text-on-surface-variant font-body-medium text-lg mb-10">Enter the code to grab your tickets and start playing.</Text>

                        <View className="gap-6">
                            <View>
                                <Text className="text-[#594048] font-body-bold text-xs uppercase tracking-widest mb-3 ml-2">Game Code</Text>
                                <TextInput
                                    value={gameCode}
                                    onChangeText={setGameCode}
                                    placeholder="E.g. MB-4029"
                                    placeholderTextColor="#a09d96"
                                    className="bg-white h-16 rounded-[24px] px-6 text-xl font-headline-bold text-on-surface shadow-sm border border-stone-100"
                                    autoCapitalize="characters"
                                    maxLength={6}
                                />
                            </View>

                            <View>
                                <Text className="text-[#594048] font-body-bold text-xs uppercase tracking-widest mb-3 ml-2">Number of Tickets</Text>
                                <View className="flex-row items-center bg-white h-16 rounded-[24px] px-4 shadow-sm border border-stone-100">
                                    <TouchableOpacity
                                        onPress={() => setTicketCount(Math.max(1, parseInt(ticketCount) - 1).toString())}
                                        className="w-10 h-10 items-center justify-center bg-stone-50 rounded-full"
                                    >
                                        <MaterialIcons name="remove" size={20} color="#b30069" />
                                    </TouchableOpacity>
                                    <TextInput
                                        value={ticketCount}
                                        onChangeText={setTicketCount}
                                        keyboardType="number-pad"
                                        className="flex-1 text-center text-xl font-headline-bold text-on-surface"
                                    />
                                    <TouchableOpacity
                                        onPress={() => setTicketCount((parseInt(ticketCount) + 1).toString())}
                                        className="w-10 h-10 items-center justify-center bg-stone-50 rounded-full"
                                    >
                                        <MaterialIcons name="add" size={20} color="#b30069" />
                                    </TouchableOpacity>
                                </View>
                                <Text className="text-stone-400 font-body-medium text-xs mt-3 ml-2">Each ticket costs ₹{ticketPrice}</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            onPress={handleJoin}
                            disabled={isLoading || !gameCode}
                            className="bg-primary h-16 rounded-[24px] mt-12 flex-row items-center justify-center shadow-lg shadow-primary/30"
                        >
                            {isLoading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <MaterialIcons name="local-activity" size={24} color="white" />
                                    <Text className="text-white font-headline-bold text-lg ml-3">
                                        Buy {ticketCount} Tickets • ₹{parseInt(ticketCount) * ticketPrice}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>

                        {/* Back Link */}
                        <TouchableOpacity 
                            onPress={() => navigation.goBack()}
                            className="mt-8 self-center"
                        >
                            <Text className="text-stone-400 font-body-bold text-sm tracking-widest uppercase">Go Back</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </TouchableWithoutFeedback>
    );
};

export default HousieJoinGameScreen;
