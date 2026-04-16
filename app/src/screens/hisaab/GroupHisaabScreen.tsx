import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useHisaabStore, Expense } from '../../stores/hisaabStore';
import { useRoute, useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';

const GroupHisaabScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { groupId, groupName } = route.params;
    const { expenses, loading, fetchGroupLedger } = useHisaabStore();

    useEffect(() => {
        fetchGroupLedger(groupId);
    }, [groupId]);

    const renderLedgerItem = ({ item }: { item: Expense }) => {
        const isSettlement = item.type === 'settlement';
        const isPaidByMe = item.paidBy === 'current_user';
        
        // Logical cases based on user's spec
        let variantColor = 'text-on-surface-variant';
        let displayText = '';
        let iconName = 'receipt-long';
        let iconBg = 'bg-surface-container';

        if (isSettlement) {
            displayText = isPaidByMe ? `You settled ₹${item.amount}` : `${item.paidByName} settled ₹${item.amount}`;
            variantColor = 'text-primary';
            iconName = 'handshake';
            iconBg = 'bg-primary/10';
        } else if (isPaidByMe) {
            displayText = `You paid ₹${item.amount} for ${item.description}`;
            variantColor = 'text-success';
            iconName = 'arrow-upward';
            iconBg = 'bg-success/10';
        } else {
            // Check if user is in participants
            const myShare = item.participants.find(p => p.userId === 'current_user')?.amount || 0;
            if (myShare > 0) {
                displayText = `You owe ₹${myShare} for ${item.description}`;
                variantColor = 'text-error';
                iconName = 'arrow-downward';
                iconBg = 'bg-error/10';
            } else {
                displayText = `${item.paidByName} paid ₹${item.amount} for ${item.description}`;
                variantColor = 'text-on-surface-variant';
                iconName = 'visibility';
                iconBg = 'bg-surface-container';
            }
        }

        return (
            <View className="flex-row items-center mb-6">
                <View className={`${iconBg} w-12 h-12 rounded-2xl items-center justify-center mr-4`}>
                    {isSettlement ? (
                        <FontAwesome5 name={iconName} size={18} color={isPaidByMe ? '#b30069' : '#594048'} />
                    ) : (
                        <MaterialIcons name={iconName} size={24} color={variantColor.includes('success') ? '#2e7d32' : variantColor.includes('error') ? '#d32f2f' : '#594048'} />
                    )}
                </View>
                
                <View className="flex-1 border-b border-on-surface/5 pb-4">
                    <View className="flex-row justify-between items-start">
                        <Text className={`font-headline-bold text-base flex-1 mr-2 ${variantColor.replace('text-', 'text-[#').replace('success', '2e7d32').replace('error', 'd32f2f').replace('primary', 'b30069')}`}>
                            {displayText}
                        </Text>
                        <Text className="font-body-regular text-[10px] text-on-surface-variant mt-1">
                            {format(new Date(item.createdAt), 'MMM dd, HH:mm')}
                        </Text>
                    </View>
                    {!isSettlement && !isPaidByMe && item.participants.find(p => p.userId === 'current_user') && (
                        <Text className="font-body-medium text-xs text-on-surface-variant/60">
                            Paid by {item.paidByName}
                        </Text>
                    )}
                    {isSettlement && (
                        <View className="flex-row mt-1">
                            <View className="bg-primary/10 px-2 py-0.5 rounded-full">
                                <Text className="text-primary text-[10px] font-body-bold">SETTLED</Text>
                            </View>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-background">
            {/* Header */}
            <View className="px-6 py-4 flex-row items-center">
                <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
                    <MaterialIcons name="arrow-back-ios" size={24} color="#b30069" />
                </TouchableOpacity>
                <View>
                    <Text className="font-headline-bold text-2xl text-on-surface">{groupName}</Text>
                    <Text className="font-body-regular text-on-surface-variant text-sm">Group Hisaab</Text>
                </View>
            </View>

            {/* Split/Balance Summary */}
            <View className="px-6 mb-8 mt-2">
                <View className="bg-surface-container rounded-[32px] p-6 flex-row items-center">
                    <View className="flex-1">
                        <Text className="font-body-bold text-[10px] uppercase tracking-widest text-on-surface-variant opacity-60 mb-1">Your status here</Text>
                        <Text className="font-headline-bold text-2xl text-on-surface">You are owed ₹1,250</Text>
                    </View>
                    <TouchableOpacity 
                        onPress={() => navigation.navigate('SettleBalance', { groupId, groupName })}
                        className="bg-primary px-5 py-3 rounded-full shadow-sm"
                    >
                        <Text className="text-white font-body-bold">Settle Up</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Timeline List */}
            <View className="flex-1 px-6">
                <Text className="font-headline-bold text-lg text-on-surface mb-6">Recent Activity</Text>
                
                {loading ? (
                    <ActivityIndicator size="large" color="#b30069" />
                ) : (
                    <FlatList
                        data={expenses}
                        renderItem={renderLedgerItem}
                        keyExtractor={(item) => item.id}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 100 }}
                        ListEmptyComponent={
                            <View className="items-center justify-center py-20">
                                <Text className="font-body-regular text-on-surface-variant text-center">No expenses yet</Text>
                            </View>
                        }
                    />
                )}
            </View>

            {/* Floating Action Button */}
            <TouchableOpacity 
                onPress={() => navigation.navigate('AddExpense', { groupId, groupName })}
                className="absolute bottom-10 right-8 w-16 h-16 bg-primary rounded-full items-center justify-center shadow-xl"
                style={{ elevation: 8 }}
            >
                <MaterialIcons name="add" size={32} color="white" />
            </TouchableOpacity>
        </SafeAreaView>
    );
};

export default GroupHisaabScreen;
