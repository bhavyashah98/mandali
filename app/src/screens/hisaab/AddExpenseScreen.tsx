import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    TextInput, 
    TouchableOpacity, 
    ScrollView, 
    KeyboardAvoidingView, 
    Platform,
    ActivityIndicator,
    Alert,
    useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useHisaabStore, ExpenseParticipant } from '../../stores/hisaabStore';
import { useIsTablet } from '../../hooks/useIsTablet';

const AddExpenseScreen = () => {
    const navigation = useNavigation();
    const route = useRoute<any>();
    const isTablet = useIsTablet();
    const { width } = useWindowDimensions();
    const { groupId, groupName, members: initialMembers } = route.params;
    const { addExpense, loading, groupMembers: storeMembers, fetchGroupMembers } = useHisaabStore();

    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [splitType, setSplitType] = useState<'equal' | 'exact'>('equal');
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
    
    // Resolve members: prioritize those passed from the group screen, fallback to store/fetch
    const actualMembers = initialMembers && initialMembers.length > 0 ? initialMembers : storeMembers;

    useEffect(() => {
        if (!initialMembers || initialMembers.length === 0) {
            fetchGroupMembers(groupId);
        }
    }, [groupId]);

    // Update selection when members are ready
    useEffect(() => {
        if (actualMembers.length > 0) {
            setSelectedMemberIds(actualMembers.map((m: any) => m.id));
        }
    }, [actualMembers.length]);

    const toggleMember = (id: string) => {
        setSelectedMemberIds(prev => 
            prev.includes(id) 
                ? prev.filter(mid => mid !== id) 
                : [...prev, id]
        );
    };

    const handleAdd = async () => {
        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid expense amount.');
            return;
        }
        if (!description.trim()) {
            Alert.alert('Missing Description', 'What was this expense for?');
            return;
        }
        if (selectedMemberIds.length === 0) {
            Alert.alert('No Members', 'Please select at least one person to split with.');
            return;
        }

        const totalAmount = parseFloat(amount);
        const selectedMembers = actualMembers.filter((m: any) => selectedMemberIds.includes(m.id));
        let participants: ExpenseParticipant[] = [];

        const splitAmount = totalAmount / selectedMembers.length;
        participants = selectedMembers.map((m: any) => ({ 
            userId: m.id, 
            amount: splitAmount, 
            userName: m.name 
        }));

        try {
            await addExpense({
                groupId,
                description: description.trim(),
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

    const amountFontSize = isTablet ? 84 : Math.min(60, width / 6);

    return (
        <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top']}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                className="flex-1"
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                {/* Header */}
                <View className={`px-6 ${isTablet ? 'py-8' : 'py-4'} flex-row items-center justify-between`}>
                    <TouchableOpacity 
                        onPress={() => navigation.goBack()}
                        className={`${isTablet ? 'w-14 h-14' : 'w-10 h-10'} bg-white rounded-full items-center justify-center shadow-sm border border-stone-100`}
                    >
                        <MaterialIcons name="close" size={isTablet ? 28 : 20} color="#b30069" />
                    </TouchableOpacity>
                    <Text className={`font-headline-bold text-on-surface ${isTablet ? 'text-3xl' : 'text-xl'}`}>Add Expense</Text>
                    <View className={isTablet ? 'w-14' : 'w-10'} />
                </View>

                <ScrollView 
                    className="flex-1"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ 
                        paddingHorizontal: 24,
                        paddingTop: isTablet ? 40 : 20, 
                        paddingBottom: 60 
                    }}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Amount Input Section */}
                    <View className={`items-center ${isTablet ? 'mb-16' : 'mb-8'}`}>
                        <Text className={`font-body-bold uppercase tracking-[3px] text-[#b30069] ${isTablet ? 'text-lg mb-6' : 'text-[10px] mb-3'}`}>How Much?</Text>
                        <View className="flex-row items-center justify-center w-full">
                            <Text className={`font-headline-bold text-primary mr-2 ${isTablet ? 'text-6xl' : 'text-4xl'}`}>₹</Text>
                            <TextInput
                                className="font-headline-bold text-on-surface text-center p-0 m-0"
                                style={{ 
                                    fontSize: amountFontSize,
                                    height: amountFontSize * 1.2,
                                    minWidth: 100,
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

                    {/* Form Section */}
                    <View className={isTablet ? 'gap-12 max-w-4xl self-center w-full' : 'gap-6'}>
                        {/* Description field matching Profile style */}
                        <View>
                            <Text className={`font-body-bold text-on-surface mb-3 ml-1 ${isTablet ? 'text-xl' : 'text-[15px]'}`}>For What?</Text>
                            <View 
                                className="bg-white rounded-[20px] px-6 justify-center border border-stone-100 shadow-sm" 
                                style={{ height: isTablet ? 110 : 56 }}
                            >
                                <TextInput
                                    placeholder="E.g. Dinner, Movie tickets..."
                                    placeholderTextColor="#a09d96"
                                    style={{ 
                                        height: isTablet ? 110 : 56, 
                                        fontSize: isTablet ? 32 : 16, 
                                        color: '#1c1c18',
                                        textAlignVertical: 'center'
                                    }}
                                    className="font-body-bold"
                                    value={description}
                                    onChangeText={setDescription}
                                    selectionColor="#b30069"
                                />
                            </View>
                        </View>

                        <View>
                            <Text className={`font-body-bold text-on-surface mb-3 ml-1 ${isTablet ? 'text-xl' : 'text-[15px]'}`}>Split Strategy</Text>
                            <View className="flex-row gap-4">
                                <TouchableOpacity 
                                    onPress={() => setSplitType('equal')}
                                    className={`flex-1 flex-row items-center justify-center rounded-[24px] border ${isTablet ? 'py-8' : 'py-4'} ${splitType === 'equal' ? 'bg-primary border-primary shadow-lg shadow-primary/20' : 'bg-white border-stone-100 shadow-sm'}`}
                                >
                                    <MaterialIcons name="people" size={isTablet ? 28 : 18} color={splitType === 'equal' ? 'white' : '#594048'} style={{ marginRight: 8 }} />
                                    <Text className={`font-body-bold ${isTablet ? 'text-2xl' : 'text-base'} ${splitType === 'equal' ? 'text-white' : 'text-stone-500'}`}>Equally</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    onPress={() => setSplitType('exact')}
                                    className={`flex-1 flex-row items-center justify-center rounded-[24px] border ${isTablet ? 'py-8' : 'py-4'} ${splitType === 'exact' ? 'bg-primary border-primary shadow-lg shadow-primary/20' : 'bg-white border-stone-100 shadow-sm'}`}
                                >
                                    <MaterialIcons name="calculate" size={isTablet ? 28 : 18} color={splitType === 'exact' ? 'white' : '#594048'} style={{ marginRight: 8 }} />
                                    <Text className={`font-body-bold ${isTablet ? 'text-2xl' : 'text-base'} ${splitType === 'exact' ? 'text-white' : 'text-stone-500'}`}>Exact</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View>
                            <View className="flex-row items-center justify-between mb-4 ml-1">
                                <Text className={`font-body-bold text-on-surface ${isTablet ? 'text-xl' : 'text-[15px]'}`}>Involved Members</Text>
                                <View className="bg-primary/10 px-3 py-1 rounded-full">
                                    <Text className={`font-body-bold text-primary uppercase tracking-widest ${isTablet ? 'text-base' : 'text-[9px]'}`}>{selectedMemberIds.length} Selected</Text>
                                </View>
                            </View>

                            {actualMembers.length === 0 ? (
                                <View className="bg-white rounded-[32px] p-10 items-center justify-center border border-stone-100 shadow-sm">
                                    <ActivityIndicator color="#b30069" />
                                </View>
                            ) : (
                                <View className="bg-white rounded-[32px] p-2 border border-stone-100 shadow-sm">
                                    {actualMembers.map((member: any, index: number) => {
                                        const isSelected = selectedMemberIds.includes(member.id);
                                        return (
                                            <TouchableOpacity 
                                                key={member.id} 
                                                onPress={() => toggleMember(member.id)}
                                                activeOpacity={0.6}
                                                className={`flex-row items-center justify-between p-4 ${index !== actualMembers.length - 1 ? 'border-b border-stone-50' : ''}`}
                                            >
                                                <View className="flex-row items-center">
                                                    <View className={`${isTablet ? 'w-14 h-14' : 'w-10 h-10'} rounded-full items-center justify-center mr-4 ${isSelected ? 'bg-primary/10' : 'bg-stone-50'}`}>
                                                        <Text className={`font-headline-bold ${isTablet ? 'text-xl' : 'text-xs'} ${isSelected ? 'text-primary' : 'text-stone-400'}`}>
                                                            {member.name[0]?.toUpperCase() || '?'}
                                                        </Text>
                                                    </View>
                                                    <Text className={`font-body-bold text-on-surface ${isTablet ? 'text-2xl' : 'text-base'}`}>{member.name}</Text>
                                                </View>
                                                <Ionicons 
                                                    name={isSelected ? "checkbox" : "square-outline"} 
                                                    size={isTablet ? 32 : 24} 
                                                    color={isSelected ? "#b30069" : "#d6d3d1"} 
                                                />
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            )}
                        </View>
                    </View>

                    <View className="h-10" />
                </ScrollView>

                {/* Footer Action */}
                <View className={`px-6 ${isTablet ? 'py-12' : 'py-8'} bg-[#fdf9f3] border-t border-stone-100`}>
                    <TouchableOpacity 
                        onPress={handleAdd}
                        disabled={loading}
                        className={`bg-primary rounded-[24px] items-center justify-center flex-row shadow-xl shadow-primary/30 self-center w-full ${isTablet ? 'h-24 max-w-4xl' : 'h-16'}`}
                        style={{ elevation: 8 }}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Text className={`text-white font-headline-bold mr-2 ${isTablet ? 'text-3xl' : 'text-lg'}`}>Confirm Expense</Text>
                                <MaterialIcons name="check-circle" size={isTablet ? 32 : 24} color="white" />
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default AddExpenseScreen;
