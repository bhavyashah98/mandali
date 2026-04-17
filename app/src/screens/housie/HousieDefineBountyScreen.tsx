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
import { API_URL, getAuthHeaders, activateHousieGame, fetchGroupDetail } from '../../lib/api';
import axios from 'axios';

const HousieDefineBountyScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute();
    const { gameCode, groupId } = (route.params as { gameCode: string; groupId: string }) || {};

    const [isStarting, setIsStarting] = useState(false);
    const { width } = useWindowDimensions();
    const isTablet = width > 500;

    // Fetch Group Detail for Header
    const { data: groupData } = useQuery({
        queryKey: ['groupDetail', groupId],
        queryFn: () => fetchGroupDetail(groupId!),
        enabled: !!groupId,
    });

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
            Alert.alert('Pool Mismatch', `Target: ₹${totalPrizePool}\nAllocated: ₹${totalAllocated}\n\nPlease balance the prizes.`);
            return;
        }

        try {
            setIsStarting(true);
            await activateHousieGame(gameCode, prizes);
            navigation.navigate('HousieGame', { gameCode, groupId });
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to start game');
            setIsStarting(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top', 'bottom']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                className="flex-1"
            >
                {/* FIXED: Top Bar + Sticky Pool Dashboard */}
                <View className="bg-[#fdf9f3] z-10 shadow-sm shadow-stone-200">
                    {/* Centered Top Bar */}
                    <View className={`flex-row items-center px-6 ${isTablet ? 'py-8' : 'py-4'}`}>
                        <View style={{ width: isTablet ? 64 : 44 }}>
                            <TouchableOpacity
                                onPress={() => navigation.goBack()}
                                className={`items-center justify-center rounded-full bg-white shadow-sm border border-stone-100 ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}
                            >
                                <MaterialIcons name="arrow-back-ios" size={isTablet ? 28 : 20} color="#b30069" style={{ marginLeft: isTablet ? 12 : 5 }} />
                            </TouchableOpacity>
                        </View>
                        <View className="flex-1 items-center">
                            <Text
                                className="font-headline-bold text-[#1c1c18] uppercase tracking-[4px]"
                                style={{ fontSize: isTablet ? 36 : 20 }}
                            >
                                Define Bounties
                            </Text>
                        </View>
                        <View style={{ width: isTablet ? 64 : 44 }} />
                    </View>

                    {/* Sticky Pool Dashboard Widget */}
                    <View className={`px-${isTablet ? '16' : '6'} mb-6`}>
                        <View className={`bg-white rounded-[40px] shadow-sm border border-stone-100 ${isTablet ? 'p-12' : 'p-8'}`}>
                            <View className="flex-row items-center justify-between">
                                <View>
                                    <Text className={`text-stone-400 font-body-bold uppercase tracking-[2px] ${isTablet ? 'text-2xl mb-4' : 'text-[10px] mb-2'}`}>Available Prize Pool</Text>
                                    <View className="flex-row items-baseline">
                                        <Text className={`font-headline-bold ${isTablet ? 'text-7xl' : 'text-4xl'} ${totalAllocated > totalPrizePool ? 'text-orange-600' : 'text-[#b30069]'}`}>
                                            ₹{totalPrizePool.toLocaleString()}
                                        </Text>
                                    </View>
                                </View>
                                <View className="items-end">
                                    <View className={`flex-row items-center mb-2`}>
                                        <View className={`rounded-full bg-green-500 mr-2 ${isTablet ? 'w-4 h-4' : 'w-2 h-2'}`} />
                                        <Text className={`text-stone-400 font-body-bold uppercase ${isTablet ? 'text-xl' : 'text-[10px]'}`}>{stats?.participants?.length || 0} Players</Text>
                                    </View>
                                    <Text className={`font-body-bold uppercase tracking-[2px] ${isTablet ? 'text-lg' : 'text-[9px]'} ${isPoolBalanced ? 'text-green-500' : 'text-stone-300'}`}>
                                        Allocated: ₹{totalAllocated}
                                    </Text>
                                </View>
                            </View>

                            <View className={`w-full bg-stone-50 rounded-full overflow-hidden border border-stone-100 mt-8 ${isTablet ? 'h-4' : 'h-2'}`}>
                                <View
                                    className={`h-full ${isPoolBalanced ? 'bg-green-500' : 'bg-[#b30069]'}`}
                                    style={{ width: `${Math.min((totalAllocated / totalPrizePool) * 100, 100)}%` }}
                                />
                            </View>

                            {totalAllocated > totalPrizePool && (
                                <View className="mt-6 bg-orange-50 p-4 rounded-3xl flex-row items-center">
                                    <MaterialIcons name="warning" size={isTablet ? 32 : 16} color="#c2410c" />
                                    <Text className={`text-orange-800 font-body-medium ml-4 flex-1 ${isTablet ? 'text-2xl' : 'text-xs'}`}>
                                        Warning: Allocated prizes exceed the total collection.
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                <ScrollView
                    className="flex-1"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: isTablet ? 60 : 24, paddingBottom: 150 }}
                >
                    {/* Claims List Card */}
                    <View className={`bg-[#f7f2eb] rounded-[48px] border border-stone-100 mb-8 ${isTablet ? 'p-16' : 'p-8'}`}>
                        <Text className={`text-[#1c1c18] font-headline-bold mb-10 ${isTablet ? 'text-5xl' : 'text-2xl'}`}>Game Claims</Text>

                        <View className="gap-12">
                            {prizes.map((prize) => (
                                <View key={prize.id}>
                                    <View className="flex-row items-center justify-between mb-4">
                                        <View className="flex-row items-center flex-1 mr-6">
                                            {prize.isHighlight && <Ionicons name="star" size={isTablet ? 32 : 16} color="#b30069" style={{ marginRight: 10, marginTop: isTablet ? 4 : 0 }} />}
                                            <TextInput
                                                value={prize.name}
                                                onChangeText={(val) => updatePrizeName(prize.id, val)}
                                                className={`flex-1 ${prize.isHighlight ? 'text-[#b30069] font-headline-bold' : 'text-stone-500 font-body-bold'} ${isTablet ? 'text-3xl' : 'text-base'}`}
                                                placeholder="Claim Name"
                                                placeholderTextColor="#c4b9b0"
                                            />
                                        </View>
                                        <TouchableOpacity onPress={() => deletePrize(prize.id)}>
                                            <MaterialIcons name="delete-outline" size={isTablet ? 36 : 24} color="#c4b9b0" />
                                        </TouchableOpacity>
                                    </View>
                                    <View className={`flex-row items-center bg-[#efede8] rounded-[32px] px-8 border border-white/50 ${isTablet ? 'h-28' : 'h-16'}`}>
                                        <Text
                                            className={`text-stone-400 font-body-bold mr-3 ${isTablet ? 'text-4xl' : 'text-lg'}`}
                                            style={{ includeFontPadding: false, textAlignVertical: 'center' }}
                                        >₹</Text>
                                        <TextInput
                                            value={prize.amount}
                                            onChangeText={(val) => updatePrizeAmount(prize.id, val)}
                                            keyboardType="number-pad"
                                            className={`flex-1 font-headline-bold text-[#1c1c18] ${isTablet ? 'text-3xl' : 'text-xl'}`}
                                            placeholder="0"
                                            placeholderTextColor="#c4b9b0"
                                            style={{
                                                height: isTablet ? 60 : 40
                                            }}
                                        />
                                    </View>
                                </View>
                            ))}
                        </View>

                        {/* Add Custom Button */}
                        <TouchableOpacity
                            onPress={addCustomPrize}
                            className={`mt-12 rounded-[40px] border-2 border-dashed border-stone-200 flex-row items-center justify-center ${isTablet ? 'h-28' : 'h-16'}`}
                        >
                            <MaterialIcons name="add-circle" size={isTablet ? 32 : 20} color="#a09d96" />
                            <Text className={`text-stone-400 font-body-bold ml-4 ${isTablet ? 'text-3xl' : 'text-base'}`}>Add Custom Prize</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>

                {/* Footer Action */}
                <View className={`bg-[#fdf9f3]/95 border-t border-stone-100 ${isTablet ? 'p-16' : 'p-8'}`}>
                    <TouchableOpacity
                        onPress={handleStartGame}
                        disabled={isStarting || !isPoolBalanced}
                        activeOpacity={0.9}
                        style={{ height: isTablet ? 110 : 80 }}
                        className={`rounded-[40px] flex-row items-center justify-center shadow-2xl ${isPoolBalanced ? 'bg-[#b30069] shadow-primary/30' : 'bg-stone-300 shadow-stone-200'}`}
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
