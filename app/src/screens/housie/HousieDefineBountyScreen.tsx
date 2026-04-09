import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    TouchableOpacity, 
    TextInput, 
    ScrollView, 
    ActivityIndicator, 
    Alert,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { API_URL, getAuthHeaders, activateHousieGame } from '../../lib/api';
import axios from 'axios';

const HousieDefineBountyScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute();
    const { gameCode, groupId } = (route.params as { gameCode: string; groupId: string }) || {};

    const [isStarting, setIsStarting] = useState(false);
    
    // Standard Prizes
    const [prizes, setPrizes] = useState([
        { id: 'early_five', name: 'Early Five', amount: '500', icon: 'looks-5' },
        { id: 'top_line', name: 'Top Line', amount: '1000', icon: 'horizontal-rule' },
        { id: 'middle_line', name: 'Middle Line', amount: '1000', icon: 'horizontal-rule' },
        { id: 'bottom_line', name: 'Bottom Line', amount: '1000', icon: 'horizontal-rule' },
        { id: 'full_house', name: 'Full House', amount: '5000', icon: 'grid-view', isHighlight: true }
    ]);

    // Fetch Stats for Pool calculation
    const { data: stats } = useQuery({
        queryKey: ['housieParticipants', gameCode],
        queryFn: async () => {
            const headers = await getAuthHeaders();
            const response = await axios.get(`${API_URL}/housie/${gameCode}/participants`, { headers });
            return response.data;
        },
        staleTime: Infinity, // Keep stats stable while defining bounties
        refetchOnWindowFocus: false,
    });

    const totalPrizePool = stats?.totalPrizePool || 0;

    // Automated Prize Distribution Logic
    useEffect(() => {
        if (totalPrizePool > 0) {
            const linesAmount = Math.floor(totalPrizePool * 0.15); // 15% each for first 4
            const fullHouseAmount = totalPrizePool - (linesAmount * 4); // Remainder for Full House

            const standardIds = ['early_five', 'top_line', 'middle_line', 'bottom_line', 'full_house'];
            
            setPrizes(prev => {
                // If the user has added extra custom prizes, we shouldn't overwrite everything blindly
                return prev.map((p, idx) => {
                    if (p.id === 'full_house') {
                        return { ...p, amount: fullHouseAmount.toString() };
                    } else if (standardIds.includes(p.id)) {
                        return { ...p, amount: linesAmount.toString() };
                    }
                    return p;
                });
            });
        }
    }, [totalPrizePool]);

    const updatePrizeAmount = (id: string, amount: string) => {
        setPrizes(prizes.map(p => p.id === id ? { ...p, amount } : p));
    };

    const updatePrizeName = (id: string, name: string) => {
        setPrizes(prizes.map(p => p.id === id ? { ...p, name } : p));
    };

    const deletePrize = (id: string) => {
        setPrizes(prizes.filter(p => p.id !== id));
    };

    const addCustomPrize = () => {
        const newId = `custom_${Date.now()}`;
        setPrizes([...prizes, { id: newId, name: 'Custom Prize', amount: '0', icon: 'stars' }]);
    };

    const totalAllocated = prizes.reduce((sum, p) => sum + (parseInt(p.amount) || 0), 0);
    const isPoolBalanced = totalAllocated === totalPrizePool && totalPrizePool > 0;

    const handleStartGame = async () => {
        if (!isPoolBalanced) {
            Alert.alert('Pool Mismatch', `You must allocate exactly ₹${totalPrizePool.toLocaleString()} across your prizes.`);
            return;
        }
        try {
            setIsStarting(true);
            await activateHousieGame(gameCode, prizes);
            navigation.replace('HousieGame', { gameCode, groupId });
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to start game');
            setIsStarting(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top']}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                {/* Header */}
                <View className="px-8 py-6 flex-row items-center justify-between">
                    <TouchableOpacity 
                        onPress={() => navigation.goBack()}
                        className="w-12 h-12 rounded-full bg-white items-center justify-center shadow-sm"
                    >
                        <MaterialIcons name="arrow-back" size={24} color="#594048" />
                    </TouchableOpacity>
                    <Text className="text-stone-400 font-body-bold text-[10px] uppercase tracking-[4px]">Bounty Session</Text>
                    <View className="w-12" />
                </View>

                <ScrollView 
                    className="flex-1 px-8"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 150 }}
                >
                    {/* Title Section */}
                    <View className="mt-4 mb-10">
                        <Text className="text-[44px] font-headline-bold text-on-surface leading-tight">
                            Define Prizes
                        </Text>
                        <Text className="text-stone-500 font-body-medium text-base mt-3 leading-5">
                            Allocate the total prize pool across your desired claims.
                        </Text>
                    </View>

                    {/* Claims Card */}
                    <View className="bg-[#f7f2eb] rounded-[48px] p-8 mb-8 border border-stone-100">
                        <Text className="text-on-surface font-headline-bold text-2xl mb-8">Standard Claims</Text>
                        
                        <View className="gap-8">
                            {prizes.map((prize) => (
                                <View key={prize.id}>
                                    <View className="flex-row items-center justify-between mb-3 ml-2">
                                        <View className="flex-row items-center flex-1 mr-4">
                                            {prize.isHighlight && <Ionicons name="star" size={16} color="#b30069" style={{ marginRight: 8 }} />}
                                            <TextInput
                                                value={prize.name}
                                                onChangeText={(val) => updatePrizeName(prize.id, val)}
                                                className={`flex-1 ${prize.isHighlight ? 'text-primary font-headline-bold' : 'text-stone-500 font-body-bold'} text-sm`}
                                                placeholder="Prize Name"
                                                placeholderTextColor="#c4b9b0"
                                            />
                                        </View>
                                        <TouchableOpacity onPress={() => deletePrize(prize.id)}>
                                            <MaterialIcons name="delete-outline" size={20} color="#c4b9b0" />
                                        </TouchableOpacity>
                                    </View>
                                    <View className="flex-row items-center bg-[#efede8] h-16 rounded-3xl px-6 border border-white/50">
                                        <Text className="text-stone-400 font-body-bold text-lg mr-3">₹</Text>
                                        <TextInput
                                            value={prize.amount}
                                            onChangeText={(val) => updatePrizeAmount(prize.id, val)}
                                            keyboardType="number-pad"
                                            className="flex-1 text-xl font-headline-bold text-on-surface"
                                            placeholder="0"
                                            placeholderTextColor="#c4b9b0"
                                        />
                                    </View>
                                </View>
                            ))}
                        </View>

                        {/* Add Custom Button */}
                        <TouchableOpacity 
                            onPress={addCustomPrize}
                            className="mt-10 h-16 rounded-3xl border-2 border-dashed border-stone-200 flex-row items-center justify-center"
                        >
                            <MaterialIcons name="add-circle" size={20} color="#a09d96" />
                            <Text className="text-stone-400 font-body-bold text-base ml-3">Add Custom Prize</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Summary Card */}
                    <View className="bg-white rounded-[40px] p-8 shadow-sm border border-stone-100">
                        <Text className="text-stone-400 font-body-bold text-xs uppercase tracking-[2px] mb-2">Total Prize Pool</Text>
                        <View className="flex-row items-baseline">
                            <Text className="text-primary font-headline-bold text-[48px]">₹{totalAllocated.toLocaleString()}</Text>
                            <Text className="text-stone-400 font-body-medium text-xs ml-3">Calculated total</Text>
                        </View>

                        <View className="h-[1px] w-full bg-stone-50 my-6" />

                        <View className="flex-row justify-between mb-3">
                            <Text className="text-stone-400 font-body-medium">Active Members</Text>
                            <Text className="text-on-surface font-body-bold">{stats?.participants?.length || 0} Players</Text>
                        </View>
                        <View className="flex-row justify-between">
                            <Text className="text-stone-400 font-body-medium">Total Collection</Text>
                            <Text className="text-on-surface font-body-bold">₹{totalPrizePool.toLocaleString()}</Text>
                        </View>
                        
                        {totalAllocated > totalPrizePool && (
                            <View className="mt-4 bg-orange-50 p-4 rounded-2xl flex-row items-center">
                                <MaterialIcons name="warning" size={16} color="#c2410c" />
                                <Text className="text-orange-800 font-body-medium text-[10px] ml-2 flex-1">
                                    Heads up! Your specified prizes exceed the current collection.
                                </Text>
                            </View>
                        )}
                    </View>
                </ScrollView>

                {/* Footer Action */}
                <View className="absolute bottom-0 left-0 right-0 p-8 bg-[#fdf9f3]/95">
                    <TouchableOpacity 
                        onPress={handleStartGame}
                        disabled={isStarting || !isPoolBalanced}
                        className={`h-20 rounded-[32px] flex-row items-center justify-center shadow-2xl ${isPoolBalanced ? 'bg-primary shadow-primary/30' : 'bg-stone-300 shadow-stone-200'}`}
                    >
                        {isStarting ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Ionicons name="play" size={28} color="white" />
                                <Text className="text-white font-headline-bold text-2xl ml-3">Start the Game</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default HousieDefineBountyScreen;
