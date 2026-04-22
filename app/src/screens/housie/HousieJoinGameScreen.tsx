import * as React from 'react';
import MandaliCoin from '../../components/MandaliCoin';
import { useIsTablet } from '../../hooks/useIsTablet';
import { useState } from 'react';
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
    ScrollView,
    KeyboardAvoidingView,
    useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchHousieGame, joinHousieGame, fetchGroupDetail } from '../../lib/api';

const HousieJoinGameScreen = () => {
    const { width } = useWindowDimensions();
    const isTablet = useIsTablet();
    const navigation = useNavigation<any>();
    const route = useRoute();
    const { gameCode: passedGameCode, groupId } = (route.params as { gameCode?: string, groupId?: string }) || {};
    const queryClient = useQueryClient();

    const [gameCode, setGameCode] = useState(passedGameCode || '');
    const [ticketCount, setTicketCount] = useState('1');
    const [isLoading, setIsLoading] = useState(false);

    // Fetch group name for header
    const { data: groupData } = useQuery({
        queryKey: ['groupDetail', groupId],
        queryFn: () => fetchGroupDetail(groupId!),
        enabled: !!groupId,
    });

    // Fetch game to get ticket price
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
                queryClient.invalidateQueries({ queryKey: ['housieTickets', gameCode.toUpperCase()] });
                
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
        <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top', 'bottom']}>
            {/* Header Branding */}
            <View className={`flex-row items-center px-6 ${isTablet ? 'py-8' : 'py-4'}`}>
                <View style={{ width: isTablet ? 64 : 44 }}>
                    <TouchableOpacity 
                        onPress={() => navigation.navigate('HousieLobby', { groupId })} 
                        className={`items-center justify-center rounded-full bg-white shadow-sm border border-stone-100 ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}
                    >
                        <MaterialIcons name="arrow-back-ios" size={isTablet ? 28 : 20} color="#b30069" style={{ marginLeft: isTablet ? 12 : 5 }} />
                    </TouchableOpacity>
                </View>
                <View className="flex-1 items-center">
                    <Text 
                        className={`text-[#a09a90] font-body-bold uppercase tracking-[3px] text-center ${isTablet ? 'text-xl' : 'text-[10px]'}`}
                        numberOfLines={1}
                    >
                        MANDALI • {groupData?.group?.name || 'GATHERING'}
                    </Text>
                </View>
                <View style={{ width: isTablet ? 64 : 44 }} />
            </View>

            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView 
                    className="flex-1" 
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ flexGrow: 1, paddingHorizontal: isTablet ? 80 : 32, paddingBottom: 100 }}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                >
                    <View className={`flex-1 justify-center ${isTablet ? 'py-12' : 'py-6'}`}>
                        <Text 
                            className="text-[#1c1c18] font-headline-bold mb-4"
                            style={{ fontSize: isTablet ? 72 : 42, lineHeight: isTablet ? 80 : 48 }}
                        >Join the{"\n"}Gathering</Text>
                        <Text 
                            className="text-[#a09d96] font-body-medium"
                            style={{ fontSize: isTablet ? 26 : 18, marginBottom: isTablet ? 60 : 40 }}
                        >Enter the code to grab your tickets. Points represent Mandali Glory and have no cash value.</Text>

                        <View className={isTablet ? 'gap-12' : 'gap-8'}>
                            <View>
                                <Text className={`text-[#594048] font-body-bold uppercase tracking-widest mb-3 ml-2 ${isTablet ? 'text-xl' : 'text-xs'}`}>Game Code</Text>
                                <TextInput
                                    value={gameCode}
                                    onChangeText={setGameCode}
                                    placeholder="E.g. MB-4029"
                                    placeholderTextColor="#c4b9b0"
                                    style={{ height: isTablet ? 100 : 72, fontSize: isTablet ? 36 : 22 }}
                                    className="bg-white rounded-[32px] px-8 font-headline-bold text-[#1c1c18] shadow-sm border border-stone-100"
                                    autoCapitalize="characters"
                                    maxLength={10}
                                />
                            </View>

                            <View>
                                <Text className={`text-[#594048] font-body-bold uppercase tracking-widest mb-3 ml-2 ${isTablet ? 'text-xl' : 'text-xs'}`}>Number of Tickets</Text>
                                <View 
                                    style={{ height: isTablet ? 110 : 80 }}
                                    className="flex-row items-center bg-white rounded-[32px] px-4 shadow-sm border border-stone-100"
                                >
                                    <TouchableOpacity
                                        onPress={() => setTicketCount(Math.max(1, parseInt(ticketCount) - 1).toString())}
                                        activeOpacity={0.7}
                                        className={`${isTablet ? 'w-20 h-20' : 'w-14 h-14'} items-center justify-center bg-stone-50 rounded-[20px]`}
                                    >
                                        <MaterialIcons name="remove" size={isTablet ? 36 : 28} color="#b30069" />
                                    </TouchableOpacity>
                                    
                                    <View className="flex-1 items-center justify-center">
                                        <TextInput
                                            value={ticketCount}
                                            onChangeText={(v) => setTicketCount(v.replace(/[^0-9]/g, ''))}
                                            keyboardType="number-pad"
                                            className="font-headline-bold text-[#1c1c18]"
                                            style={{ fontSize: isTablet ? 48 : 32, padding: 0 }}
                                        />
                                        <Text className={`text-[#a09d96] font-body-bold uppercase ${isTablet ? 'text-lg' : 'text-[9px]'} tracking-[1px]`}>Tickets</Text>
                                    </View>

                                    <TouchableOpacity
                                        onPress={() => setTicketCount((parseInt(ticketCount) + 1).toString())}
                                        activeOpacity={0.7}
                                        className={`${isTablet ? 'w-20 h-20' : 'w-14 h-14'} items-center justify-center bg-[#b30069]/5 rounded-[20px]`}
                                    >
                                        <MaterialIcons name="add" size={isTablet ? 36 : 28} color="#b30069" />
                                    </TouchableOpacity>
                                </View>
                                
                                <View className="flex-row items-center mt-5 ml-4 bg-primary/5 self-start px-4 py-2 rounded-full border border-primary/10">
                                    <Text 
                                        className="text-primary/70 font-body-bold uppercase tracking-[1px]"
                                        style={{ fontSize: isTablet ? 20 : 11 }}
                                    >Price: {ticketPrice}</Text>
                                    <MandaliCoin size={isTablet ? 22 : 14} style={{ marginLeft: 6 }} />
                                    <Text className="text-primary/50 font-body-bold ml-1" style={{ fontSize: isTablet ? 18 : 10 }}>/ ea</Text>
                                </View>
                            </View>
                        </View>

                        <TouchableOpacity
                            onPress={handleJoin}
                            disabled={isLoading || !gameCode}
                            style={{ height: isTablet ? 110 : 72 }}
                            className={`bg-[#b30069] rounded-[32px] ${isTablet ? 'mt-20' : 'mt-12'} flex-row items-center justify-center shadow-lg shadow-[#b30069]/20`}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="white" size={isTablet ? 'large' : 'small'} />
                            ) : (
                                <>
                                    <View className="flex-row items-center justify-center px-4 w-full">
                                        <MaterialIcons name="local-activity" size={isTablet ? 36 : 24} color="white" />
                                        <View className="flex-row items-center ml-4 flex-shrink-1">
                                            <Text 
                                                className="text-white font-headline-bold"
                                                style={{ fontSize: isTablet ? 32 : 22 }}
                                                numberOfLines={1}
                                                adjustsFontSizeToFit
                                            >
                                                Get {ticketCount} {parseInt(ticketCount) === 1 ? 'Ticket' : 'Tickets'} • {parseInt(ticketCount) * ticketPrice}
                                            </Text>
                                            <MandaliCoin size={isTablet ? 32 : 22} style={{ marginLeft: 8 }} />
                                        </View>
                                    </View>
                                </>
                            )}
                        </TouchableOpacity>

                        {/* Back Link */}
                        <TouchableOpacity 
                            onPress={() => navigation.navigate('HousieLobby', { groupId })}
                            className="mt-10 self-center"
                        >
                            <Text className={`text-stone-300 font-body-bold uppercase tracking-[4px] ${isTablet ? 'text-lg' : 'text-xs'}`}>Return to Lobby</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default HousieJoinGameScreen;
