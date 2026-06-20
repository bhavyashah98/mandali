import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import {
    addBringItem,
    claimBringItem,
    unclaimBringItem,
    toggleBringItemUpvote,
    deleteBringItem,
    pinBringItem,
} from '../../lib/api';
import type { BringItem } from '../../types/plans';

function sortItems(items: BringItem[]): BringItem[] {
    return [...items].sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        const aClaimed = !!a.claimedBy;
        const bClaimed = !!b.claimedBy;
        if (aClaimed !== bClaimed) return aClaimed ? -1 : 1;
        return b.upvoteCount - a.upvoteCount;
    });
}

export function useBringActions(planId: string, currentUserId: string | null) {
    const queryClient = useQueryClient();
    const queryKey = ['bring', planId];

    const updateCache = useCallback(
        (updater: (items: BringItem[]) => BringItem[]) => {
            queryClient.setQueryData<{ items: BringItem[] }>(queryKey, (old) =>
                old ? { items: sortItems(updater(old.items)) } : old
            );
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [queryClient, planId]
    );

    // ── Add item ────────────────────────────────────────────────────────────
    const addMutation = useMutation({
        mutationFn: (payload: { name: string; autoClaim?: boolean }) =>
            addBringItem(planId, payload),
        onMutate: async (payload) => {
            const tempId = `temp_${Date.now()}`;
            const optimistic: BringItem = {
                id: tempId,
                planId,
                name: payload.name,
                addedBy: currentUserId ?? '',
                addedByName: 'You',
                isPinned: false,
                claimedBy: payload.autoClaim ? currentUserId : null,
                claimedByName: payload.autoClaim ? 'You' : null,
                claimedByAvatar: null,
                upvoteCount: 0,
                hasUpvoted: false,
                createdAt: new Date().toISOString(),
            };
            updateCache((prev) => [...prev, optimistic]);
            return { tempId };
        },
        onSuccess: (data, _vars, ctx) => {
            const realItem = data.item;
            updateCache((prev) => {
                const withoutDupes = prev.filter(
                    (i) => i.id !== realItem.id && i.id !== ctx?.tempId
                );
                return sortItems([...withoutDupes, realItem]);
            });
        },
        onError: (err: any, _vars, ctx) => {
            console.error('Error adding bring item:', err?.response?.data || err);
            updateCache((prev) => prev.filter((i) => i.id !== ctx?.tempId));
            const errorMessage = err?.response?.data?.error || err.message || 'Could not add item. Please try again.';
            Alert.alert('Error', errorMessage);
        },
    });

    // ── Claim item ──────────────────────────────────────────────────────────
    const claimMutation = useMutation({
        mutationFn: (itemId: string) => claimBringItem(planId, itemId),
        onMutate: async (itemId) => {
            const snapshot = queryClient.getQueryData<{ items: BringItem[] }>(queryKey);
            updateCache((prev) =>
                prev.map((i) =>
                    i.id === itemId
                        ? { ...i, claimedBy: currentUserId, claimedByName: 'You', claimedByAvatar: null }
                        : i
                )
            );
            return { snapshot };
        },
        onError: (err: any, _itemId, ctx) => {
            if (ctx?.snapshot) queryClient.setQueryData(queryKey, ctx.snapshot);
            const msg = err?.response?.data?.error || 'Could not claim item.';
            Alert.alert('Already taken', msg);
        },
    });

    // ── Unclaim item ────────────────────────────────────────────────────────
    const unclaimMutation = useMutation({
        mutationFn: (itemId: string) => unclaimBringItem(planId, itemId),
        onMutate: async (itemId) => {
            const snapshot = queryClient.getQueryData<{ items: BringItem[] }>(queryKey);
            updateCache((prev) =>
                prev.map((i) =>
                    i.id === itemId
                        ? { ...i, claimedBy: null, claimedByName: null, claimedByAvatar: null }
                        : i
                )
            );
            return { snapshot };
        },
        onError: (_err, _itemId, ctx) => {
            if (ctx?.snapshot) queryClient.setQueryData(queryKey, ctx.snapshot);
            Alert.alert('Error', 'Could not unclaim item.');
        },
    });

    // ── Toggle upvote ───────────────────────────────────────────────────────
    const upvoteMutation = useMutation({
        mutationFn: (itemId: string) => toggleBringItemUpvote(planId, itemId),
        onMutate: async (itemId) => {
            const snapshot = queryClient.getQueryData<{ items: BringItem[] }>(queryKey);
            updateCache((prev) =>
                prev.map((i) =>
                    i.id === itemId
                        ? {
                              ...i,
                              hasUpvoted: !i.hasUpvoted,
                              upvoteCount: i.hasUpvoted ? i.upvoteCount - 1 : i.upvoteCount + 1,
                          }
                        : i
                )
            );
            return { snapshot };
        },
        onError: (_err, _itemId, ctx) => {
            if (ctx?.snapshot) queryClient.setQueryData(queryKey, ctx.snapshot);
        },
    });

    // ── Delete item ─────────────────────────────────────────────────────────
    const deleteMutation = useMutation({
        mutationFn: (itemId: string) => deleteBringItem(planId, itemId),
        onMutate: async (itemId) => {
            const snapshot = queryClient.getQueryData<BringItem[]>(queryKey);
            updateCache((prev) => prev.filter((i) => i.id !== itemId));
            return { snapshot };
        },
        onError: (_err, _itemId, ctx) => {
            if (ctx?.snapshot) queryClient.setQueryData(queryKey, ctx.snapshot);
            Alert.alert('Error', 'Could not delete item.');
        },
    });

    // ── Pin item (host only) ────────────────────────────────────────────────
    const pinMutation = useMutation({
        mutationFn: (itemId: string) => pinBringItem(planId, itemId),
        onMutate: async (itemId) => {
            updateCache((prev) =>
                prev.map((i) => (i.id === itemId ? { ...i, isPinned: !i.isPinned } : i))
            );
        },
        onError: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    });

    return {
        addItem: (payload: { name: string; autoClaim?: boolean }) => addMutation.mutate(payload),
        claimItem: (itemId: string) => claimMutation.mutate(itemId),
        unclaimItem: (itemId: string) => unclaimMutation.mutate(itemId),
        toggleUpvote: (itemId: string) => upvoteMutation.mutate(itemId),
        deleteItem: (itemId: string) => deleteMutation.mutate(itemId),
        pinItem: (itemId: string) => pinMutation.mutate(itemId),
        isAdding: addMutation.isPending,
    };
}
