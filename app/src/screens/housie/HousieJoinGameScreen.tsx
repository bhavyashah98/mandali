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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchHousieGame, joinHousieGame, fetchGroupDetail } from '../../lib/api';

const HousieJoinGameScreen = () => {
    const { width } = useWindowDimensions();
    const isTablet = useIsTablet();
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const route = useRoute();
    const { gameCode: passedGameCode, groupId } = (route.params as { gameCode?: string, groupId?: string }) || {};
    const queryClient = useQueryClient();

    const [gameCode, setGameCode] = useState(passedGameCode || '');
    const [difficulty, setDifficulty] = useState<'easy'|'medium'|'hard'>('easy');
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
        <View className="flex-1 bg-[#fdf9f3]" style={{ paddingTop: insets.top }}>
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
                    contentContainerStyle={{ flexGrow: 1, paddingHorizontal: isTablet ? 80 : 32, paddingBottom: 40 }}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                >
                    <View className={`${isTablet ? 'py-12' : 'py-6'}`}>
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
                                <Text className={`text-[#594048] font-body-bold uppercase tracking-widest mb-3 ml-2 ${isTablet ? 'text-xl' : 'text-xs'}`}>Select Difficulty</Text>
                                <View className="flex-row justify-between gap-3 mb-6">
                                    <TouchableOpacity
                                        onPress={() => { setDifficulty('easy'); setTicketCount('1'); }}
                                        className={`flex-1 rounded-[24px] items-center justify-center border shadow-sm ${isTablet ? 'h-24' : 'h-16'} ${difficulty === 'easy' ? 'bg-[#b30069] border-[#b30069]' : 'bg-white border-stone-100'}`}
                                    >
                                        <Text className={`font-headline-bold ${difficulty === 'easy' ? 'text-white' : 'text-[#1c1c18]'} ${isTablet ? 'text-2xl' : 'text-base'}`}>Easy</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() => { setDifficulty('medium'); setTicketCount('3'); }}
                                        className={`flex-1 rounded-[24px] items-center justify-center border shadow-sm ${isTablet ? 'h-24' : 'h-16'} ${difficulty === 'medium' ? 'bg-[#f59e0b] border-[#f59e0b]' : 'bg-white border-stone-100'}`}
                                    >
                                        <Text className={`font-headline-bold ${difficulty === 'medium' ? 'text-white' : 'text-[#1c1c18]'} ${isTablet ? 'text-2xl' : 'text-base'}`}>Medium</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() => { setDifficulty('hard'); setTicketCount('5'); }}
                                        className={`flex-1 rounded-[24px] items-center justify-center border shadow-sm ${isTablet ? 'h-24' : 'h-16'} ${difficulty === 'hard' ? 'bg-[#ef4444] border-[#ef4444]' : 'bg-white border-stone-100'}`}
                                    >
                                        <Text className={`font-headline-bold ${difficulty === 'hard' ? 'text-white' : 'text-[#1c1c18]'} ${isTablet ? 'text-2xl' : 'text-base'}`}>Hard</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Ticket Count Sub-selection */}
                                <Text className={`text-[#594048] font-body-bold uppercase tracking-widest mb-3 ml-2 ${isTablet ? 'text-xl' : 'text-xs'}`}>Choose Tickets</Text>
                                <View className="flex-row gap-4">
                                    {(difficulty === 'easy' ? ['1', '2'] : difficulty === 'medium' ? ['3', '4'] : ['5', '6']).map((count) => (
                                        <TouchableOpacity
                                            key={count}
                                            onPress={() => setTicketCount(count)}
                                            className={`flex-1 rounded-[24px] items-center justify-center border shadow-sm ${isTablet ? 'h-20' : 'h-14'} ${ticketCount === count ? 'bg-[#1c1c18] border-[#1c1c18]' : 'bg-white border-stone-200'}`}
                                        >
                                            <Text className={`font-headline-bold ${ticketCount === count ? 'text-white' : 'text-[#1c1c18]'} ${isTablet ? 'text-2xl' : 'text-lg'}`}>{count} {count === '1' ? 'Ticket' : 'Tickets'}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </View>

                        {/* Back Link shifted above if inside scroll for small devices */}
                        <TouchableOpacity 
                            onPress={() => navigation.navigate('HousieLobby', { groupId })}
                            className="mt-10 self-center"
                        >
                            <Text className={`text-stone-300 font-body-bold uppercase tracking-[4px] ${isTablet ? 'text-lg' : 'text-xs'}`}>Return to Lobby</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>

                {/* Sticky Footer */}
                <View 
                    className="bg-[#fdf9f3] border-t border-stone-100"
                    style={{ 
                        paddingHorizontal: isTablet ? 80 : 32,
                        paddingTop: isTablet ? 32 : 16,
                        paddingBottom: Math.max(insets.bottom, isTablet ? 48 : 24)
                    }}
                >
                    <TouchableOpacity
                        onPress={handleJoin}
                        disabled={isLoading || !gameCode}
                        style={{ height: isTablet ? 110 : 72 }}
                        className={`bg-[#b30069] rounded-[32px] flex-row items-center justify-center shadow-lg shadow-[#b30069]/20`}
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
                                            Enter Waiting Room
                                        </Text>
                                    </View>
                                </View>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

export default HousieJoinGameScreen;
