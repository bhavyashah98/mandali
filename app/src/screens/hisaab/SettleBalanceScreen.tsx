import React, { useState } from 'react';
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
import { useEffect } from 'react';

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
        <SafeAreaView className="flex-1 bg-background">
            <ScrollView className="flex-1 px-6 pt-4" showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View className="flex-row items-center justify-between mb-8">
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <MaterialIcons name="close" size={28} color="#594048" />
                    </TouchableOpacity>
                    <Text className="font-headline-bold text-xl text-on-surface">Settle Up</Text>
                    <View className="w-7" />
                </View>

                <Text className="font-body-regular text-on-surface-variant text-base mb-8 text-center px-4">
                    Settle your individual balances in <Text className="font-body-bold text-on-surface">{groupName}</Text>
                </Text>

                {/* Amount Input */}
                <View className="items-center mb-10">
                    <View className="flex-row items-center justify-center">
                        <Text className="font-headline-bold text-4xl text-primary mr-2">₹</Text>
                        <TextInput
                            className="font-headline-bold text-5xl text-on-surface min-w-[100px]"
                            placeholder="0.00"
                            keyboardType="decimal-pad"
                            value={amount}
                            onChangeText={setAmount}
                        />
                    </View>
                </View>

                {/* Balance List / User Selector */}
                <View className="gap-4">
                    <Text className="font-body-bold text-xs text-on-surface-variant opacity-60 uppercase mb-2 ml-1">Select person</Text>
                    {groupMembers.map((item) => {
                        const balance = item.balance || 0;
                        const isOwed = balance > 0;
                        const isBorrowing = balance < 0;
                        
                        return (
                            <TouchableOpacity 
                                key={item.id}
                                onPress={() => {
                                    setSelectedUser(item.id);
                                    if (balance !== 0) {
                                        setAmount(Math.abs(balance).toString());
                                    }
                                }}
                                className={`flex-row items-center p-4 rounded-[28px] border-2 ${selectedUser === item.id ? 'bg-primary/5 border-primary' : 'bg-surface-container border-transparent'}`}
                            >
                                <View className="w-12 h-12 rounded-full bg-surface-container-high items-center justify-center mr-4">
                                    <Text className="text-primary font-headline-bold text-lg">{item.name[0]}</Text>
                                </View>
                                <View className="flex-1">
                                    <Text className="font-headline-bold text-on-surface">{item.name}</Text>
                                    <Text className={`font-body-medium text-xs ${isOwed ? 'text-success' : isBorrowing ? 'text-error' : 'text-on-surface-variant'}`}>
                                        {balance === 0 ? 'Settled' : isOwed ? `Owes you ₹${balance}` : `You owe ₹${Math.abs(balance)}`}
                                    </Text>
                                </View>
                                {selectedUser === item.id && (
                                    <Ionicons name="checkmark-circle" size={24} color="#b30069" />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
                
                <View className="h-20" />
            </ScrollView>

            {/* Footer Action */}
            <View className="px-6 py-6 bg-background border-t border-on-surface/5">
                <TouchableOpacity 
                    onPress={handleSettle}
                    disabled={loading}
                    className="bg-primary h-14 rounded-full items-center justify-center flex-row shadow-lg shadow-primary/30"
                    style={{ elevation: 5 }}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <Text className="text-white font-headline-bold text-lg mr-2">Settled Payment</Text>
                            <MaterialIcons name="done-all" size={22} color="white" />
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

export default SettleBalanceScreen;
