import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL, getAuthHeaders, fetchHousieGame, fetchHousiePrizeCatalogue } from '../../lib/api';
import { Prize } from '../../components/housie/bounty/MilestonesList';

// ─── Pure helpers (no JSX) ────────────────────────────────────────────────────

/** Expand catalogue into default prize list — only standard rows + full houses. */
const ordinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const seedPrizes = (catalogue: any[]): Prize[] => {
    const seeded: Prize[] = [];
    catalogue.forEach((p: any) => {
        // Only seed the 6 core prizes: 3 line rows + 3 full houses
        if (p.category !== 'standard' && p.category !== 'fullhouse') return;
        if (!p.repeatable) {
            seeded.push({ ...p, amount: '0', isHighlight: false });
        } else {
            for (let i = 1; i <= 3; i++) {
                seeded.push({ ...p, id: `full_house_${i}`, name: `${ordinal(i)} Full House`, amount: '0', isHighlight: true });
            }
        }
    });
    return seeded;
};

/** Auto-distribute prize pool: 10% per non-Full House prize, rest split (weighted) among full houses. */
const distributePool = (prizes: Prize[], pool: number): Prize[] => {
    const fhPrizes = prizes.filter(p => p.category === 'fullhouse');
    const fixedPrizes = prizes.filter(p => p.category !== 'fullhouse');
    
    if (fhPrizes.length === 0 || pool <= 0) return prizes;

    // Default amount for a "row" or "bonus" is 10%
    let fixedAmt = Math.floor(pool * 0.10);
    
    // Safety: If fixed prizes eat more than 70% of the pool, scale them down
    // so Full Houses always have at least 30% to share.
    const maxFixedTotal = Math.floor(pool * 0.70);
    if (fixedAmt * fixedPrizes.length > maxFixedTotal) {
        fixedAmt = Math.floor(maxFixedTotal / fixedPrizes.length);
    }
    
    const remaining = pool - (fixedAmt * fixedPrizes.length);
    
    // Distribute remaining to Full Houses with decreasing weights (1st FH gets most)
    const totalW = (fhPrizes.length * (fhPrizes.length + 1)) / 2;
    const fhAmts = fhPrizes.map((_, i) => Math.floor(remaining * (fhPrizes.length - i) / totalW));
    
    if (fhAmts.length > 0) {
        // Add rounding remainder to the first Full House
        const allocatedFH = fhAmts.reduce((a, b) => a + b, 0);
        fhAmts[0] += (remaining - allocatedFH);
    }

    return prizes.map(p => {
        if (p.category !== 'fullhouse') {
            return { ...p, amount: fixedAmt.toString() };
        }
        const fi = fhPrizes.findIndex(fh => fh.id === p.id);
        if (fi >= 0) {
            return { ...p, amount: fhAmts[fi].toString() };
        }
        return p;
    });
};

export const useHousieBountyData = (gameCode: string) => {
    const [prizes, setPrizes] = useState<Prize[]>([]);
    const [catalogueSeeded, setCatalogueSeeded] = useState(false);

    // 1. Fetch game details
    const { data: game, isLoading: isGameLoading } = useQuery({
        queryKey: ['housieGame', gameCode],
        queryFn: () => fetchHousieGame(gameCode),
        staleTime: 30_000,
    });
    
    const callingMode = game?.settings?.callingMode || 'manual';

    // 2. Fetch prize catalogue
    const { data: catalogueData, isLoading: isCatalogueLoading } = useQuery({
        queryKey: ['housiePrizeCatalogue', callingMode],
        queryFn: () => fetchHousiePrizeCatalogue(callingMode),
        staleTime: 60_000,
        enabled: !!game,
    });
    
    const catalogue = catalogueData?.prizes || [];
    const allowCustom = catalogueData?.allowCustom ?? (callingMode === 'manual');

    // 3. Fetch participants + prize pool
    const { data: stats, isLoading: isStatsLoading, refetch: refetchStats } = useQuery({
        queryKey: ['housieParticipants', gameCode],
        queryFn: async () => {
            const headers = await getAuthHeaders();
            const res = await axios.get(`${API_URL}/housie/${gameCode}/participants`, { headers });
            return res.data;
        },
        staleTime: 5000,
    });

    const totalPrizePool = stats?.totalPrizePool || 0;
    const participantCount = stats?.participants?.length || 0;

    // Seed default prizes once catalogue arrives
    useEffect(() => {
        if (!catalogue.length || catalogueSeeded) return;
        setPrizes(seedPrizes(catalogue));
        setCatalogueSeeded(true);
    }, [catalogue, catalogueSeeded]);

    // Re-distribute whenever pool or prize list changes (e.g. adding/removing prizes)
    useEffect(() => {
        if (totalPrizePool > 0) {
            setPrizes(prev => distributePool(prev, totalPrizePool));
        }
    }, [totalPrizePool, prizes.length]);

    const totalAllocated = useMemo(() => 
        prizes.reduce((s, p) => s + (parseInt(p.amount) || 0), 0)
    , [prizes]);

    const isBalanced = totalAllocated === totalPrizePool && totalPrizePool > 0;
    const hasZeroPrize = prizes.some(p => !parseInt(p.amount) || parseInt(p.amount) <= 0);
    const canStart = isBalanced && !hasZeroPrize;

    return {
        game,
        prizes,
        setPrizes,
        catalogue,
        allowCustom,
        totalPrizePool,
        totalAllocated,
        participantCount,
        isBalanced,
        canStart,
        isLoading: isGameLoading || isCatalogueLoading || isStatsLoading,
        refetchStats,
        callingMode
    };
};
