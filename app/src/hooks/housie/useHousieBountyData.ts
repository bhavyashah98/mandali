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

/** Auto-distribute prize pool: 10% per line row, rest split (weighted) among full houses. */
const distributePool = (prizes: Prize[], pool: number): Prize[] => {
    const fhPrizes = prizes.filter(p => p.category === 'fullhouse');
    const lineIds = ['top_line', 'middle_line', 'bottom_line'];
    const lineCount = prizes.filter(p => lineIds.includes(p.id)).length;
    
    // Non-distributed prizes (bonus/special/custom) should keep their values if possible?
    // Actually, the previous implementation just cleared them? 
    // "Total allocated" should include them.
    
    if (fhPrizes.length === 0 || pool <= 0) return prizes;

    const lineAmt = Math.floor(pool * 0.10);
    const remaining = pool - lineAmt * lineCount;
    
    // We only distribute the "remaining" to full houses.
    // If there are bonus prizes with fixed amounts, they should subtract from the pool first.
    // But for now, let's keep it simple as per previous logic but safer.
    
    const totalW = (fhPrizes.length * (fhPrizes.length + 1)) / 2;
    // Reverse weights: 1st gets fhPrizes.length, last gets 1
    const fhAmts = fhPrizes.map((_, i) => Math.floor(remaining * (fhPrizes.length - i) / totalW));
    
    if (fhAmts.length > 0) {
        // Adjust the first one for rounding (since it's the biggest, it's safer to put remainder there or the last one)
        // Let's put remainder in the 1st Full House to ensure it remains the greatest
        fhAmts[0] += remaining - fhAmts.reduce((a, b) => a + b, 0);
    }

    return prizes.map(p => {
        if (lineIds.includes(p.id)) return { ...p, amount: lineAmt.toString() };
        const fi = fhPrizes.findIndex(fh => fh.id === p.id);
        if (fi >= 0) return { ...p, amount: fhAmts[fi].toString() };
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

    // Re-distribute whenever pool or prize list changes (e.g. adding/removing full houses)
    const fhCount = useMemo(() => prizes.filter(p => p.category === 'fullhouse').length, [prizes]);
    
    useEffect(() => {
        if (totalPrizePool > 0) {
            setPrizes(prev => distributePool(prev, totalPrizePool));
        }
    }, [totalPrizePool, fhCount]);

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
