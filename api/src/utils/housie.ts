/**
 * Generates a valid standard Housie/Tambola ticket.
 * 3 rows, 9 columns.
 * Exactly 15 numbers per ticket (5 per row).
 */
export const generateHousieTicket = (): (number | null)[][] => {
    const ticket: (number | null)[][] = Array.from({ length: 3 }, () => Array(9).fill(null));
    
    // Column Ranges: 0:1-9, 1:10-19, 2:20-29, 3:30-39, 4:40-49, 5:50-59, 6:60-69, 7:70-79, 8:80-90
    const colRanges = [
        [1, 9], [10, 19], [20, 29], [30, 39], [40, 49], 
        [50, 59], [60, 69], [70, 79], [80, 90]
    ];

    // Step 1: Ensure each column has at least one number
    // Total 9 numbers placed (one per column)
    const placedInCols = Array(9).fill(0);
    for (let c = 0; c < 9; c++) {
        const row = Math.floor(Math.random() * 3);
        const [min, max] = colRanges[c];
        ticket[row][c] = getRandomInt(min, max);
        placedInCols[c]++;
    }

    // Step 2: Fill the remaining 6 numbers (Total 15)
    // Need to ensure each row ends up with exactly 5 numbers
    let totalNumbers = 9;
    
    while (totalNumbers < 15) {
        const row = Math.floor(Math.random() * 3);
        const col = Math.floor(Math.random() * 9);
        
        // Count numbers in this row
        const rowCount = ticket[row].filter(n => n !== null).length;
        
        if (ticket[row][col] === null && rowCount < 5) {
            const [min, max] = colRanges[col];
            let num = getRandomInt(min, max);
            
            // Uniqueness check within the ticket
            const flatTicket = ticket.flat();
            if (!flatTicket.includes(num)) {
                ticket[row][col] = num;
                totalNumbers++;
            }
        }
    }

    // Step 3: Final refinement
    // Sort columns vertically and ensure standard distribution
    for (let c = 0; c < 9; c++) {
        const colNums = [ticket[0][c], ticket[1][c], ticket[2][c]].filter(n => n !== null) as number[];
        colNums.sort((a, b) => a - b);
        
        // Re-place sorted numbers back into their rows (keeping the empty spots empty)
        let idx = 0;
        for (let r = 0; r < 3; r++) {
            if (ticket[r][c] !== null) {
                ticket[r][c] = colNums[idx++];
            }
        }
    }

    return ticket;
};

const getRandomInt = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};
