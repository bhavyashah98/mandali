import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createPlanActivity, fetchPlanActivities } from '../../lib/api';
import type { PlanActivity } from '../../types/plans';

function useDebouncedValue<T>(value: T, delayMs: number): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const id = setTimeout(() => setDebounced(value), delayMs);
        return () => clearTimeout(id);
    }, [value, delayMs]);
    return debounced;
}

export function usePlanActivities(groupId: string | null, search: string) {
    const queryClient = useQueryClient();
    const debouncedSearch = useDebouncedValue(search, 300);

    const query = useQuery({
        queryKey: ['planActivities', groupId, debouncedSearch],
        queryFn: () => fetchPlanActivities(groupId!, debouncedSearch),
        enabled: !!groupId,
        staleTime: 30_000,
    });

    const createMutation = useMutation({
        mutationFn: ({ name }: { name: string }) => createPlanActivity(groupId!, name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['planActivities', groupId] });
        },
    });

    const activities: PlanActivity[] = query.data?.activities ?? [];

    return {
        activities,
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        error: query.error,
        refetch: query.refetch,
        createActivity: createMutation.mutateAsync,
        isCreating: createMutation.isPending,
    };
}
