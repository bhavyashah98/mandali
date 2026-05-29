import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    fetchBlinkGroupGames,
    fetchHisaabLedger,
    fetchHousieGroupGames,
    fetchMemories,
} from '../../lib/api';

const countPhotos = (memories: any[]) =>
    memories.reduce((total, memory) => {
        const urls = Array.isArray(memory.image_urls) ? memory.image_urls : [];
        return total + urls.length;
    }, 0);

export function usePastPlanRecap(groupId: string, planId: string) {
    const memoriesQuery = useQuery({
        queryKey: ['past-plan-recap-memories', groupId, planId],
        queryFn: () => fetchMemories(groupId, 0, 6, planId),
        enabled: !!groupId && !!planId,
    });

    const hisaabQuery = useQuery({
        queryKey: ['past-plan-recap-hisaab', groupId, planId],
        queryFn: () => fetchHisaabLedger(groupId, planId),
        enabled: !!groupId && !!planId,
    });

    const housieQuery = useQuery({
        queryKey: ['past-plan-recap-housie', groupId, planId],
        queryFn: () => fetchHousieGroupGames(groupId, planId, true),
        enabled: !!groupId && !!planId,
    });

    const blinkQuery = useQuery({
        queryKey: ['past-plan-recap-blink', groupId, planId],
        queryFn: () => fetchBlinkGroupGames(groupId, planId, true),
        enabled: !!groupId && !!planId,
    });

    return useMemo(() => {
        const memories = memoriesQuery.data?.memories || [];
        const ledger = hisaabQuery.data || [];
        const housieGames = housieQuery.data?.games || [];
        const blinkGames = blinkQuery.data?.games || [];
        const games = [...housieGames.map((game: any) => ({ ...game, type: 'housie' })), ...blinkGames.map((game: any) => ({ ...game, type: 'blink' }))];
        const expenses = ledger.filter((item: any) => item.type === 'expense');
        const settlements = ledger.filter((item: any) => item.type === 'settlement');

        return {
            memories,
            memoryCount: memoriesQuery.data?.totalCount || memories.length,
            photoCount: countPhotos(memories),
            ledger,
            expenseCount: expenses.length,
            settlementCount: settlements.length,
            totalSpending: expenses.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0),
            housieGames,
            blinkGames,
            gameCount: games.length,
            endedGameCount: games.filter((game: any) => game.status === 'ended').length,
            hasAny: memories.length > 0 || ledger.length > 0 || games.length > 0,
            isLoading: memoriesQuery.isLoading || hisaabQuery.isLoading || housieQuery.isLoading || blinkQuery.isLoading,
            isError: memoriesQuery.isError || hisaabQuery.isError || housieQuery.isError || blinkQuery.isError,
        };
    }, [memoriesQuery.data, memoriesQuery.isLoading, memoriesQuery.isError, hisaabQuery.data, hisaabQuery.isLoading, hisaabQuery.isError, housieQuery.data, housieQuery.isLoading, housieQuery.isError, blinkQuery.data, blinkQuery.isLoading, blinkQuery.isError]);
}
