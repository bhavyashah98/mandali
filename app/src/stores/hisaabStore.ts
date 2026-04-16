import { create } from 'zustand';
import * as api from '../lib/api';

export interface ExpenseParticipant {
    userId: string;
    amount: number;
    userName?: string;
}

export interface Expense {
    id: string;
    groupId: string;
    description: string;
    amount: number;
    paidBy: string; // userId
    paidByName: string;
    participants: ExpenseParticipant[];
    type: 'expense' | 'settlement';
    createdAt: string;
}

export interface GroupBalance {
    groupId: string;
    groupName: string;
    netBalance: number; // Positive = user is owed, Negative = user owes
    lastActivity?: string;
}

interface HisaabState {
    expenses: Expense[];
    groupBalances: GroupBalance[];
    groupMembers: { id: string, name: string, balance?: number }[];
    loading: boolean;
    error: string | null;

    // Actions
    fetchGroupBalances: () => Promise<void>;
    fetchGroupLedger: (groupId: string) => Promise<void>;
    fetchGroupMembers: (groupId: string) => Promise<void>;
    fetchMemberBalances: (groupId: string) => Promise<void>;
    addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => Promise<void>;
    settleBalance: (groupId: string, toUserId: string, amount: number) => Promise<void>;
}

export const useHisaabStore = create<HisaabState>((set, get) => ({
    expenses: [],
    groupBalances: [],
    groupMembers: [],
    loading: false,
    error: null,

    fetchGroupBalances: async () => {
        set({ loading: true });
        try {
            const balances = await api.fetchHisaabBalances();
            set({
                groupBalances: balances.map((item: any) => ({
                    groupId: item.group_id,
                    groupName: item.group_name,
                    netBalance: item.net_balance,
                    lastActivity: item.last_activity
                })),
                loading: false
            });
        } catch (err: any) {
            set({ error: err.message, loading: false });
        }
    },

    fetchGroupLedger: async (groupId: string) => {
        set({ loading: true });
        try {
            const ledger = await api.fetchHisaabLedger(groupId);
            set({ expenses: ledger, loading: false });
        } catch (err: any) {
            set({ error: err.message, loading: false });
        }
    },

    fetchGroupMembers: async (groupId: string) => {
        // This now handles both members and their balances if the API returns them
        set({ loading: true });
        try {
            const members = await api.fetchHisaabMembers(groupId);
            set({ groupMembers: members, loading: false });
        } catch (err: any) {
            set({ error: err.message, loading: false });
        }
    },

    fetchMemberBalances: async (groupId: string) => {
        // Redundant now if fetchGroupMembers handles it, but keeping for compatibility
        get().fetchGroupMembers(groupId);
    },

    addExpense: async (expenseData) => {
        set({ loading: true });
        try {
            await api.createHisaabExpense(expenseData);
            // Refresh ledger
            get().fetchGroupLedger(expenseData.groupId);
            get().fetchGroupBalances();
        } catch (err: any) {
            set({ error: err.message, loading: false });
        }
    },

    settleBalance: async (groupId, toUserId, amount) => {
        set({ loading: true });
        try {
            await api.settleHisaabBalance(groupId, toUserId, amount);
            get().fetchGroupLedger(groupId);
            get().fetchGroupBalances();
        } catch (err: any) {
            set({ error: err.message, loading: false });
        }
    }
}));
