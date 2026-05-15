import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

export const useSettleBalance = (groupId: string) => {
    const queryClient = useQueryClient();
    const [amount, setAmount] = useState('');
    const [selectedUser, setSelectedUser] = useState<string | null>(null);

    const { data: groupMembers = [], isLoading: membersLoading } = useQuery({
        queryKey: ['hisaab-members', groupId],
        queryFn: () => api.fetchHisaabMembers(groupId),
        enabled: !!groupId,
        staleTime: 0,
        refetchOnMount: 'always'
    });

    const { user } = useAuthStore();
    const activeMembers = groupMembers.filter((m: any) => m.balance !== 0 && m.id !== user?.id);

    useEffect(() => {
        if (selectedUser) {
            const member = activeMembers.find((m: any) => m.id === selectedUser);
            if (member && member.balance) {
                setAmount(Math.abs(member.balance).toString());
            }
        }
    }, [selectedUser, groupMembers]); // groupMembers instead of activeMembers to avoid unnecessary re-renders

    const settleMutation = useMutation({
        mutationFn: ({ fromUserId, toUserId, amount }: { fromUserId: string, toUserId: string, amount: number }) =>
            api.settleHisaabBalance(groupId, toUserId, amount, fromUserId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hisaab-ledger', groupId] });
            queryClient.invalidateQueries({ queryKey: ['hisaab-balances'] });
        }
    });

    const handleSettle = useCallback(async (onSuccess: () => void) => {
        const parsedAmount = parseFloat(amount);

        if (!selectedUser) {
            Alert.alert('Select Member', 'Who are you settling with?');
            return;
        }
        if (parsedAmount <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid amount.');
            return;
        }

        const member = activeMembers.find((m: any) => m.id === selectedUser);
        if (!member || !user) return;

        // Determine who is paying whom
        // If balance < 0, THEY owe YOU. They are the 'from' user.
        // If balance > 0, YOU owe THEM. You are the 'from' user.
        const isTheyPaying = member.balance < 0;
        const fromUserId = isTheyPaying ? member.id : user.id;
        const toUserId = isTheyPaying ? user.id : member.id;

        try {
            await settleMutation.mutateAsync({ fromUserId, toUserId, amount: parsedAmount });
            onSuccess();
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to settle balance');
        }
    }, [groupId, selectedUser, amount, settleMutation, activeMembers, user]);

    return {
        amount,
        setAmount,
        selectedUser,
        setSelectedUser,
        activeMembers,
        handleSettle,
        loading: settleMutation.isPending || membersLoading
    };
};


