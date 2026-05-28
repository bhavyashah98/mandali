import React, { useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../stores/authStore';
import { useIsTablet } from '../../hooks/useIsTablet';
import { useGroupHisaabData } from '../../hooks/hisaab/useGroupHisaabData';

import GroupHisaabHeader from '../../components/hisaab/GroupHisaabHeader';
import GroupHisaabSummary from '../../components/hisaab/GroupHisaabSummary';
import GroupHisaabLedgerItem from '../../components/hisaab/GroupHisaabLedgerItem';

const GroupHisaabScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const isTablet = useIsTablet();
    const { groupId, groupName, planId } = route.params;
    const { user } = useAuthStore();

    const {
        expenses,
        groupBalance,
        totalSpending,
        groupDetail,
        initialLoading,
        isRefreshing,
        onRefresh
    } = useGroupHisaabData(groupId, planId);

    const members = useCallback(() => {
        if (!groupDetail) return [];
        return groupDetail.members.map((m: any) => ({
            id: m.user_id,
            name: m.users?.name || 'Unknown'
        }));
    }, [groupDetail]);

    const handleAddExpense = useCallback(() => {
        navigation.navigate('AddExpense', { groupId, groupName, planId, members: members() });
    }, [navigation, groupId, groupName, planId, members]);

    const handleSettle = useCallback(() => {
        navigation.navigate('SettleBalance', { groupId, groupName, planId });
    }, [navigation, groupId, groupName, planId]);

    const handleItemPress = useCallback((item: any) => {
        navigation.navigate('ExpenseDetail', {
            item,
            groupId,
            groupName,
            planId,
            members: members()
        });
    }, [navigation, groupId, groupName, planId, members]);

    return (
        <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top']}>
            <GroupHisaabHeader groupName={groupName} onAddExpense={handleAddExpense} />
            <GroupHisaabSummary
                groupBalance={groupBalance}
                totalSpending={totalSpending}
                onSettle={handleSettle}
            />

            <View className="flex-1 px-6">
                <View className="flex-row items-center justify-between mb-6">
                    <Text className={`font-headline-bold text-[#1c1c18] ${isTablet ? 'text-4xl' : 'text-xl'}`}>Audit Log</Text>
                    <View className="bg-stone-100 px-3 py-1 rounded-full">
                        <Text className={`text-stone-400 font-body-bold uppercase tracking-widest ${isTablet ? 'text-xl px-4 py-1' : 'text-[9px]'}`}>
                            {expenses.length} ENTRIES
                        </Text>
                    </View>
                </View>

                {initialLoading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="#b30069" />
                    </View>
                ) : (
                    <FlatList
                        data={expenses}
                        renderItem={({ item }) => (
                            <GroupHisaabLedgerItem
                                item={item}
                                currentUserId={user?.id}
                                onPress={() => handleItemPress(item)}
                            />
                        )}
                        keyExtractor={(item) => item.id}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 60 }}
                        refreshControl={
                            <RefreshControl
                                refreshing={isRefreshing}
                                onRefresh={onRefresh}
                                tintColor="#b30069"
                                colors={['#b30069']}
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
