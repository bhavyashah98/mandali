import React, { useState, useEffect } from 'react';
import MandaliCoin from '../../components/MandaliCoin';
import { useIsTablet } from '../../hooks/useIsTablet';
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
    useWindowDimensions,
    Modal
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { API_URL, getAuthHeaders, activateHousieGame, fetchGroupDetail } from '../../lib/api';
import axios from 'axios';

const HousieDefineBountyScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute();
    const insets = useSafeAreaInsets();
    const { gameCode, groupId } = (route.params as { gameCode: string; groupId: string }) || {};

    const [isStarting, setIsStarting] = useState(false);
    const { width } = useWindowDimensions();
    const isTablet = useIsTablet();

    // Fetch Group Detail for Header
    const { data: groupData } = useQuery({
        queryKey: ['groupDetail', groupId],
        queryFn: () => fetchGroupDetail(groupId!),
        enabled: !!groupId,
    });

    // Standard Prizes
    const [prizes, setPrizes] = useState([
        { id: 'top_line', name: 'Top Line', description: 'First line of housie ticket', amount: '0', icon: 'horizontal-rule' },
        { id: 'middle_line', name: 'Middle Line', description: 'Second line of housie ticket', amount: '0', icon: 'horizontal-rule' },
        { id: 'bottom_line', name: 'Bottom Line', description: 'Third line of housie ticket', amount: '0', icon: 'horizontal-rule' },
        { id: 'full_house_1', name: '1st Full House', description: 'All numbers marked on the ticket', amount: '0', icon: 'grid-view', isHighlight: true },
        { id: 'full_house_2', name: '2nd Full House', description: 'All numbers marked on the ticket', amount: '0', icon: 'grid-view', isHighlight: true },
        { id: 'full_house_3', name: '3rd Full House', description: 'All numbers marked on the ticket', amount: '0', icon: 'grid-view', isHighlight: true }
    ]);

    // Custom Modal State
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [customPrizeName, setCustomPrizeName] = useState('');
    const [customPrizeDesc, setCustomPrizeDesc] = useState('');
    const [customPrizeAmount, setCustomPrizeAmount] = useState('');

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
            // Distribution: 10% per row (3 rows = 30%), then FH3=15%, FH2=20%, FH1=35%
            const linesAmount = Math.floor(totalPrizePool * 0.10);
            const fh3Amount = Math.floor(totalPrizePool * 0.15);
            const fh2Amount = Math.floor(totalPrizePool * 0.20);
            const fh1Amount = totalPrizePool - (linesAmount * 3) - fh3Amount - fh2Amount;

            const standardIds = ['top_line', 'middle_line', 'bottom_line'];

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

    const handleAddCustomPrize = () => {
        if (!customPrizeName.trim()) {
            Alert.alert('Required', 'Please enter a name for the custom reward.');
            return;
        }
        const newId = `custom_${Date.now()}`;
        setPrizes([...prizes, { 
            id: newId, 
            name: customPrizeName, 
            description: customPrizeDesc,
            amount: customPrizeAmount || '0', 
            icon: 'stars' 
        }]);
        setIsModalVisible(false);
        setCustomPrizeName('');
        setCustomPrizeDesc('');
        setCustomPrizeAmount('');
    };

    const totalAllocated = prizes.reduce((sum, p) => sum + (parseInt(p.amount) || 0), 0);
    const isPoolBalanced = totalAllocated === totalPrizePool && totalPrizePool > 0;

    const handleStartGame = async () => {
        if (!isPoolBalanced) {
            Alert.alert('Pool Mismatch', `Target: 🪙${totalPrizePool}\nAllocated: 🪙${totalAllocated}\n\nPlease balance the rewards.`);
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
        <View className="flex-1 bg-[#fdf9f3]" style={{ paddingTop: insets.top }}>
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
                                className="font-headline-bold text-[#1c1c18] uppercase"
                                style={{ fontSize: isTablet ? 36 : 17, letterSpacing: isTablet ? 4 : 1.5 }}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                minimumFontScale={0.7}
                            >
                                Define Rewards
                            </Text>
                            <Text className={`text-stone-400 font-body-bold tracking-[3px] uppercase mt-1 ${isTablet ? 'text-lg' : 'text-[8px]'}`}>System-Generated Match Rewards</Text>
                        </View>
                        <View style={{ width: isTablet ? 64 : 44 }} />
                    </View>

                    {/* Sticky Pool Dashboard Widget */}
                    <View className={`px-${isTablet ? '16' : '6'} mb-6`}>
                        <View className={`bg-white rounded-[40px] shadow-sm border border-stone-100 ${isTablet ? 'p-12' : 'p-5'}`}>
                            <View className="flex-row items-center justify-between">
                                {/* Left: label + amount — flex-1 so it shrinks before the right side */}
                                <View className="flex-1 min-w-0 mr-3">
                                    <Text
                                        className={`text-stone-400 font-body-bold uppercase ${isTablet ? 'text-2xl mb-4' : 'text-[9px] mb-1'}`}
                                        style={{ letterSpacing: isTablet ? 2 : 0.5 }}
                                        numberOfLines={1}
                                    >Total Match Rewards</Text>
                                    <View className="flex-row items-center">
                                        <Text
                                            className={`font-headline-bold ${isTablet ? 'text-7xl' : 'text-3xl'} ${totalAllocated > totalPrizePool ? 'text-orange-600' : 'text-[#b30069]'}`}
                                            numberOfLines={1}
                                            adjustsFontSizeToFit
                                            minimumFontScale={0.6}
                                        >
                                            {totalPrizePool.toLocaleString()}
                                        </Text>
                                        <MandaliCoin size={isTablet ? 40 : 22} style={{ marginLeft: isTablet ? 12 : 6 }} />
                                    </View>
                                </View>
                                {/* Right: players + allocated — fixed width, shrink-proof */}
                                <View className="items-end flex-shrink-0">
                                    <View className="flex-row items-center mb-1.5">
                                        <View className={`rounded-full bg-green-500 mr-1.5 ${isTablet ? 'w-4 h-4' : 'w-2 h-2'}`} />
                                        <Text
                                            className={`text-stone-400 font-body-bold uppercase ${isTablet ? 'text-xl' : 'text-[10px]'}`}
                                            numberOfLines={1}
                                        >{stats?.participants?.length || 0} Players</Text>
                                    </View>
                                    <View className="flex-row items-center">
                                        <Text
                                            numberOfLines={1}
                                            className={`font-body-bold uppercase ${isTablet ? 'text-lg' : 'text-[9px]'} ${isPoolBalanced ? 'text-green-500' : 'text-stone-300'}`}
                                            style={{ letterSpacing: isTablet ? 2 : 0.5 }}
                                        >
                                            {totalAllocated}
                                        </Text>
                                        <MandaliCoin size={isTablet ? 18 : 12} style={{ marginLeft: 4 }} />
                                        <Text className={`font-body-bold uppercase ${isTablet ? 'text-lg' : 'text-[9px]'} ${isPoolBalanced ? 'text-green-500' : 'text-stone-300'}`}> alloc.</Text>
                                    </View>
                                </View>
                            </View>

                            <View className={`w-full bg-stone-50 rounded-full overflow-hidden border border-stone-100 ${isTablet ? 'mt-8 h-4' : 'mt-4 h-2'}`}>
                                <View
                                    className={`h-full ${isPoolBalanced ? 'bg-green-500' : 'bg-[#b30069]'}`}
                                    style={{ width: `${Math.min((totalAllocated / totalPrizePool) * 100, 100)}%` }}
                                />
                            </View>

                            {totalAllocated > totalPrizePool && (
                                <View className={`bg-orange-50 rounded-3xl flex-row items-center ${isTablet ? 'mt-6 p-4' : 'mt-3 p-3'}`}>
                                    <MaterialIcons name="warning" size={isTablet ? 32 : 14} color="#c2410c" />
                                    <Text className={`text-orange-800 font-body-medium ml-3 flex-1 ${isTablet ? 'text-2xl' : 'text-[10px]'}`}>
                                        Allocated rewards exceed total collection.
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                <ScrollView
                    className="flex-1"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: isTablet ? 60 : 24, paddingBottom: 40 }}
                >
                    {/* Claims List Card */}
                    <View className={`bg-[#f7f2eb] rounded-[48px] border border-stone-100 mb-8 ${isTablet ? 'p-16' : 'p-8'}`}>
                        <Text className={`text-[#1c1c18] font-headline-bold mb-10 ${isTablet ? 'text-5xl' : 'text-2xl'}`}>Game Milestones</Text>

                        <View className="gap-12">
                            {prizes.map((prize) => (
                                <View key={prize.id}>
                                    <View className="flex-row items-center justify-between mb-4">
                                        <View className="flex-row items-center flex-1 mr-6">
                                            {prize.isHighlight && <Ionicons name="star" size={isTablet ? 32 : 16} color="#b30069" style={{ marginRight: 10, marginTop: isTablet ? 4 : 0 }} />}
                                            <View className="flex-1">
                                                <TextInput
                                                    value={prize.name}
                                                    onChangeText={(val) => updatePrizeName(prize.id, val)}
                                                    className={`flex-1 ${prize.isHighlight ? 'text-[#b30069] font-headline-bold' : 'text-stone-500 font-body-bold'} ${isTablet ? 'text-3xl' : 'text-base'}`}
                                                    placeholder="Milestone Name"
                                                    placeholderTextColor="#c4b9b0"
                                                />
                                                {prize.description ? (
                                                    <Text className={`text-stone-400 font-body-medium mt-1 ${isTablet ? 'text-lg' : 'text-[10px]'}`}>{prize.description}</Text>
                                                ) : null}
                                            </View>
                                        </View>
                                        <TouchableOpacity onPress={() => deletePrize(prize.id)}>
                                            <MaterialIcons name="delete-outline" size={isTablet ? 36 : 24} color="#c4b9b0" />
                                        </TouchableOpacity>
                                    </View>
                                    <View className={`flex-row items-center bg-[#efede8] rounded-[32px] px-8 border border-white/50 ${isTablet ? 'h-28' : 'h-16'}`}>
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
                                        <MandaliCoin size={isTablet ? 36 : 22} style={{ marginLeft: 12 }} />
                                    </View>
                                </View>
                            ))}
                        </View>

                        {/* Add Custom Button */}
                        <TouchableOpacity
                            onPress={() => setIsModalVisible(true)}
                            className={`mt-12 rounded-[40px] border-2 border-dashed border-stone-200 flex-row items-center justify-center ${isTablet ? 'h-28' : 'h-16'}`}
                        >
                            <MaterialIcons name="add-circle" size={isTablet ? 32 : 20} color="#a09d96" />
                            <Text className={`text-stone-400 font-body-bold ml-4 ${isTablet ? 'text-3xl' : 'text-base'}`}>Add Custom Reward</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>

                {/* Footer Action */}
                <View 
                    className="bg-[#fdf9f3] border-t border-stone-100"
                    style={{ 
                        paddingHorizontal: isTablet ? 60 : 24,
                        paddingTop: isTablet ? 32 : 16,
                        paddingBottom: Math.max(insets.bottom, isTablet ? 48 : 24)
                    }}
                >
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
                                <Ionicons name="lock-closed" size={isTablet ? 36 : 22} color="white" />
                                <Text
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                    minimumFontScale={0.7}
                                    className="text-white font-headline-bold ml-3"
                                    style={{ fontSize: isTablet ? 32 : 18, flexShrink: 1 }}
                                >Lock &amp; Start Game</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            {/* Custom Prize Modal */}
            <Modal visible={isModalVisible} animationType="slide" transparent>
                <View className="flex-1 justify-end bg-black/50">
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                        <View className={`bg-white rounded-t-[40px] ${isTablet ? 'p-12' : 'p-6'}`}>
                            <View className="flex-row items-center justify-between mb-8">
                                <Text className={`font-headline-bold text-[#1c1c18] ${isTablet ? 'text-4xl' : 'text-2xl'}`}>Add Custom Reward</Text>
                                <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                                    <Ionicons name="close-circle" size={isTablet ? 40 : 28} color="#c4b9b0" />
                                </TouchableOpacity>
                            </View>

                            <View className="mb-6">
                                <Text className={`font-body-bold text-stone-500 mb-2 ${isTablet ? 'text-2xl' : 'text-xs uppercase tracking-wider'}`}>Reward Name</Text>
                                <TextInput
                                    value={customPrizeName}
                                    onChangeText={setCustomPrizeName}
                                    placeholder="e.g. Unlucky One"
                                    className={`bg-[#efede8] rounded-[24px] px-6 ${isTablet ? 'h-20 text-2xl' : 'h-14 text-base'} font-headline-bold text-[#1c1c18] border border-white/50`}
                                />
                            </View>

                            <View className="mb-6">
                                <Text className={`font-body-bold text-stone-500 mb-2 ${isTablet ? 'text-2xl' : 'text-xs uppercase tracking-wider'}`}>Description</Text>
                                <TextInput
                                    value={customPrizeDesc}
                                    onChangeText={setCustomPrizeDesc}
                                    placeholder="e.g. First person to strike 0 numbers"
                                    className={`bg-[#efede8] rounded-[24px] px-6 py-4 ${isTablet ? 'min-h-[120px] text-xl' : 'min-h-[80px] text-sm'} font-body-medium text-[#1c1c18] border border-white/50`}
                                    multiline
                                />
                            </View>

                            <View className="mb-10">
                                <Text className={`font-body-bold text-stone-500 mb-2 ${isTablet ? 'text-2xl' : 'text-xs uppercase tracking-wider'}`}>Glory Amount (Optional)</Text>
                                <View className={`flex-row items-center bg-[#efede8] rounded-[24px] px-6 border border-white/50 ${isTablet ? 'h-20' : 'h-14'}`}>
                                    <TextInput
                                        value={customPrizeAmount}
                                        onChangeText={setCustomPrizeAmount}
                                        placeholder="0"
                                        keyboardType="number-pad"
                                        className={`flex-1 font-headline-bold text-[#1c1c18] ${isTablet ? 'text-2xl' : 'text-base'}`}
                                    />
                                    <MandaliCoin size={isTablet ? 32 : 20} style={{ marginLeft: 12 }} />
                                </View>
                            </View>

                            <TouchableOpacity
                                onPress={handleAddCustomPrize}
                                className={`bg-[#b30069] rounded-full items-center justify-center ${isTablet ? 'h-24' : 'h-14'} shadow-lg shadow-primary/30`}
                                style={{ marginBottom: insets.bottom || 20 }}
                            >
                                <Text className={`text-white font-headline-bold ${isTablet ? 'text-2xl' : 'text-lg'}`}>Add Default Reward</Text>
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </View>
    );
};

export default HousieDefineBountyScreen;
