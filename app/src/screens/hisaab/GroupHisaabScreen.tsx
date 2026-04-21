import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useHisaabStore, Expense } from '../../stores/hisaabStore';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { fetchGroupDetail } from '../../lib/api';

const GroupHisaabScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { groupId, groupName } = route.params;
    const { expenses, groupBalances, loading: storeLoading, fetchGroupLedger, fetchGroupBalances } = useHisaabStore();
    const { user } = useAuthStore();
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Fetch group details to get members (avoiding redundant hisaab/members call)
    const { data: groupDetail, isLoading: groupLoading, refetch: refetchGroup } = useQuery({
        queryKey: ['group', groupId],
        queryFn: () => fetchGroupDetail(groupId)
    });

    useEffect(() => {
        fetchGroupLedger(groupId);
        fetchGroupBalances(); // Also fetch global balances to keep summary updated
    }, [groupId]);

    const onRefresh = async () => {
        setIsRefreshing(true);
        await Promise.all([
            fetchGroupLedger(groupId),
            fetchGroupBalances(),
            refetchGroup()
        ]);
        setIsRefreshing(false);
    };

    // Calculate current user's balance in THIS group
    const groupBalance = useMemo(() => {
        return groupBalances.find(b => b.groupId === groupId)?.netBalance || 0;
    }, [groupBalances, groupId]);

    const renderLedgerItem = ({ item }: { item: Expense }) => {
        const isSettlement = item.type === 'settlement';
        const isPaidByMe = item.paidBy === user?.id;

        // Logical cases based on user's spec
        let variantColor = 'text-on-surface-variant';
        let displayText = '';
        let iconName = 'receipt-long';
        let iconBg = 'bg-stone-100';

        if (isSettlement) {
            displayText = isPaidByMe ? `You settled ₹${item.amount}` : `${item.paidByName} settled ₹${item.amount}`;
            variantColor = 'text-primary';
            iconName = 'handshake';
            iconBg = 'bg-[#b3006911]';
        } else if (isPaidByMe) {
            displayText = `You paid ₹${item.amount} for ${item.description}`;
            variantColor = 'text-green-600';
            iconName = 'arrow-upward';
            iconBg = 'bg-green-50';
        } else {
            // Check if user is in participants
            const myShare = item.participants.find(p => p.userId === user?.id)?.amount || 0;
            if (myShare > 0) {
                displayText = `You owe ₹${myShare} for ${item.description}`;
                variantColor = 'text-red-600';
                iconName = 'arrow-downward';
                iconBg = 'bg-red-50';
            } else {
                displayText = `${item.paidByName} paid ₹${item.amount} for ${item.description}`;
                variantColor = 'text-stone-400';
                iconName = 'visibility';
                iconBg = 'bg-stone-50';
            }
        }

        return (
            <View className="flex-row items-center mb-6">
                <View className={`${iconBg} w-12 h-12 rounded-2xl items-center justify-center mr-4`}>
                    {isSettlement ? (
                        <FontAwesome5 name={iconName} size={18} color={isPaidByMe ? '#b30069' : '#594048'} />
                    ) : (
                        <MaterialIcons 
                            name={iconName as any} 
                            size={24} 
                            color={variantColor.includes('green') ? '#16a34a' : variantColor.includes('red') ? '#dc2626' : '#a8a29e'} 
                        />
                    )}
                </View>

                <View className="flex-1 border-b border-stone-100 pb-4">
                    <View className="flex-row justify-between items-start">
                        <Text className={`font-headline-bold text-base flex-1 mr-2 ${variantColor.replace('text-', 'text-[#').replace('green-600', '16a34a').replace('red-600', 'dc2626').replace('primary', 'b30069')}`}>
                            {displayText}
                        </Text>
                        <Text className="font-body-regular text-[10px] text-stone-300 mt-1">
                            {new Date(item.createdAt).toLocaleDateString()}
                        </Text>
                    </View>
                    {!isSettlement && !isPaidByMe && item.participants.find(p => p.userId === user?.id) && (
                        <Text className="font-body-medium text-[11px] text-stone-400">
                            Paid by {item.paidByName}
                        </Text>
                    )}
                </View>
            </View>
        );
    };

    const initialLoading = (storeLoading || groupLoading) && !isRefreshing && expenses.length === 0;

    return (
        <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top']}>
            {/* Header */}
            <View className="px-6 py-4 flex-row items-center justify-between">
                <View className="flex-row items-center">
                    <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4 w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm border border-stone-100">
                        <MaterialIcons name="arrow-back-ios" size={18} color="#b30069" style={{ marginLeft: 6 }} />
                    </TouchableOpacity>
                    <View>
                        <Text className="font-headline-bold text-xl text-on-surface" numberOfLines={1}>{groupName}</Text>
                        <Text className="font-body-bold text-[#b30069] text-[10px] uppercase tracking-widest">Hisaab Audit</Text>
                    </View>
                </View>

                <TouchableOpacity 
                    onPress={() => {
                        const members = groupDetail?.members?.map((m: any) => ({
                            id: m.user_id,
                            name: m.users?.name || 'Unknown'
                        })) || [];
                        navigation.navigate('AddExpense', { groupId, groupName, members });
                    }}
                    className="w-12 h-12 bg-primary rounded-2xl items-center justify-center shadow-lg shadow-primary/20"
                >
                    <MaterialIcons name="add" size={28} color="white" />
                </TouchableOpacity>
            </View>

            {/* Split/Balance Summary */}
            <View className="px-6 mb-8 mt-4">
                <View className="bg-white rounded-[32px] p-6 flex-row items-center border border-stone-100 shadow-sm">
                    <View className="flex-1">
                        <Text className="font-body-bold text-[10px] uppercase tracking-widest text-stone-400 mb-1">Your Total Status</Text>
                        <Text className={`font-headline-bold text-2xl ${groupBalance > 0 ? 'text-success' : groupBalance < 0 ? 'text-error' : 'text-on-surface'}`}>
                            {groupBalance === 0 ? 'All Settled up!' : groupBalance > 0 ? `You are owed ₹${Math.abs(groupBalance).toLocaleString()}` : `You owe ₹${Math.abs(groupBalance).toLocaleString()}`}
                        </Text>
                    </View>
                    {groupBalance !== 0 && (
                        <TouchableOpacity
                            onPress={() => navigation.navigate('SettleBalance', { groupId, groupName })}
                            className="bg-primary/10 px-6 py-3 rounded-2xl"
                        >
                            <Text className="text-primary font-body-bold text-xs uppercase tracking-wider text-center">Settle</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Timeline List */}
            <View className="flex-1 px-6">
                <View className="flex-row items-center justify-between mb-6">
                    <Text className="font-headline-bold text-xl text-on-surface">Audit Log</Text>
                    <View className="bg-stone-100 px-3 py-1 rounded-full">
                        <Text className="text-stone-400 font-body-bold text-[9px] uppercase tracking-widest">{expenses.length} ENTRIES</Text>
                    </View>
                </View>

                {initialLoading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="#b30069" />
                    </View>
                ) : (
                    <FlatList
                        data={expenses}
                        renderItem={renderLedgerItem}
                        keyExtractor={(item) => item.id}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 60 }}
                        refreshControl={
                            <RefreshControl 
                                refreshing={isRefreshing} 
                                onRefresh={onRefresh} 
                                tintColor="#b30069" 
                            />
                        }
                        ListEmptyComponent={
                            <View className="items-center justify-center py-20 px-10">
                                <View className="w-20 h-20 bg-stone-50 rounded-full items-center justify-center mb-6">
                                    <Ionicons name="list" size={32} color="#b3006933" />
                                </View>
                                <Text className="font-headline-bold text-lg text-on-surface">Nothing to Audit</Text>
                                <Text className="font-body-medium text-stone-400 text-center mt-2">
                                    Once expenses or settlements are added, they will appear in this log for everyone to see.
                                </Text>
                            </View>
                        }
                    />
                )}
            </View>
        </SafeAreaView>
    );
};

export default GroupHisaabScreen;
