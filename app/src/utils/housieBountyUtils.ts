/**
 * Utility to distribute 100% pool across prizes based on their weightage.
 * Higher weightage (difficulty) = Higher percentage of the pool.
 */
export const distributePoolByWeightage = (selectedPrizes: any[]) => {
    if (selectedPrizes.length === 0) return [];

    // 1. Adjust weightages for multiple Full Houses (FH1 > FH2 > FH3...)
    let fullHouseIndex = 0;
    const prizesWithAdjustedWeights = selectedPrizes.map(p => {
        if (p.category === 'fullhouse' || p.type === 'full_house') {
            const baseWeight = p.weightage || 15;
            // Decay formula: each subsequent Full House has 20% less weight than the previous
            const weight = Math.round(baseWeight * Math.pow(0.8, fullHouseIndex));
            fullHouseIndex++;
            return { ...p, weightage: Math.max(5, weight) }; // Minimum weightage of 5 for FH
        }
        return p;
    });

    // 2. Calculate total weightage
    const totalWeight = prizesWithAdjustedWeights.reduce((sum, p) => sum + (p.weightage || 5), 0);

    // 3. Distribute 100% based on weightage
    let remainingPercentage = 100;
    const distributed = prizesWithAdjustedWeights.map((p, index) => {
        if (index === prizesWithAdjustedWeights.length - 1) {
            return { ...p, percentage: remainingPercentage };
        }
        
        const share = Math.round(((p.weightage || 5) / totalWeight) * 100);
        remainingPercentage -= share;
        return { ...p, percentage: share };
    });

    return sortPrizes(distributed);
};

/**
 * Sorts prizes by category (Bonus -> Standard -> Full House) and then by weightage
 */
export const sortPrizes = (prizes: any[]) => {
    const categoryOrder: Record<string, number> = {
        bonus: 1,
        standard: 2,
        fullhouse: 3
    };

    return [...prizes].sort((a, b) => {
        // Sort by category order
        const catA = categoryOrder[a.category] || 99;
        const catB = categoryOrder[b.category] || 99;
        if (catA !== catB) return catA - catB;

        // Within same category, sort by weightage (lower to higher difficulty)
        return (a.weightage || 0) - (b.weightage || 0);
    });
};
