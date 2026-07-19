import { useMemo, useCallback } from 'react';
import { Share } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchGroupTimeline, GroupTimelineItem } from '../lib/api';
import { useIsTablet } from './useIsTablet';

export const useGroupTimeline = () => {
    const route = useRoute<any>();
    const isTablet = useIsTablet();
    const { groupId, groupName } = route.params as { groupId: string; groupName?: string };

    const {
        data,
        isLoading,
        isRefetching,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
        refetch,
    } = useInfiniteQuery({
        queryKey: ['groupTimeline', groupId],
        queryFn: ({ pageParam = 0 }) => fetchGroupTimeline(groupId, pageParam, 20),
        getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.page + 1 : undefined,
        initialPageParam: 0,
    });

    const items = useMemo(() => data?.pages.flatMap((page) => page.items) || [], [data]);

    const onShareMilestone = useCallback(async (item: GroupTimelineItem) => {
        const shareText = item.metadata?.shareText || `${item.title} on Mandali`;
        await Share.share({ message: shareText });
    }, []);

    return {
        items,
        isLoading,
        isRefetching,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
        refetch,
        onShareMilestone,
        groupId,
        groupName,
        isTablet,
    };
};
