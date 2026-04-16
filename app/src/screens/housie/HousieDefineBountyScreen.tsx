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
    Platform,
    useWindowDimensions
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
    const { width } = useWindowDimensions();
    const isTablet = width > 500;
    
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
                <View className={`flex-row items-center px-6 ${isTablet ? 'py-8' : 'py-4'}`}>
                    <TouchableOpacity 
                        onPress={() => navigation.goBack()} 
                        className={`items-center justify-center rounded-full bg-white shadow-sm border border-stone-100 ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}
                    >
                        <MaterialIcons name="arrow-back-ios" size={isTablet ? 28 : 20} color="#b30069" style={{ marginLeft: isTablet ? 12 : 5 }} />
                    </TouchableOpacity>
                </View>

                {/* Centered Header Section */}
                <View 
                    className="items-center w-full"
                    style={{ 
                        marginTop: isTablet ? 20 : 0,
                        marginBottom: isTablet ? 40 : 20 
                    }}
                >
                    <Text
                        className="font-headline-bold text-on-surface text-center tracking-tight text-[#1c1c18]"
                        style={{ fontSize: isTablet ? 72 : 38 }}
                        adjustsFontSizeToFit
                        numberOfLines={1}
                    >
                        Define Bounties
                    </Text>
                    <Text 
                        className="font-body-medium text-on-surface-variant text-center leading-relaxed opacity-60"
                        style={{ 
                            fontSize: isTablet ? 22 : 15,
                            marginTop: isTablet ? 20 : 12,
                            paddingHorizontal: isTablet ? 80 : 32
                        }}
                    >
                        Allocate the total prize pool across your desired claims
                    </Text>
                    <View 
                        className="bg-primary/20 rounded-full"
                        style={{ 
                            height: 4, 
                            width: isTablet ? 120 : 40,
                            marginTop: isTablet ? 36 : 20 
                        }} 
                    />
                </View>

                {/* Compact Dashboard Widget (Sticky) */}
                <View className={`px-${isTablet ? '16' : '8'} mt-2 mb-4`}>
                    <View className={`bg-white rounded-[32px] shadow-sm border border-stone-100 ${isTablet ? 'p-10' : 'p-6'}`}>
                        <View className="flex-row items-center justify-between">
                            {/* Left Side: Allocated Prizes */}
                            <View>
                                <Text className={`text-stone-400 font-body-bold uppercase tracking-[2px] mb-2 ${isTablet ? 'text-xl' : 'text-[10px]'}`}>Allocated So Far</Text>
                                <Text className={`font-headline-bold ${isTablet ? 'text-6xl' : 'text-3xl'} ${totalAllocated > totalPrizePool ? 'text-orange-600' : 'text-primary'}`}>
                                    ₹{totalAllocated.toLocaleString()}
                                </Text>
                            </View>
                            
                            {/* Right Side: Pool Stats */}
                            <View className="items-end">
                                <Text className={`text-stone-400 font-body-bold uppercase tracking-[2px] mb-2 ${isTablet ? 'text-xl' : 'text-[10px]'}`}>Total Collection</Text>
                                <Text className={`text-on-surface font-headline-bold ${isTablet ? 'text-4xl' : 'text-xl'}`}>₹{totalPrizePool.toLocaleString()}</Text>
                                <View className="flex-row items-center mt-2">
                                    <View className={`rounded-full bg-green-500 mr-2 ${isTablet ? 'w-3 h-3' : 'w-1.5 h-1.5'}`} />
                                    <Text className={`text-stone-400 font-body-bold uppercase ${isTablet ? 'text-xl' : 'text-[10px]'}`}>{stats?.participants?.length || 0} Players</Text>
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
                    className={`flex-1 px-${isTablet ? '16' : '8'}`}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: isTablet ? 250 : 150 }}
                >
                            {/* Title (Hidden as we have centered header now) */}
                            {/* <Text ... /> */}

                    {/* Claims Card */}
                    <View className={`bg-[#f7f2eb] rounded-[48px] border border-stone-100 mb-8 ${isTablet ? 'p-12' : 'p-8'}`}>
                        <Text className={`text-on-surface font-headline-bold mb-10 ${isTablet ? 'text-4xl' : 'text-2xl'}`}>Standard Claims</Text>
                        
                        <View className="gap-8">
                            {prizes.map((prize) => (
                                <View key={prize.id}>
                                    <View className="flex-row items-center justify-between mb-4 ml-4">
                                        <View className="flex-row items-center flex-1 mr-6">
                                            {prize.isHighlight && <Ionicons name="star" size={isTablet ? 28 : 16} color="#b30069" style={{ marginRight: 10 }} />}
                                            <TextInput
                                                value={prize.name}
                                                onChangeText={(val) => updatePrizeName(prize.id, val)}
                                                className={`flex-1 ${prize.isHighlight ? 'text-primary font-headline-bold' : 'text-stone-500 font-body-bold'} ${isTablet ? 'text-2xl' : 'text-sm'}`}
                                                placeholder="Prize Name"
                                                placeholderTextColor="#c4b9b0"
                                            />
                                        </View>
                                        <TouchableOpacity onPress={() => deletePrize(prize.id)}>
                                            <MaterialIcons name="delete-outline" size={isTablet ? 32 : 20} color="#c4b9b0" />
                                        </TouchableOpacity>
                                    </View>
                                    <View className={`flex-row items-center bg-[#efede8] rounded-3xl px-8 border border-white/50 ${isTablet ? 'h-24' : 'h-16'}`}>
                                        <Text className={`text-stone-400 font-body-bold mr-4 ${isTablet ? 'text-3xl' : 'text-lg'}`}>₹</Text>
                                        <TextInput
                                            value={prize.amount}
                                            onChangeText={(val) => updatePrizeAmount(prize.id, val)}
                                            keyboardType="number-pad"
                                            className={`flex-1 font-headline-bold text-on-surface ${isTablet ? 'text-4xl' : 'text-xl'}`}
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
                            className={`mt-12 rounded-[32px] border-2 border-dashed border-stone-200 flex-row items-center justify-center ${isTablet ? 'h-24' : 'h-16'}`}
                        >
                            <MaterialIcons name="add-circle" size={isTablet ? 32 : 20} color="#a09d96" />
                            <Text className={`text-stone-400 font-body-bold ml-4 ${isTablet ? 'text-2xl' : 'text-base'}`}>Add Custom Prize</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Standard Claims Card is the last element now */}
                </ScrollView>

                {/* Footer Action */}
                <View className={`bg-[#fdf9f3]/95 ${isTablet ? 'p-16' : 'p-8'}`}>
                    <TouchableOpacity 
                        onPress={handleStartGame}
                        disabled={isStarting || !isPoolBalanced}
                        style={{ height: isTablet ? 110 : 80 }}
                        className={`rounded-[40px] flex-row items-center justify-center shadow-2xl ${isPoolBalanced ? 'bg-primary shadow-primary/30' : 'bg-stone-300 shadow-stone-200'}`}
                    >
                        {isStarting ? (
                            <ActivityIndicator color="white" size={isTablet ? 'large' : 'small'} />
                        ) : (
                            <>
                                <Ionicons name="lock-closed" size={isTablet ? 36 : 24} color="white" />
                                <Text 
                                    className="text-white font-headline-bold ml-4"
                                    style={{ fontSize: isTablet ? 32 : 24 }}
                                >Lock & Start Game</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default HousieDefineBountyScreen;
