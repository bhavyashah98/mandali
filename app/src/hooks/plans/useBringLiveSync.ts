import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { BringItem } from '../../types/plans';
import { useSocket } from '../useSocket';

function sortItems(items: BringItem[]): BringItem[] {
    return [...items].sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        const aClaimed = !!a.claimedBy;
        const bClaimed = !!b.claimedBy;
        if (aClaimed !== bClaimed) return aClaimed ? -1 : 1;
        return b.upvoteCount - a.upvoteCount;
    });
}

/** Real-time bring list sync at plan screen level (works on any tab). */
export function useBringLiveSync(planId?: string) {
    const queryClient = useQueryClient();
    const socket = useSocket();
    const queryKey = ['bring', planId];

    const updateCache = useCallback(
        (updater: (items: BringItem[]) => BringItem[]) => {
            if (!planId) return;
            queryClient.setQueryData<{ items: BringItem[] }>(queryKey, (old) =>
                old ? { items: sortItems(updater(old.items)) } : old
            );
        },
        [queryClient, planId]
    );

    useEffect(() => {
        if (!socket || !planId) return;

        const onAdded = (payload: { planId: string; item: BringItem }) => {
            if (payload.planId !== planId) return;
            updateCache((prev) => {
                if (prev.find((i) => i.id === payload.item.id)) return prev;

                const nameKey = payload.item.name.trim().toLowerCase();
                const withoutTemp = prev.filter(
                    (i) =>
                        !(
                            i.id.startsWith('temp_') &&
                            i.name.trim().toLowerCase() === nameKey &&
                            i.addedBy === payload.item.addedBy
                        )
                );

                if (withoutTemp.find((i) => i.id === payload.item.id)) return withoutTemp;
                return [...withoutTemp, payload.item];
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
                    i.id === payload.itemId ? { ...i, upvoteCount: payload.newCount } : i
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
    }, [planId, updateCache, socket]);
}
