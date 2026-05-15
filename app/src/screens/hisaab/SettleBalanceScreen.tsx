import React from 'react';
import { 
    View, 
    Text, 
    TextInput, 
    TouchableOpacity, 
    ScrollView, 
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useIsTablet } from '../../hooks/useIsTablet';
import { useSettleBalance } from '../../hooks/hisaab/useSettleBalance';
import { useWindowDimensions } from 'react-native';

// Components
import SettleBalanceHeader from '../../components/hisaab/SettleBalanceHeader';
import SettleMemberSelector from '../../components/hisaab/SettleMemberSelector';

const SettleBalanceScreen = () => {
    const navigation = useNavigation();
    const route = useRoute<any>();
    const isTablet = useIsTablet();
    const { groupId, groupName } = route.params;

    const { width: screenWidth } = useWindowDimensions();
    const {
        amount,
        setAmount,
        selectedUser,
        setSelectedUser,
        activeMembers,
        handleSettle,
        loading
    } = useSettleBalance(groupId);

    const amountFontSize = isTablet ? 84 : Math.min(60, screenWidth / 6);

    const onSubmit = () => {
        handleSettle(() => navigation.goBack());
    };

    const selectedMemberData = activeMembers.find((m: any) => m.id === selectedUser);
    const balance = selectedMemberData?.balance || 0;
    
    // Logic Fix: 
    // In our backend, netBalance = Total Paid - Total Share.
    // If a member has a NEGATIVE balance, they are a debtor (they OWE money).
    // If they have a POSITIVE balance, they are a creditor (they are OWED money).
    // So if the selected member's balance is negative, THEY owe you.
    const isOwed = balance < 0; // THEY owe you (debtor)
    const isBorrowing = balance > 0; // YOU owe them (creditor)
    const parsedAmount = parseFloat(amount || '0');

    return (
        <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top']}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                className="flex-1"
            >
                <SettleBalanceHeader groupName={groupName} />

                <ScrollView 
                    className="flex-1 px-6" 
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingTop: isTablet ? 40 : 20, paddingBottom: 60 }}
                >
                    <Text className={`font-body-medium text-stone-400 text-center px-10 mb-10 leading-6 ${isTablet ? 'text-2xl' : 'text-sm'}`}>
                        Closing accounts in <Text className="font-body-bold text-[#1c1c18]">{groupName}</Text>. 
                    </Text>

                    {/* Member Selector */}
                    <View className={`mb-8 ${isTablet ? 'max-w-4xl self-center w-full' : ''}`}>
                        <SettleMemberSelector 
                            members={activeMembers}
                            selectedUserId={selectedUser}
                            setSelectedUserId={setSelectedUser}
                            isTablet={isTablet}
                        />
                    </View>

                    {/* Directional Arrow & Information */}
                    {selectedUser && selectedMemberData && (
                        <View className={`items-center justify-center mb-10 ${isTablet ? 'py-12' : 'py-6'}`}>
                            <View 
                                className="flex-row items-center bg-white px-8 py-5 rounded-[32px] shadow-lg border border-stone-50" 
                                style={{ elevation: 10, shadowColor: isOwed ? '#10b981' : '#ef4444', shadowOpacity: 0.1, shadowRadius: 20 }}
                            >
                                {isOwed ? (
                                    <>
                                        <View className="items-center">
                                            <View className="w-12 h-12 rounded-full bg-stone-50 items-center justify-center mb-1">
                                                <Text className="font-headline-bold text-stone-400">{selectedMemberData.name[0]}</Text>
                                            </View>
                                            <Text className={`font-headline-bold text-[#1c1c18] ${isTablet ? 'text-2xl' : 'text-sm'}`}>{selectedMemberData.name}</Text>
                                        </View>
                                        
                                        <View className="mx-8 items-center">
                                            <View className="bg-emerald-50 px-4 py-1.5 rounded-full mb-2">
                                                <Text className="text-emerald-600 font-body-bold text-[10px] uppercase tracking-wider">Settling</Text>
                                            </View>
                                            <MaterialIcons name="arrow-forward" size={32} color="#10b981" />
                                        </View>

                                        <View className="items-center">
                                            <View className="w-12 h-12 rounded-full bg-[#b30069]/10 items-center justify-center mb-1">
                                                <MaterialIcons name="person" size={24} color="#b30069" />
                                            </View>
                                            <Text className={`font-headline-bold text-[#1c1c18] ${isTablet ? 'text-2xl' : 'text-sm'}`}>You</Text>
                                        </View>
                                    </>
                                ) : (
                                    <>
                                        <View className="items-center">
                                            <View className="w-12 h-12 rounded-full bg-[#b30069]/10 items-center justify-center mb-1">
                                                <MaterialIcons name="person" size={24} color="#b30069" />
                                            </View>
                                            <Text className={`font-headline-bold text-[#1c1c18] ${isTablet ? 'text-2xl' : 'text-sm'}`}>You</Text>
                                        </View>

                                        <View className="mx-8 items-center">
                                            <View className="bg-rose-50 px-4 py-1.5 rounded-full mb-2">
                                                <Text className="text-rose-600 font-body-bold text-[10px] uppercase tracking-wider">Settling</Text>
                                            </View>
                                            <MaterialIcons name="arrow-forward" size={32} color="#ef4444" />
                                        </View>

                                        <View className="items-center">
                                            <View className="w-12 h-12 rounded-full bg-stone-50 items-center justify-center mb-1">
                                                <Text className="font-headline-bold text-stone-400">{selectedMemberData.name[0]}</Text>
                                            </View>
                                            <Text className={`font-headline-bold text-[#1c1c18] ${isTablet ? 'text-2xl' : 'text-sm'}`}>{selectedMemberData.name}</Text>
                                        </View>
                                    </>
                                )}
                            </View>
                            <Text className={`font-body-bold text-stone-400 mt-6 text-center tracking-wide ${isTablet ? 'text-xl' : 'text-[11px]'} uppercase`}>
                                {isOwed 
                                    ? `${selectedMemberData.name} owes you ₹${balance.toLocaleString()}` 
                                    : `You owe ${selectedMemberData.name} ₹${Math.abs(balance).toLocaleString()}`}
                            </Text>
                        </View>
                    )}

                    {/* Amount Input Section */}
                    {selectedUser && (
                        <View className={`items-center ${isTablet ? 'mb-20' : 'mb-12'}`}>
                            <View className="bg-stone-50 px-5 py-2 rounded-full mb-6 border border-stone-100">
                                <Text className={`font-body-bold uppercase tracking-[3px] text-[#b30069] ${isTablet ? 'text-lg' : 'text-[10px]'}`}>Settle Amount</Text>
                            </View>
                            
                            <View className="flex-row items-center justify-center w-full">
                                <Text className={`font-headline-bold text-[#b30069] mr-2 ${isTablet ? 'text-6xl' : 'text-4xl'}`}>₹</Text>
                                <TextInput
                                    className="font-headline-bold text-[#1c1c18] text-center p-0 m-0"
                                    style={{ 
                                        fontSize: amountFontSize,
                                        height: amountFontSize * 1.2,
                                        minWidth: 120,
                                        textAlignVertical: 'center',
                                        includeFontPadding: false
                                    }}
                                    placeholder="0"
                                    placeholderTextColor="#e1e1e1"
                                    keyboardType="decimal-pad"
                                    value={amount}
                                    onChangeText={setAmount}
                                    autoFocus
                                    selectionColor="#b30069"
                                />
                            </View>

                        </View>
                    )}
                    
                    <View className="h-20" />
                </ScrollView>

                {/* Footer Action - Only visible if valid amount is entered */}
                {selectedUser && parsedAmount > 0 && (
                    <View className={`px-6 ${isTablet ? 'py-12' : 'py-8'} bg-[#fdf9f3] border-t border-stone-100`}>
                        <TouchableOpacity 
                            onPress={onSubmit}
                            disabled={loading}
                            activeOpacity={0.8}
                            className={`bg-[#b30069] shadow-[#b30069]/30 rounded-[28px] items-center justify-center flex-row shadow-xl self-center w-full`}
                            style={{ elevation: 8, height: isTablet ? 90 : 70, maxWidth: isTablet ? 800 : '100%' }}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <Text className={`text-white font-headline-bold mr-2 ${isTablet ? 'text-3xl' : 'text-xl'}`}>Settle Payment</Text>
                                    <MaterialIcons name="done-all" size={isTablet ? 36 : 28} color="white" />
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default SettleBalanceScreen;
