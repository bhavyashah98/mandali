import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import * as api from '../../lib/api';

export interface ExpenseParticipant {
    userId: string;
    amount: number;
    userName: string;
}

export const useAddExpense = (groupId: string, initialMembers: any[], initialExpense?: any) => {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const [amount, setAmount] = useState(initialExpense ? initialExpense.amount.toString() : '');
    const [description, setDescription] = useState(initialExpense ? initialExpense.description : '');
    const [splitType, setSplitType] = useState<'equal' | 'exact'>(initialExpense?.expenseType === 'exact' ? 'exact' : 'equal');
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(initialExpense ? initialExpense.participants.map((p: any) => p.userId) : []);
    const [paidByUserId, setPaidByUserId] = useState<string>(initialExpense ? initialExpense.paidBy : user?.id || '');
    const [exactAmounts, setExactAmounts] = useState<Record<string, string>>(() => {
        if (!initialExpense || initialExpense.expenseType !== 'exact') return {};
        const amounts: Record<string, string> = {};
        initialExpense.participants.forEach((p: any) => {
            amounts[p.userId] = p.amount.toString();
        });
        return amounts;
    });

    const { data: members = [], isLoading: membersLoading } = useQuery({
        queryKey: ['hisaab-members', groupId],
        queryFn: () => api.fetchHisaabMembers(groupId),
        enabled: !!groupId,
        initialData: initialMembers,
    });

    useEffect(() => {
        if (!initialExpense && members.length > 0 && selectedMemberIds.length === 0) {
            setSelectedMemberIds(members.map((m: any) => m.id));
        }
    }, [members, initialExpense]);

    const addMutation = useMutation({
        mutationFn: api.createHisaabExpense,
        onSuccess: () => {
            queryClient.refetchQueries({ queryKey: ['hisaab-ledger', groupId] });
            queryClient.refetchQueries({ queryKey: ['hisaab-balances'] });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: any }) => api.updateHisaabExpense(id, data),
        onSuccess: async () => {
            await Promise.all([
                queryClient.refetchQueries({ queryKey: ['hisaab-ledger', groupId] }),
                queryClient.refetchQueries({ queryKey: ['hisaab-balances'] })
            ]);
        },
    });

    const totalAmount = parseFloat(amount) || 0;
    const equalSplitValue = selectedMemberIds.length > 0 ? (totalAmount / selectedMemberIds.length).toFixed(2) : '0';

    const toggleMember = useCallback((id: string) => {
        setSelectedMemberIds(prev => {
            const isRemoving = prev.includes(id);
            if (isRemoving && splitType === 'exact') {
                setExactAmounts(prevExacts => {
                    const next = { ...prevExacts };
                    delete next[id];
                    return next;
                });
            }
            return isRemoving
                ? prev.filter(mid => mid !== id)
                : [...prev, id];
        });
    }, [splitType]);

    const toggleAllMembers = useCallback(() => {
        if (selectedMemberIds.length === members.length) {
            setSelectedMemberIds([]);
            if (splitType === 'exact') setExactAmounts({});
        } else {
            const allIds = members.map((m: any) => m.id);
            setSelectedMemberIds(allIds);
            if (splitType === 'exact' && totalAmount > 0) {
                const share = (totalAmount / allIds.length).toFixed(2);
                const newExacts: Record<string, string> = {};
                allIds.forEach(id => {
                    newExacts[id] = share;
                });
                setExactAmounts(newExacts);
            }
        }
    }, [selectedMemberIds.length, members, splitType, totalAmount]);

    const setExactAmount = useCallback((id: string, val: string) => {
        setExactAmounts(prev => ({ ...prev, [id]: val }));
    }, []);


    const handleAdd = useCallback(async (onSuccess: () => void) => {
        if (totalAmount <= 0) {
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

        const selectedMembers = members.filter((m: any) => selectedMemberIds.includes(m.id));
        let participants: ExpenseParticipant[] = [];

        if (splitType === 'equal') {
            const splitAmount = totalAmount / selectedMembers.length;
            participants = selectedMembers.map((m: any) => ({
                userId: m.id,
                amount: splitAmount,
                userName: m.name
            }));
        } else {
            let runningTotal = 0;
            participants = selectedMembers.map((m: any) => {
                const val = parseFloat(exactAmounts[m.id] || '0');
                runningTotal += val;
                return {
                    userId: m.id,
                    amount: val,
                    userName: m.name
                };
            });

            if (Math.abs(runningTotal - totalAmount) > 0.1) {
                Alert.alert('Amount Mismatch', `The sum of individual amounts (₹${runningTotal.toFixed(2)}) must equal the total amount (₹${totalAmount.toFixed(2)}).`);
                return;
            }
        }

        const paidByMember = members.find((m: any) => m.id === paidByUserId);
        const paidByName = paidByMember ? paidByMember.name : user?.name || 'Unknown';

        const payload = {
            groupId,
            description: description.trim(),
            amount: totalAmount,
            participants,
            expenseType: 'split_and_settle',
            paidByUserId,
            paidByName
        };

        try {
            if (initialExpense?.id) {
                await updateMutation.mutateAsync({ id: initialExpense.id, data: payload });
            } else {
                await addMutation.mutateAsync(payload);
            }
            onSuccess();
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to save expense');
        }
    }, [groupId, description, totalAmount, selectedMemberIds, members, splitType, exactAmounts, equalSplitValue, addMutation, updateMutation, initialExpense, paidByUserId, user]);

    const exactTotal = splitType === 'equal' ? totalAmount : selectedMemberIds.reduce((acc, id) => {
        return acc + (parseFloat(exactAmounts[id] || '0') || 0);
    }, 0);

    const isSumMatching = splitType === 'equal' ? true : Math.abs(exactTotal - totalAmount) < 0.1;

    return {
        amount,
        setAmount,
        description,
        setDescription,
        splitType,
        setSplitType,
        selectedMemberIds,
        exactAmounts,
        setExactAmount,
        exactTotal,
        isSumMatching,
        actualMembers: members,
        toggleMember,
        toggleAllMembers,
        handleAdd,
        loading: addMutation.isPending || updateMutation.isPending || membersLoading,
        equalSplitValue,
        isEdit: !!initialExpense,
        paidByUserId,
        setPaidByUserId,
        currentUserId: user?.id
    };
};


