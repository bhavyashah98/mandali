import React, { useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { useIsTablet } from '../../hooks/useIsTablet';
import * as api from '../../lib/api';

const ExpenseDetailScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const isTablet = useIsTablet();
    const { user } = useAuthStore();
    const queryClient = useQueryClient();

    const { item: initialItem, groupId: initialGroupId, groupName: initialGroupName, members: initialMembers, expenseId, isFromDeepLink } = route.params || {};

    const { data: deepLinkData, isLoading: isDeepLinkLoading, error: deepLinkError } = useQuery({
        queryKey: ['hisaab-expense', expenseId],
        queryFn: async () => {
            if (!expenseId) return null;
            return api.fetchHisaabExpenseDetail(expenseId);
        },
        enabled: !!isFromDeepLink && !!expenseId
    });

    if (isFromDeepLink && isDeepLinkLoading) {
        return (
            <SafeAreaView className="flex-1 bg-[#fdf9f3] justify-center items-center">
                <ActivityIndicator size="large" color="#b30069" />
            </SafeAreaView>
        );
    }

    if (isFromDeepLink && (deepLinkError || !deepLinkData)) {
        return (
            <SafeAreaView className="flex-1 bg-[#fdf9f3] justify-center items-center px-6">
                <Text className="font-headline-bold text-lg text-on-surface text-center mb-4">
                    Expense Not Found
                </Text>
                <TouchableOpacity onPress={() => navigation.goBack()} className="bg-primary px-6 py-3 rounded-full">
                    <Text className="text-white font-headline-bold">Go Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const item = isFromDeepLink ? deepLinkData?.expense : initialItem;
    const groupId = isFromDeepLink ? deepLinkData?.groupId : initialGroupId;
    const groupName = isFromDeepLink ? deepLinkData?.groupName : initialGroupName;
    const members = isFromDeepLink ? deepLinkData?.members : initialMembers;

    const isSettlement = item.type === 'settlement';
    const isPaidByMe = item.paidBy === user.id;
    const isAddedByMe = item.addedBy === user.id;
    const canEditDelete = true; // Anybody in the group can edit or delete

    const deleteMutation = useMutation({
        mutationFn: () =>
            isSettlement ? api.deleteHisaabSettlement(item.id) : api.deleteHisaabExpense(item.id),
        onSuccess: () => {
            queryClient.refetchQueries({ queryKey: ['hisaab-ledger', groupId] });
            queryClient.refetchQueries({ queryKey: ['hisaab-balances'] });
            navigation.goBack();
        }
    });

    const handleDelete = useCallback(() => {
        Alert.alert(
            'Delete Entry',
            'This cannot be undone. Remove this entry from the ledger?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => deleteMutation.mutate()
                }
            ]
        );
    }, [deleteMutation]);

    const handleEdit = useCallback(() => {
        navigation.navigate('AddExpense', { groupId, groupName, members, initialExpense: item });
    }, [navigation, groupId, groupName, members, item]);

    const paidByLabel = isPaidByMe ? 'You' : item.paidByName;
    const addedByLabel = isAddedByMe ? 'You' : item.addedByName;

    const addedDate = new Date(item.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    return (
        <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top']}>
            <View className={`px-6 ${isTablet ? 'py-8' : 'py-4'} flex-row items-center justify-between`}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className={`${isTablet ? 'w-16 h-16' : 'w-10 h-10'} bg-white rounded-full items-center justify-center shadow-sm border border-stone-100`}
                >
                    <MaterialIcons name="arrow-back" size={isTablet ? 28 : 22} color="#1c1c18" />
                </TouchableOpacity>

                <View className="items-center">
                    <Text className={`font-headline-bold text-[#1c1c18] ${isTablet ? 'text-4xl' : 'text-xl'}`}>
                        {isSettlement ? 'Settlement' : 'Expense'}
                    </Text>
                    <Text className={`font-body-bold text-[#b30069] uppercase tracking-widest ${isTablet ? 'text-lg' : 'text-[9px]'}`}>
                        {groupName}
                    </Text>
                </View>

                <View className="flex-row items-center gap-2">
                    {canEditDelete && !isSettlement && (
                        <TouchableOpacity
                            onPress={handleEdit}
                            className={`${isTablet ? 'w-16 h-16' : 'w-10 h-10'} bg-[#3b82f6]/10 rounded-full items-center justify-center border border-[#3b82f6]/20`}
                        >
                            <MaterialIcons name="edit" size={isTablet ? 26 : 18} color="#3b82f6" />
                        </TouchableOpacity>
                    )}
                    {canEditDelete && (
                        <TouchableOpacity
                            onPress={handleDelete}
                            disabled={deleteMutation.isPending}
                            className={`${isTablet ? 'w-16 h-16' : 'w-10 h-10'} bg-[#ef4444]/10 rounded-full items-center justify-center border border-[#ef4444]/20`}
                        >
                            {deleteMutation.isPending ? (
                                <ActivityIndicator size="small" color="#ef4444" />
                            ) : (
                                <MaterialIcons name="delete-outline" size={isTablet ? 26 : 18} color="#ef4444" />
                            )}
                        </TouchableOpacity>
                    )}
                    {!canEditDelete && <View className={isTablet ? 'w-16' : 'w-10'} />}
                </View>
            </View>

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 60 }}
            >
                <View
                    style={{ elevation: 2, shadowColor: '#b30069', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 }}
                    className={`bg-white rounded-[28px] border border-stone-50 mb-6 ${isTablet ? 'p-10' : 'p-6'}`}
                >
                    <View className={`w-16 h-16 rounded-2xl items-center justify-center mb-4 ${isSettlement ? 'bg-[#7c3aed]/8' : 'bg-[#b30069]/8'}`}>
                        {isSettlement ? (
                            <FontAwesome5 name="handshake" size={isTablet ? 32 : 24} color="#7c3aed" />
                        ) : (
                            <MaterialIcons name="receipt-long" size={isTablet ? 40 : 28} color="#b30069" />
                        )}
                    </View>

                    <Text className={`font-headline-bold text-[#1c1c18] mb-2 ${isTablet ? 'text-5xl' : 'text-2xl'}`}>
                        {isSettlement ? `${item.paidByName} → ${item.toUserName}` : item.description}
                    </Text>

                    <Text className={`font-headline-bold mb-1 ${isTablet ? 'text-4xl' : 'text-3xl'}`} style={{ color: '#b30069' }}>
                        ₹{Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Text>

                    <Text className={`font-body-medium text-stone-400 ${isTablet ? 'text-xl' : 'text-sm'}`}>
                        Added by {addedByLabel} on {addedDate}
                    </Text>
                </View>

                <View
                    style={{ elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 4 }}
                    className={`bg-white rounded-[24px] border border-stone-50 mb-4 ${isTablet ? 'p-8' : 'p-5'}`}
                >
                    <Text className={`font-body-bold text-stone-400 uppercase tracking-widest mb-4 ${isTablet ? 'text-xl' : 'text-[10px]'}`}>
                        Paid By
                    </Text>
                    <View className="flex-row items-center">
                        <View className="w-10 h-10 rounded-full bg-[#10b981]/10 items-center justify-center mr-3">
                            <MaterialIcons name="person" size={18} color="#10b981" />
                        </View>
                        <Text className={`font-headline-bold text-[#1c1c18] ${isTablet ? 'text-3xl' : 'text-lg'}`}>
                            {paidByLabel}
                        </Text>
                        <View className="ml-3 bg-[#10b981]/10 px-3 py-1 rounded-full">
                            <Text className={`font-body-bold text-[#10b981] ${isTablet ? 'text-lg' : 'text-[11px]'}`}>
                                ₹{Number(item.amount).toLocaleString('en-IN')} total
                            </Text>
                        </View>
                    </View>
                </View>

                {!isSettlement && item.participants && item.participants.length > 0 && (
                    <View
                        style={{ elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 4 }}
                        className={`bg-white rounded-[24px] border border-stone-50 ${isTablet ? 'p-8' : 'p-5'}`}
                    >
                        <Text className={`font-body-bold text-stone-400 uppercase tracking-widest mb-4 ${isTablet ? 'text-xl' : 'text-[10px]'}`}>
                            Split Between
                        </Text>
                        {item.participants.map((p: any) => {
                            const isCurrentUser = p.userId === user.id;
                            const isPayer = p.userId === item.paidBy;
                            const owes = !isPayer;
                            return (
                                <View key={p.userId} className="flex-row items-center justify-between mb-3 last:mb-0">
                                    <View className="flex-row items-center flex-1">
                                        <View className={`w-9 h-9 rounded-full items-center justify-center mr-3 ${isCurrentUser ? 'bg-[#b30069]/10' : 'bg-stone-100'}`}>
                                            <MaterialIcons name="person" size={16} color={isCurrentUser ? '#b30069' : '#a8a29e'} />
                                        </View>
                                        <Text className={`font-body-bold ${isTablet ? 'text-2xl' : 'text-sm'} ${isCurrentUser ? 'text-[#b30069]' : 'text-[#1c1c18]'}`}>
                                            {isCurrentUser ? 'You' : p.userName}
                                        </Text>
                                    </View>
                                    <View className="items-end">
                                        <Text className={`font-headline-bold ${isTablet ? 'text-2xl' : 'text-sm'} ${owes ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
                                            ₹{Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </Text>
                                        <Text className={`font-body-regular text-stone-400 ${isTablet ? 'text-base' : 'text-[10px]'}`}>
                                            {isPayer ? 'share' : 'owes'}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

export default ExpenseDetailScreen;
