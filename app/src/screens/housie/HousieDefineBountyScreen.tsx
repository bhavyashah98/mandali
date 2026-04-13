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
        { id: 'early_five', name: 'Early Five', amount: '0', icon: 'looks-5' },
        { id: 'top_line', name: 'Top Line', amount: '0', icon: 'horizontal-rule' },
        { id: 'middle_line', name: 'Middle Line', amount: '0', icon: 'horizontal-rule' },
        { id: 'bottom_line', name: 'Bottom Line', amount: '0', icon: 'horizontal-rule' },
        { id: 'full_house_1', name: '1st Full House', amount: '0', icon: 'grid-view', isHighlight: true },
        { id: 'full_house_2', name: '2nd Full House', amount: '0', icon: 'grid-view', isHighlight: true },
        { id: 'full_house_3', name: '3rd Full House', amount: '0', icon: 'grid-view', isHighlight: true }
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
            // Distribution: 8% per row (4 rows = 32%), then FH3=16%, FH2=22%, FH1=30%
            const linesAmount = Math.floor(totalPrizePool * 0.08); 
            const fh3Amount = Math.floor(totalPrizePool * 0.16);
            const fh2Amount = Math.floor(totalPrizePool * 0.22);
            const fh1Amount = totalPrizePool - (linesAmount * 4) - fh3Amount - fh2Amount; 

            const standardIds = ['early_five', 'top_line', 'middle_line', 'bottom_line'];
            
            setPrizes(prev => {
                // If the user has added extra custom prizes, we shouldn't overwrite everything blindly
                return prev.map((p) => {
                    if (p.id === 'full_house_1') return { ...p, amount: fh1Amount.toString() };
                    if (p.id === 'full_house_2') return { ...p, amount: fh2Amount.toString() };
                    if (p.id === 'full_house_3') return { ...p, amount: fh3Amount.toString() };
                    if (standardIds.includes(p.id)) return { ...p, amount: linesAmount.toString() };
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

        // Validate unique prize names
        const names = prizes.map(p => p.name.trim().toLowerCase());
        const uniqueNames = new Set(names);
        if (uniqueNames.size !== names.length) {
            Alert.alert('Duplicate Prizes', 'Every prize must have a unique name.');
            return;
        }

        try {
            setIsStarting(true);
            await activateHousieGame(gameCode, prizes);
            // Use navigate (not replace) so WaitingRoom stays alive in stack
            // to receive the game_activated socket event for members still there
            navigation.navigate('HousieGame', { gameCode, groupId });
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

                {/* Compact Dashboard Widget (Sticky) */}
                <View className="px-8 mt-2 mb-4">
                    <View className="bg-white rounded-[32px] p-6 shadow-sm border border-stone-100">
                        <View className="flex-row items-center justify-between">
                            {/* Left Side: Allocated Prizes */}
                            <View>
                                <Text className="text-stone-400 font-body-bold text-[10px] uppercase tracking-[2px] mb-1">Allocated So Far</Text>
                                <Text className={`font-headline-bold text-3xl ${totalAllocated > totalPrizePool ? 'text-orange-600' : 'text-primary'}`}>
                                    ₹{totalAllocated.toLocaleString()}
                                </Text>
                            </View>
                            
                            {/* Right Side: Pool Stats */}
                            <View className="items-end">
                                <Text className="text-stone-400 font-body-bold text-[10px] uppercase tracking-[2px] mb-1">Total Collection</Text>
                                <Text className="text-on-surface font-headline-bold text-xl">₹{totalPrizePool.toLocaleString()}</Text>
                                <View className="flex-row items-center mt-1">
                                    <View className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5" />
                                    <Text className="text-stone-400 font-body-bold text-[10px] uppercase">{stats?.participants?.length || 0} Players</Text>
                                </View>
                            </View>
                        </View>

                        {/* Error Warning (If Exceeded) */}
                        {totalAllocated > totalPrizePool && (
                            <View className="mt-4 bg-orange-50 p-3 rounded-2xl flex-row items-center">
                                <MaterialIcons name="warning" size={16} color="#c2410c" />
                                <Text className="text-orange-800 font-body-medium text-[10px] ml-2 flex-1">
                                    Warning: Allocated prizes exceed the total collection.
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                <ScrollView 
                    className="flex-1 px-8"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 150 }}
                >
                    {/* Title Section */}
                    <View className="mt-4 mb-6">
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

                    {/* Standard Claims Card is the last element now */}
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
                                <Ionicons name="lock-closed" size={24} color="white" />
                                <Text className="text-white font-headline-bold text-2xl ml-3">Lock & Start Game</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default HousieDefineBountyScreen;
