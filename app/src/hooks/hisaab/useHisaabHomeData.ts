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
        queryKey: ['hisaab', 'balances'],
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
        return groupBalances.map((balance: any) => {
            const groupInfo = groups.find((g: any) => g.id === (balance.group_id || balance.groupId));
            return {
                groupId: balance.group_id || balance.groupId,
                name: groupInfo?.name,
                netBalance: balance.net_balance || balance.netBalance,
                avatar: groupInfo?.cover_photo_url,
                lastActivity: balance.last_activity
            };
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

