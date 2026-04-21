import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    TextInput, 
    TouchableOpacity, 
    ScrollView, 
    ActivityIndicator,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useHisaabStore } from '../../stores/hisaabStore';

const SettleBalanceScreen = () => {
    const navigation = useNavigation();
    const route = useRoute<any>();
    const { groupId, groupName } = route.params;
    const { settleBalance, loading, groupMembers, fetchGroupMembers } = useHisaabStore();

    const [amount, setAmount] = useState('');
    const [selectedUser, setSelectedUser] = useState<string | null>(null);

    useEffect(() => {
        fetchGroupMembers(groupId);
    }, [groupId]);

    const handleSettle = async () => {
        if (!selectedUser) {
            Alert.alert('Select Member', 'Who are you settling with?');
            return;
        }
        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid amount.');
            return;
        }

        try {
            await settleBalance(groupId, selectedUser, parseFloat(amount));
            navigation.goBack();
        } catch (err: any) {
            Alert.alert('Error', err.message);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top']}>
            {/* Header */}
            <View className="px-6 py-4 flex-row items-center justify-between">
                <TouchableOpacity 
                    onPress={() => navigation.goBack()}
                    className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm border border-stone-100"
                >
                    <MaterialIcons name="close" size={20} color="#b30069" />
                </TouchableOpacity>
                <Text className="font-headline-bold text-xl text-on-surface">Settle Up</Text>
                <View className="w-10" />
            </View>

            <ScrollView 
                className="flex-1 px-6" 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingTop: 20 }}
            >
                <Text className="font-body-medium text-stone-400 text-center px-10 mb-8 leading-6">
                    Closing accounts in <Text className="font-body-bold text-on-surface">{groupName}</Text>. 
                    Enter the amount you are paying.
                </Text>

                {/* Amount Input Section */}
                <View className="items-center mb-10">
                    <Text className="font-body-bold text-[10px] uppercase tracking-[3px] text-[#b30069] mb-4">Settle Amount</Text>
                    <View className="flex-row items-center justify-center">
                        <Text className="font-headline-bold text-4xl text-primary mr-1">₹</Text>
                        <TextInput
                            className="font-headline-bold text-6xl text-on-surface min-w-[120px] text-center"
                            placeholder="0"
                            placeholderTextColor="#e7e5e4"
                            keyboardType="decimal-pad"
                            value={amount}
                            onChangeText={setAmount}
                        />
                    </View>
                </View>

                {/* Member Selector */}
                <View className="gap-4">
                    <Text className="font-body-bold text-[10px] text-stone-400 uppercase tracking-widest mb-1 ml-1">Who are you paying?</Text>
                    {groupMembers.map((item) => {
                        const balance = item.balance || 0;
                        const isOwed = balance > 0;
                        const isBorrowing = balance < 0;
                        const isSelected = selectedUser === item.id;
                        
                        return (
                            <TouchableOpacity 
                                key={item.id}
                                onPress={() => {
                                    setSelectedUser(item.id);
                                    if (isBorrowing) {
                                        setAmount(Math.abs(balance).toString());
                                    }
                                }}
                                className={`flex-row items-center p-4 rounded-[32px] border ${isSelected ? 'bg-white border-primary shadow-lg shadow-primary/10' : 'bg-white border-stone-100 shadow-sm'}`}
                            >
                                <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${isSelected ? 'bg-primary' : 'bg-stone-50'}`}>
                                    <Text className={`font-headline-bold text-lg ${isSelected ? 'text-white' : 'text-stone-300'}`}>{item.name[0].toUpperCase()}</Text>
                                </View>
                                <View className="flex-1">
                                    <Text className="font-headline-bold text-on-surface text-[15px]">{item.name}</Text>
                                    <Text className={`font-body-bold text-[10px] uppercase tracking-tighter mt-1 ${isOwed ? 'text-green-600' : isBorrowing ? 'text-red-500' : 'text-stone-400'}`}>
                                        {balance === 0 ? 'Balance: ₹0' : isOwed ? `Owes you ₹${balance}` : `You owe ₹${Math.abs(balance)}`}
                                    </Text>
                                </View>
                                {isSelected ? (
                                    <Ionicons name="checkmark-circle" size={28} color="#b30069" />
                                ) : (
                                    <View className="w-7 h-7 rounded-full border border-stone-100" />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
                
                <View className="h-20" />
            </ScrollView>

            {/* Footer Action */}
            <View className="px-6 py-8 bg-[#fdf9f3]">
                <TouchableOpacity 
                    onPress={handleSettle}
                    disabled={loading || !selectedUser}
                    className={`h-16 rounded-[24px] items-center justify-center flex-row shadow-xl ${!selectedUser ? 'bg-stone-200 shadow-none' : 'bg-primary shadow-primary/30'}`}
                    style={{ elevation: selectedUser ? 8 : 0 }}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <Text className="text-white font-headline-bold text-lg mr-2">Settle Payment</Text>
                            <MaterialIcons name="done-all" size={24} color="white" />
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

export default SettleBalanceScreen;
