import { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as api from '../../lib/api';

export const useHisaabHomeData = () => {
    const {
        data: groupBalances = [],
        isLoading: balancesLoading,
        isRefetching: isRefreshingBalances,
        refetch: refetchBalances
    } = useQuery({
        queryKey: ['hisaab-balances'],
        queryFn: api.fetchHisaabBalances
    });

    const {
        data: groups = [],
        isLoading: groupsLoading,
        isRefetching: isRefreshingGroups,
        refetch: refetchGroups
    } = useQuery({
        queryKey: ['groups'],
        queryFn: api.fetchGroups
    });

    const onRefresh = useCallback(async () => {
        await Promise.all([
            refetchBalances(),
            refetchGroups()
        ]);
    }, [refetchBalances, refetchGroups]);

    const totalBalance = groupBalances.reduce((acc: number, curr: any) => acc + (curr.net_balance || curr.netBalance), 0);

    const processedGroups = useMemo(() => {
        const mapped = groupBalances.map((balance: any) => {
            const groupInfo = groups.find((g: any) => g.id === (balance.group_id || balance.groupId));
            return {
                groupId: balance.group_id || balance.groupId,
                name: groupInfo?.name,
                netBalance: balance.net_balance || balance.netBalance || 0,
                avatar: groupInfo?.cover_photo_url,
                lastActivity: balance.last_activity
            };
        });

        return mapped.sort((a: any, b: any) => {
            const balA = a.netBalance;
            const balB = b.netBalance;

            // 1. You are owed (positive) comes first
            // 2. You owe (negative) comes second
            // 3. Settled up (zero) comes last

            if (balA > 0 && balB <= 0) return -1;
            if (balA <= 0 && balB > 0) return 1;
            if (balA < 0 && balB === 0) return -1;
            if (balA === 0 && balB < 0) return 1;

            // Tie-breakers:
            if (balA > 0 && balB > 0) return balB - balA; // Descending for owed to you (largest first)
            if (balA < 0 && balB < 0) return balB - balA;
            return 0;
        });
    }, [groupBalances, groups]);

    const isLoading = balancesLoading || groupsLoading;
    const isRefreshing = isRefreshingBalances || isRefreshingGroups;

    return {
        totalBalance,
        processedGroups,
        isLoading,
        isRefreshing,
        onRefresh
    };
};

