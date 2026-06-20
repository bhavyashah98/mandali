import { useQuery } from '@tanstack/react-query';
import { fetchBringItems } from '../../lib/api';
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

export function useBringItems(planId: string) {
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['bring', planId],
        queryFn: () => fetchBringItems(planId),
        select: (d) => sortItems(d.items),
        staleTime: 30_000,
    });

    return {
        items: data ?? [],
        isLoading,
        refetch,
    };
}
