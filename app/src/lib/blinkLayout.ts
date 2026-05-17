export interface PlacedSymbol {
    sid: number;
    x: number;
    y: number;
    rotation: number;
    iconSize: number;
}

const hashString = (str: string) => {
    let hash = 0;

    for (let i = 0; i < str.length; i++) {
        hash =
            (hash << 5) -
            hash +
            str.charCodeAt(i);

        hash |= 0;
    }

    return Math.abs(hash);
};

const seededRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
};

export const generateLayout = (
    symbols: number[],
    size: number,
    cardId: string
): PlacedSymbol[] => {

    const radius = size / 2;
    const cardSeed = hashString(cardId);

    // deterministic shuffle
    const shuffled = [...symbols].sort((a, b) => {
        return (
            seededRandom(cardSeed + a * 13) -
            seededRandom(cardSeed + b * 17)
        );
    });

    const placed: PlacedSymbol[] = [];

    const outerCount = symbols.length - 1;

    // ─────────────────────────────
    // CENTER MODES
    // 0 => true center
    // 1 => center-left
    // 2 => center-right
    // ─────────────────────────────

    const centerMode = cardSeed % 3;

    shuffled.forEach((sid, idx) => {

        const seed =
            cardSeed +
            sid * 999 +
            idx * 777;

        const rand = (n: number) =>
            seededRandom(seed + n);

        let x = 0;
        let y = 0;
        let iconSize = 0;

        // ─────────────────────────────
        // CENTER SYMBOL
        // ─────────────────────────────

        if (idx === 0) {

            let centerX = 0;

            iconSize =
                size * (
                    0.25 +
                    rand(3) * 0.03
                );

            // center-left
            if (centerMode === 1) {
                centerX = -radius * 0.16;
                iconSize *= 0.9;
            }

            // center-right
            else if (centerMode === 2) {
                centerX = radius * 0.16;
                iconSize *= 0.9;
            }

            const centerAngle =
                rand(1) * Math.PI * 2;

            const centerDist =
                radius * (
                    0.02 +
                    rand(2) * 0.04
                );

            x =
                centerX +
                Math.cos(centerAngle) *
                centerDist;

            y =
                Math.sin(centerAngle) *
                centerDist;

            // bigger main symbol
        }

        // ─────────────────────────────
        // OUTER SYMBOLS
        // ─────────────────────────────

        else {

            const outerIndex = idx - 1;

            const sectorAngle =
                (Math.PI * 2) / outerCount;

            const angle =
                outerIndex * sectorAngle +
                (rand(4) - 0.5) *
                sectorAngle *
                0.16;

            // ─────────────────────────
            // RADIUS STRATEGY
            // ─────────────────────────

            let ringRadius =
                radius * 0.68;

            // if center-left,
            // left-side icons go farther
            if (centerMode === 1) {

                const isLeftSide =
                    Math.cos(angle) < 0;

                if (isLeftSide) {
                    ringRadius =
                        radius * 0.78;
                }
            }

            // if center-right,
            // right-side icons go farther
            else if (centerMode === 2) {

                const isRightSide =
                    Math.cos(angle) > 0;

                if (isRightSide) {
                    ringRadius =
                        radius * 0.78;
                }
            }

            // if exact center,
            // all symbols farther
            else {

                ringRadius =
                    radius * 0.74;
            }

            // tiny radial jitter
            const dist =
                ringRadius +
                radius *
                (
                    (rand(5) - 0.5) * 0.05
                );

            // ─────────────────────────
            // ICON SIZE STRATEGY
            // ─────────────────────────

            iconSize =
                size * (
                    0.135 +
                    rand(6) * 0.05
                );
            // bigger symbols
            // near shifted center side
            if (centerMode === 1) {

                const isLeftSide =
                    Math.cos(angle) < 0;

                const isRightSide =
                    Math.cos(angle) > 0;

                if (isRightSide) {
                    iconSize *= 1.60;
                } else if (isLeftSide) {
                    iconSize *= 0.9;
                }
            }

            else if (centerMode === 2) {

                const isLeftSide =
                    Math.cos(angle) < 0;

                const isRightSide =
                    Math.cos(angle) > 0;

                if (isRightSide) {
                    iconSize *= 0.9;
                } else if (isLeftSide) {
                    iconSize *= 1.50;
                }
            }

            // keep inside boundary
            const safeDist =
                Math.min(
                    dist,
                    radius - iconSize * 0.52
                );

            x =
                Math.cos(angle) *
                safeDist;

            y =
                Math.sin(angle) *
                safeDist;
        }

        // ─────────────────────────────
        // ROTATION
        // ─────────────────────────────

        const rotation =
            (rand(7) - 0.5) * 42;

        placed.push({
            sid,
            x,
            y,
            rotation,
            iconSize,
        });
    });

    return placed;
};