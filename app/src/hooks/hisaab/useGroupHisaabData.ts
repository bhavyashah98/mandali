import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import * as api from '../../lib/api';

export const useGroupHisaabData = (groupId: string) => {
    const queryClient = useQueryClient();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const { data: groupDetail, isLoading: groupLoading } = useQuery({
        queryKey: ['group', groupId],
        queryFn: () => api.fetchGroupDetail(groupId),
        enabled: !!groupId
    });

    const { data: expenses = [], isLoading: ledgerLoading, refetch: refetchLedger } = useQuery({
        queryKey: ['hisaab-ledger', groupId],
        queryFn: () => api.fetchHisaabLedger(groupId),
        enabled: !!groupId
    });

    const { data: rawBalances = [], isLoading: balancesLoading, refetch: refetchBalances } = useQuery({
        queryKey: ['hisaab-balances'],
        queryFn: api.fetchHisaabBalances
    });

    useFocusEffect(useCallback(() => {
        refetchLedger();
        refetchBalances();
    }, [refetchLedger, refetchBalances]));

    const currentGroupBalanceInfo = rawBalances.find((b: any) => b.groupId === groupId);
    const groupBalance = currentGroupBalanceInfo ? currentGroupBalanceInfo.netBalance : 0;

    const onRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['group', groupId] }),
            refetchLedger(),
            refetchBalances()
        ]);
        setIsRefreshing(false);
    }, [groupId, queryClient, refetchLedger, refetchBalances]);

    const deleteMutation = useMutation({
        mutationFn: ({ id, type }: { id: string, type: 'expense' | 'settlement' }) =>
            type === 'expense' ? api.deleteHisaabExpense(id) : api.deleteHisaabSettlement(id),
        onSuccess: () => {
            refetchLedger();
            refetchBalances();
        }
    });

    const deleteEntry = useCallback(async (id: string, type: 'expense' | 'settlement') => {
        try {
            await deleteMutation.mutateAsync({ id, type });
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to delete entry');
        }
    }, [deleteMutation]);

    const totalSpending = expenses
        .filter((e: any) => e.type === 'expense')
        .reduce((acc: number, curr: any) => acc + curr.amount, 0);

    const initialLoading = (groupLoading || ledgerLoading || balancesLoading) && !isRefreshing;

    return {
        expenses,
        groupBalance,
        totalSpending,
        groupDetail,
        initialLoading,
        isRefreshing,
        onRefresh,
        deleteEntry
    };
};
