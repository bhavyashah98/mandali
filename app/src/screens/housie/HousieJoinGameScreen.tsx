import * as React from 'react';
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
import { MaterialIcons, FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchHousieGame, joinHousieGame, fetchGroupDetail, fetchHousieGameStyles } from '../../lib/api';

const HousieJoinGameScreen = () => {
    const { width } = useWindowDimensions();
    const isTablet = useIsTablet();
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const route = useRoute();
    const { gameCode: passedGameCode, groupId } = (route.params as { gameCode?: string, groupId?: string }) || {};
    const queryClient = useQueryClient();

    const [gameCode, setGameCode] = useState(passedGameCode || '');
    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
    const [ticketCount, setTicketCount] = useState('1');
    const [isLoading, setIsLoading] = useState(false);

    // Fetch group name for header
    const { data: groupData } = useQuery({
        queryKey: ['groupDetail', groupId],
        queryFn: () => fetchGroupDetail(groupId!),
        enabled: !!groupId,
    });

    // Fetch game to get settings
    const { data: gameDetails } = useQuery({
        queryKey: ['housieGame', gameCode],
        queryFn: () => fetchHousieGame(gameCode),
        enabled: !!gameCode && gameCode.length >= 6
    });

    const { data: stylesData } = useQuery({
        queryKey: ['housieStyles'],
        queryFn: fetchHousieGameStyles
    });

    const settings = gameDetails?.settings || {};

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

    const styles = stylesData?.styles || [];
    const getVariationLabel = (variation: string) => {
        const style = styles.find(s => s.id === variation);
        return style?.title || 'Classic Mode';
    };

    return (
        <SafeAreaView className="flex-1 bg-[#FDF9F3]" edges={['top']}>
            {/* Header Branding */}
            <View className={`flex-row items-center px-6 ${isTablet ? 'py-8' : 'py-4'}`}>
                <View style={{ width: isTablet ? 64 : 44 }}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}
                        className={`items-center justify-center rounded-full bg-white border border-stone-100 ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}
                    >
                        <MaterialIcons name="arrow-back-ios" size={isTablet ? 28 : 20} color="#b30069" style={{ marginLeft: isTablet ? 12 : 5 }} />
                    </TouchableOpacity>
                </View>
                <View className="flex-1 items-center">
                    <Text
                        className="font-headline-bold text-[#1c1c18] text-center uppercase tracking-tight"
                        style={{ fontSize: isTablet ? 32 : 18 }}
                        numberOfLines={1}
                    >
                        Join Game
                    </Text>
                    <Text
                        className={`text-[#b30069] font-body-bold uppercase tracking-[3px] text-center ${isTablet ? 'text-sm' : 'text-[9px]'}`}
                        numberOfLines={1}
                    >
                        {groupData?.group?.name || 'GATHERING'}
                    </Text>
                </View>
                <View style={{ width: isTablet ? 64 : 44 }} />
            </View>

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ flexGrow: 1, paddingHorizontal: isTablet ? 80 : 24, paddingBottom: 40 }}
            >
                <View className={`${isTablet ? 'py-12' : 'py-4'}`}>
                    {/* Detailed Game Info Card */}
                    {gameDetails && (
                        <View 
                            style={{ elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }}
                            className="bg-white rounded-[40px] border border-stone-100 p-6 mb-8 overflow-hidden"
                        >
                            <View className="absolute top-0 right-0 p-4 opacity-5">
                                <FontAwesome5 name="dice" size={120} color="#b30069" />
                            </View>

                            <View className="flex-row items-center mb-6">
                                <View className="w-12 h-12 rounded-2xl bg-primary/10 items-center justify-center mr-4">
                                    <MaterialIcons name="person" size={24} color="#b30069" />
                                </View>
                                <View>
                                    <Text className="text-stone-400 font-body-bold text-[10px] uppercase tracking-widest">Hosted By</Text>
                                    <Text className="text-[#594048] font-headline-bold text-xl">{gameDetails.hostName || 'The Mandali'}</Text>
                                </View>
                            </View>

                            <View className="flex-row flex-wrap gap-4">
                                {/* Variation / Twist */}
                                <View className="flex-1 min-w-[140px] bg-stone-50 rounded-3xl p-4 border border-stone-100">
                                    <Text className="text-stone-400 font-body-bold text-[9px] uppercase tracking-widest mb-1">Game Twist</Text>
                                    <View className="flex-row items-center">
                                        <Ionicons name="shuffle-outline" size={16} color="#b30069" className="mr-2" />
                                        <Text className="text-[#594048] font-headline-bold text-sm ml-1">
                                            {getVariationLabel(settings.gameStyle || settings.variation)}
                                        </Text>
                                    </View>
                                </View>

                                {/* Calling Mode */}
                                <View className="flex-1 min-w-[140px] bg-stone-50 rounded-3xl p-4 border border-stone-100">
                                    <Text className="text-stone-400 font-body-bold text-[9px] uppercase tracking-widest mb-1">Calling Mode</Text>
                                    <View className="flex-row items-center">
                                        <MaterialIcons name={settings.callingMode === 'auto' ? 'flash-on' : 'touch-app'} size={16} color="#f59e0b" />
                                        <Text className="text-[#594048] font-headline-bold text-sm ml-1">
                                            {settings.callingMode === 'auto' ? `${settings.autoCallSeconds}s Auto` : 'Manual'}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    )}

                    <View className={isTablet ? 'gap-12' : 'gap-8'}>
                        <View>
                            <Text className={`text-[#594048] font-body-bold uppercase tracking-widest mb-4 ml-2 ${isTablet ? 'text-xl' : 'text-[11px]'}`}>Difficulty Level</Text>
                            <View className="flex-row justify-between gap-3 mb-6">
                                <TouchableOpacity
                                    onPress={() => { setDifficulty('easy'); setTicketCount('1'); }}
                                    style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}
                                    className={`flex-1 rounded-[24px] items-center justify-center border ${isTablet ? 'h-24' : 'h-16'} ${difficulty === 'easy' ? 'bg-[#b30069] border-[#b30069]' : 'bg-white border-stone-100'}`}
                                >
                                    <Text className={`font-headline-bold ${difficulty === 'easy' ? 'text-white' : 'text-[#1c1c18]'} ${isTablet ? 'text-2xl' : 'text-base'}`}>Easy</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => { setDifficulty('medium'); setTicketCount('3'); }}
                                    style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}
                                    className={`flex-1 rounded-[24px] items-center justify-center border ${isTablet ? 'h-24' : 'h-16'} ${difficulty === 'medium' ? 'bg-[#f59e0b] border-[#f59e0b]' : 'bg-white border-stone-100'}`}
                                >
                                    <View className="absolute top-1.5 right-1.5 bg-[#31302d] px-1.5 py-0.5 rounded-lg flex-row items-center">
                                        <MaterialCommunityIcons name="crown" size={8} color="#fbbf24" />
                                        <Text className="text-[6px] font-headline-bold text-[#fbbf24] uppercase ml-1">Pro</Text>
                                    </View>
                                    <Text className={`font-headline-bold ${difficulty === 'medium' ? 'text-white' : 'text-[#1c1c18]'} ${isTablet ? 'text-2xl' : 'text-base'}`}>Medium</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => { setDifficulty('hard'); setTicketCount('5'); }}
                                    style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}
                                    className={`flex-1 rounded-[24px] items-center justify-center border ${isTablet ? 'h-24' : 'h-16'} ${difficulty === 'hard' ? 'bg-[#ef4444] border-[#ef4444]' : 'bg-white border-stone-100'}`}
                                >
                                    <View className="absolute top-1.5 right-1.5 bg-[#31302d] px-1.5 py-0.5 rounded-lg flex-row items-center">
                                        <MaterialCommunityIcons name="crown" size={8} color="#fbbf24" />
                                        <Text className="text-[6px] font-headline-bold text-[#fbbf24] uppercase ml-1">Pro</Text>
                                    </View>
                                    <Text className={`font-headline-bold ${difficulty === 'hard' ? 'text-white' : 'text-[#1c1c18]'} ${isTablet ? 'text-2xl' : 'text-base'}`}>Hard</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Ticket Count Sub-selection */}
                            <Text className={`text-[#594048] font-body-bold uppercase tracking-widest mb-4 ml-2 ${isTablet ? 'text-xl' : 'text-[11px]'}`}>How many tickets?</Text>
                            <View className="flex-row gap-4">
                                {(difficulty === 'easy' ? ['1', '2'] : difficulty === 'medium' ? ['3', '4'] : ['5', '6']).map((count) => (
                                    <TouchableOpacity
                                        key={count}
                                        onPress={() => setTicketCount(count)}
                                        style={{ elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }}
                                        className={`flex-1 rounded-[28px] items-center justify-center border ${isTablet ? 'h-24' : 'h-20'} ${ticketCount === count ? 'bg-[#1c1c18] border-[#1c1c18]' : 'bg-white border-stone-200'}`}
                                    >
                                        <View className="items-center">
                                            <Text className={`font-headline-bold ${ticketCount === count ? 'text-white' : 'text-[#1c1c18]'} ${isTablet ? 'text-4xl' : 'text-2xl'}`}>{count}</Text>
                                            <Text className={`font-body-bold uppercase tracking-tighter ${ticketCount === count ? 'text-stone-400' : 'text-stone-300'} ${isTablet ? 'text-sm' : 'text-[8px]'}`}>
                                                {count === '1' ? 'Ticket' : 'Tickets'}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        className="mt-12 self-center"
                    >
                        <Text className={`text-stone-300 font-body-bold uppercase tracking-[4px] ${isTablet ? 'text-lg' : 'text-xs'}`}>Return to Lobby</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Sticky Footer */}
            <View
                className="bg-[#fdf9f3] border-t border-stone-100"
                style={{
                    paddingHorizontal: isTablet ? 80 : 24,
                    paddingTop: isTablet ? 32 : 24,
                    paddingBottom: Math.max(insets.bottom, isTablet ? 40 : 24)
                }}
            >
                <TouchableOpacity
                    onPress={handleJoin}
                    disabled={isLoading || !gameCode}
                    style={{ 
                        height: isTablet ? 100 : 64,
                        elevation: 12,
                        shadowColor: '#b30069',
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.3,
                        shadowRadius: 16
                    }}
                    className={`bg-[#b30069] rounded-[32px] flex-row items-center justify-center ${(!gameCode || isLoading) ? 'opacity-50' : ''}`}
                >
                    {isLoading ? (
                        <ActivityIndicator color="white" size={isTablet ? 'large' : 'small'} />
                    ) : (
                        <View className="flex-row items-center">
                            <MaterialIcons name="local-activity" size={isTablet ? 36 : 24} color="white" />
                            <Text className={`text-white font-headline-bold ml-4 ${isTablet ? 'text-3xl' : 'text-xl'}`}>
                                Join Waiting Room
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

export default HousieJoinGameScreen;

