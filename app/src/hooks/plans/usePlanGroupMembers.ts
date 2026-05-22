import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchGroupDetail, getOptimizedImageUrl } from '../../lib/api';

export interface PlanGroupMember {
    id: string;
    name: string;
    avatarUrl?: string;
}

export function usePlanGroupMembers(groupId?: string) {
    const { data, isLoading } = useQuery({
        queryKey: ['group', groupId],
        queryFn: () => fetchGroupDetail(groupId!),
        enabled: !!groupId,
    });

    const members: PlanGroupMember[] = useMemo(() => {
        const raw = data?.members || [];
        return raw.map((m: any) => {
            const user = m.users || m.user;
            const name = user?.name || m.name || 'Member';
            const avatar = user?.avatar_url || m.avatar_url;
            return {
                id: m.user_id || m.id,
                name,
                avatarUrl: avatar ? getOptimizedImageUrl(avatar) : undefined,
            };
        });
    }, [data]);

    return { members, memberCount: members.length, isLoading };
}
