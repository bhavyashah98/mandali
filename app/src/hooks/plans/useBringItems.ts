import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchBringItems } from '../../lib/api';
import type { BringItem } from '../../types/plans';

// Socket instance — pulled from global if available
function getSocket(): any | null {
    try {
        // @ts-ignore
        return global.__socket__ ?? null;
    } catch {
        return null;
    }
}

function sortItems(items: BringItem[]): BringItem[] {
    return [...items].sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        const aClaimed = !!a.claimedBy;
        const bClaimed = !!b.claimedBy;
        if (aClaimed !== bClaimed) return aClaimed ? -1 : 1;
        return b.upvoteCount - a.upvoteCount;
    });
}

export function useBringItems(planId: string) {
    const queryClient = useQueryClient();
    const queryKey = ['bring', planId];

    const { data, isLoading, refetch } = useQuery({
        queryKey,
        queryFn: () => fetchBringItems(planId),
        select: (d) => sortItems(d.items),
        staleTime: 30_000,
    });

    // ── Real-time socket listeners ──────────────────────────────────────────
    const updateCache = useCallback(
        (updater: (items: BringItem[]) => BringItem[]) => {
            queryClient.setQueryData<{ items: BringItem[] }>(queryKey, (old) =>
                old ? { items: sortItems(updater(old.items)) } : old
            );
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [queryClient, planId]
    );

    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;

        const onAdded = (payload: { planId: string; item: BringItem }) => {
            if (payload.planId !== planId) return;
            updateCache((prev) => {
                if (prev.find((i) => i.id === payload.item.id)) return prev;
                return [...prev, payload.item];
            });
        };

        const onClaimed = (payload: {
            planId: string;
            itemId: string;
            claimedBy: string;
            claimedByName: string;
            claimedByAvatar: string | null;
        }) => {
            if (payload.planId !== planId) return;
            updateCache((prev) =>
                prev.map((i) =>
                    i.id === payload.itemId
                        ? {
                              ...i,
                              claimedBy: payload.claimedBy,
                              claimedByName: payload.claimedByName,
                              claimedByAvatar: payload.claimedByAvatar,
                          }
                        : i
                )
            );
        };

        const onUnclaimed = (payload: { planId: string; itemId: string }) => {
            if (payload.planId !== planId) return;
            updateCache((prev) =>
                prev.map((i) =>
                    i.id === payload.itemId
                        ? { ...i, claimedBy: null, claimedByName: null, claimedByAvatar: null }
                        : i
                )
            );
        };

        const onUpvoted = (payload: {
            planId: string;
            itemId: string;
            newCount: number;
            hasUpvoted: boolean;
        }) => {
            if (payload.planId !== planId) return;
            updateCache((prev) =>
                prev.map((i) =>
                    i.id === payload.itemId
                        ? { ...i, upvoteCount: payload.newCount }
                        : i
                )
            );
        };

        const onDeleted = (payload: { planId: string; itemId: string }) => {
            if (payload.planId !== planId) return;
            updateCache((prev) => prev.filter((i) => i.id !== payload.itemId));
        };

        const onPinned = (payload: { planId: string; itemId: string; isPinned: boolean }) => {
            if (payload.planId !== planId) return;
            updateCache((prev) =>
                prev.map((i) =>
                    i.id === payload.itemId ? { ...i, isPinned: payload.isPinned } : i
                )
            );
        };

        socket.on('bring_item_added', onAdded);
        socket.on('bring_item_claimed', onClaimed);
        socket.on('bring_item_unclaimed', onUnclaimed);
        socket.on('bring_item_upvoted', onUpvoted);
        socket.on('bring_item_deleted', onDeleted);
        socket.on('bring_item_pinned', onPinned);

        return () => {
            socket.off('bring_item_added', onAdded);
            socket.off('bring_item_claimed', onClaimed);
            socket.off('bring_item_unclaimed', onUnclaimed);
            socket.off('bring_item_upvoted', onUpvoted);
            socket.off('bring_item_deleted', onDeleted);
            socket.off('bring_item_pinned', onPinned);
        };
    }, [planId, updateCache]);

    return {
        items: data ?? [],
        isLoading,
        refetch,
    };
}
