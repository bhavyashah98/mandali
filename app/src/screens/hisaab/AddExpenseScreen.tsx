import React, { useState } from 'react';
import { 
    View, 
    Text, 
    TextInput, 
    TouchableOpacity, 
    ScrollView, 
    KeyboardAvoidingView, 
    Platform,
    ActivityIndicator,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useHisaabStore } from '../../stores/hisaabStore';
import { useEffect } from 'react';

const AddExpenseScreen = () => {
    const navigation = useNavigation();
    const route = useRoute<any>();
    const { groupId, groupName } = route.params;
    const { addExpense, loading, groupMembers, fetchGroupMembers } = useHisaabStore();

    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [splitType, setSplitType] = useState<'equal' | 'exact'>('equal');
    
    useEffect(() => {
        fetchGroupMembers(groupId);
    }, [groupId]);

    const handleAdd = async () => {
        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid expense amount.');
            return;
        }
        if (!description.trim()) {
            Alert.alert('Missing Description', 'What was this expense for?');
            return;
        }

        const totalAmount = parseFloat(amount);
        let participants = [];

        if (splitType === 'equal') {
            const splitAmount = totalAmount / groupMembers.length;
            participants = groupMembers.map(m => ({ userId: m.id, amount: splitAmount, userName: m.name }));
        }

        try {
            await addExpense({
                groupId,
                description,
                amount: totalAmount,
                paidBy: 'current_user',
                paidByName: 'You',
                participants,
                type: 'expense'
            });
            navigation.goBack();
        } catch (err: any) {
            Alert.alert('Error', err.message);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-background">
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                className="flex-1"
            >
                <ScrollView 
                    className="flex-1 px-6 pt-4"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View className="flex-row items-center justify-between mb-8">
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <MaterialIcons name="close" size={28} color="#594048" />
                        </TouchableOpacity>
                        <Text className="font-headline-bold text-xl text-on-surface">Add Expense</Text>
                        <View className="w-7" />
                    </View>

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
                                autoFocus
                            />
                        </View>
                        <View className="h-[2px] bg-primary/20 w-1/2 mt-2" />
                    </View>

                    {/* Form Section */}
                    <View className="gap-6">
                        <View>
                            <Text className="font-body-bold text-xs text-on-surface-variant opacity-60 uppercase mb-2 ml-1">For what?</Text>
                            <View className="bg-surface-container rounded-2xl px-4 py-3 flex-row items-center">
                                <MaterialIcons name="description" size={20} color="#b30069" style={{ marginRight: 12 }} />
                                <TextInput
                                    className="flex-1 font-body-medium text-base text-on-surface"
                                    placeholder="e.g. Dinner, Movie, Groceries..."
                                    value={description}
                                    onChangeText={setDescription}
                                />
                            </View>
                        </View>

                        <View>
                            <Text className="font-body-bold text-xs text-on-surface-variant opacity-60 uppercase mb-2 ml-1">Split Type</Text>
                            <View className="flex-row gap-3">
                                <TouchableOpacity 
                                    onPress={() => setSplitType('equal')}
                                    className={`flex-1 flex-row items-center justify-center py-3 rounded-2xl border ${splitType === 'equal' ? 'bg-primary/5 border-primary' : 'bg-surface-container border-transparent'}`}
                                >
                                    <MaterialIcons name="equalizer" size={18} color={splitType === 'equal' ? '#b30069' : '#594048'} style={{ marginRight: 8 }} />
                                    <Text className={`font-body-bold ${splitType === 'equal' ? 'text-primary' : 'text-on-surface-variant'}`}>Equally</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    onPress={() => setSplitType('exact')}
                                    className={`flex-1 flex-row items-center justify-center py-3 rounded-2xl border ${splitType === 'exact' ? 'bg-primary/5 border-primary' : 'bg-surface-container border-transparent'}`}
                                >
                                    <MaterialIcons name="edit" size={18} color={splitType === 'exact' ? '#b30069' : '#594048'} style={{ marginRight: 8 }} />
                                    <Text className={`font-body-bold ${splitType === 'exact' ? 'text-primary' : 'text-on-surface-variant'}`}>Exact</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View>
                            <Text className="font-body-bold text-xs text-on-surface-variant opacity-60 uppercase mb-2 ml-1">Involved Members</Text>
                            <View className="bg-surface-container rounded-3xl p-4">
                                {groupMembers.map((member, index) => (
                                    <View key={member.id} className={`flex-row items-center justify-between py-2 ${index !== groupMembers.length - 1 ? 'border-b border-on-surface/5' : ''}`}>
                                        <View className="flex-row items-center">
                                            <View className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center mr-3">
                                                <Text className="text-primary font-headline-bold text-xs">{member.name[0]}</Text>
                                            </View>
                                            <Text className="font-body-medium text-on-surface">{member.name}</Text>
                                        </View>
                                        <Ionicons name="checkbox" size={24} color="#b30069" />
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>

                    <View className="h-20" />
                </ScrollView>

                {/* Footer Action */}
                <View className="px-6 py-6 bg-background border-t border-on-surface/5">
                    <TouchableOpacity 
                        onPress={handleAdd}
                        disabled={loading}
                        className="bg-primary h-14 rounded-full items-center justify-center flex-row shadow-lg shadow-primary/30"
                        style={{ elevation: 5 }}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Text className="text-white font-headline-bold text-lg mr-2">Confirm Expense</Text>
                                <MaterialIcons name="check-circle" size={22} color="white" />
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default AddExpenseScreen;
