/**
 * @fileoverview Tambola/Housie Ticket Generator
 * 
 * This module provides functionality to generate standard Tambola tickets
 * and draw sequences following official game rules.
 * 
 * @author Vishal Goyal
 * @version 4.1.0
 * @license ISC
 */

// Constants for game configuration
const TICKET_CONFIG = {
  ROWS: 3,
  COLUMNS: 9,
  NUMBERS_PER_ROW: 5,
  BLANKS_PER_ROW: 4,
  MIN_NUMBER: 1,
  MAX_NUMBER: 90,
  NUMBERS_PER_COLUMN_MIN: 1,
  NUMBERS_PER_COLUMN_MAX: 3,
};

// Column range configuration
const COLUMN_RANGES = [
  { min: 1, max: 9 },
  { min: 10, max: 19 },
  { min: 20, max: 29 },
  { min: 30, max: 39 },
  { min: 40, max: 49 },
  { min: 50, max: 59 },
  { min: 60, max: 69 },
  { min: 70, max: 79 },
  { min: 80, max: 90 },
];

/**
 * Generates a random integer between min and max (inclusive)
 * 
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (inclusive)
 * @returns {number} Random integer between min and max
 */
const randomInteger = (min: number, max: number): number => {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  return Math.floor(Math.random() * (maxFloored - minCeiled + 1)) + minCeiled;
};

/**
 * Generates an array of unique random numbers
 */
const generateUniqueRandomNumbers = (min: number, max: number, count: number, sort = true): number[] => {
  const numbers = new Set<number>();

  while (numbers.size < count) {
    const randomNum = randomInteger(min, max);
    numbers.add(randomNum);
  }

  const result = Array.from(numbers);
  return sort ? result.sort((a, b) => a - b) : result;
};

/**
 * Validates if a ticket follows Tambola rules
 */
const validateTicket = (ticket: number[][]): boolean => {
  for (let rowIndex = 0; rowIndex < TICKET_CONFIG.ROWS; rowIndex += 1) {
    const row = ticket[rowIndex];
    const blankCount = row.filter(cell => cell === 0).length;

    if (blankCount !== TICKET_CONFIG.BLANKS_PER_ROW) {
      return true; // Needs regeneration
    }
  }

  return false; // Valid ticket
};

/**
 * Creates an empty ticket template
 */
const createEmptyTicket = (): number[][] => {
  return Array.from({ length: TICKET_CONFIG.ROWS }, () =>
    Array(TICKET_CONFIG.COLUMNS).fill(0)
  );
};

/**
 * Generates a valid Tambola ticket following official game rules
 */
export const generateTicket = (): number[][] => {
  let isValidTicket = false;
  let ticket: number[][] = [];

  while (!isValidTicket) {
    // Initialize ticket structure
    ticket = createEmptyTicket();

    // Determine how many numbers each column will have (1-3)
    const columnNumberCounts = Array(TICKET_CONFIG.COLUMNS).fill(2);
    const columnsWithOneNumber = generateUniqueRandomNumbers(0, 8, 3);

    columnsWithOneNumber.forEach(columnIndex => {
      columnNumberCounts[columnIndex] = 1;
    });

    // Generate positions for numbers in each column
    const columnPositions = columnNumberCounts.map(count =>
      generateUniqueRandomNumbers(0, 2, count)
    );

    // Fill ticket with numbers
    columnPositions.forEach((positions, columnIndex) => {
      const { min, max } = COLUMN_RANGES[columnIndex];
      const numbers = generateUniqueRandomNumbers(min, max, positions.length);

      positions.forEach((rowIndex, numberIndex) => {
        ticket[rowIndex][columnIndex] = numbers[numberIndex];
      });
    });

    // Validate ticket
    isValidTicket = !validateTicket(ticket);
  }

  return ticket;
};

/**
 * Generates a random draw sequence for Tambola game
 */
export const getDrawSequence = (): number[] => {
  return generateUniqueRandomNumbers(
    TICKET_CONFIG.MIN_NUMBER,
    TICKET_CONFIG.MAX_NUMBER,
    TICKET_CONFIG.MAX_NUMBER,
    false // Don't sort - keep random order
  );
};

/**
 * ─── Prize Verification Utils ─────────────────────────────────────────────────
 */

/** Check if all non-zero numbers in a set are present in calledNumbers */
export const allPresent = (numbers: any[], called: number[]): boolean => {
  const targets = numbers.map(n => Number(n)).filter(n => n > 0);
  if (targets.length === 0) return false;
  return targets.every(n => called.includes(n));
};

/** Top, Middle, or Bottom Line */
export const isLine = (ticket: number[][], rowIdx: number, called: number[]): boolean => {
  return allPresent(ticket[rowIdx], called);
};

/** Full House: All 15 numbers */
export const isFullHouse = (ticket: number[][], called: number[]): boolean => {
  const flatNumbers = ticket.flat().map(n => Number(n)).filter(n => n > 0);
  const missing = flatNumbers.filter(n => !called.includes(n));
  
  if (missing.length > 0) {
    console.log(`[Validation] ❌ Full House failed. Missing numbers: ${missing.join(', ')}`);
    return false;
  }
  
  console.log(`[Validation] ✅ Full House verified!`);
  return true;
};

/** Early 5 or Early 7: Any X numbers marked */
export const isEarly = (ticket: any[][], count: number, called: number[]): boolean => {
  const flatNumbers = ticket.flat().map(n => Number(n)).filter(n => n > 0);
  const markedNumbers = flatNumbers.filter(n => called.includes(n));
  const markedCount = markedNumbers.length;
  
  if (markedCount < count) {
    console.log(`[Validation] ❌ Early ${count} failed. Only ${markedCount} marked: ${markedNumbers.join(', ')}`);
  }
  
  return markedCount >= count;
};

/** Four Corners: 1st and last of top row, 1st and last of bottom row */
export const isFourCorners = (ticket: any[][], called: number[]): boolean => {
  const topRow = ticket[0].map(n => Number(n)).filter(n => n > 0);
  const bottomRow = ticket[2].map(n => Number(n)).filter(n => n > 0);

  const corners = [
    topRow[0],
    topRow[topRow.length - 1],
    bottomRow[0],
    bottomRow[bottomRow.length - 1]
  ];

  const missing = corners.filter(n => !called.includes(n));
  if (missing.length > 0) {
    console.log(`[Validation] ❌ Four Corners failed. Missing: ${missing.join(', ')}`);
    return false;
  }

  return true;
};

/** Star: Four Corners + Center Number */
export const isStar = (ticket: any[][], called: number[]): boolean => {
  if (!isFourCorners(ticket, called)) return false;

  const midRow = ticket[1].map(n => Number(n)).filter(n => n > 0);
  const centerNum = midRow[2]; // Middle of 5 numbers

  if (!called.includes(centerNum)) {
    console.log(`[Validation] ❌ Star failed. Center number ${centerNum} missing.`);
    return false;
  }

  return true;
};

/** Six Corners: 1st and last of all three rows */
export const isSixCorners = (ticket: any[][], called: number[]): boolean => {
  const corners = ticket.flatMap(row => {
    const nums = row.map(n => Number(n)).filter(n => n > 0);
    return [nums[0], nums[nums.length - 1]];
  });
  const missing = corners.filter(n => !called.includes(n));
  if (missing.length > 0) {
    console.log(`[Validation] ❌ Six Corners failed. Missing: ${missing.join(', ')}`);
    return false;
  }
  return true;
};

/** Center (Laddu): Middle number of the middle row */
export const isCenter = (ticket: any[][], called: number[]): boolean => {
  const midRow = ticket[1].map(n => Number(n)).filter(n => n > 0);
  const centerNum = midRow[2];
  if (!called.includes(centerNum)) {
    console.log(`[Validation] ❌ Center failed. Number ${centerNum} missing.`);
    return false;
  }
  return true;
};

/** Odd/Even: All odd or all even numbers marked */
export const isOddEven = (ticket: any[][], called: number[]): { won: boolean; type?: 'odd' | 'even' } => {
  const flatNumbers = ticket.flat().map(n => Number(n)).filter(n => n > 0);
  const oddNumbers = flatNumbers.filter(n => n % 2 !== 0);
  const evenNumbers = flatNumbers.filter(n => n % 2 === 0);

  if (oddNumbers.every(n => called.includes(n))) return { won: true, type: 'odd' };
  if (evenNumbers.every(n => called.includes(n))) return { won: true, type: 'even' };

  console.log(`[Validation] ❌ Odd/Even failed.`);
  return { won: false };
};

/** Pyramid Pattern */
export const isPyramid = (ticket: any[][], called: number[]): boolean => {
  const row0 = ticket[0].map(n => Number(n)).filter(n => n > 0);
  const row1 = ticket[1].map(n => Number(n)).filter(n => n > 0);
  const row2 = ticket[2].map(n => Number(n)).filter(n => n > 0);

  const pyramidNums = [
    row0[2],           // Top: 3rd
    row1[1], row1[3],  // Mid: 2nd & 4th
    row2[0], row2[2], row2[4] // Bottom: 1st, 3rd & 5th
  ];

  const missing = pyramidNums.filter(n => !called.includes(n));
  if (missing.length > 0) {
    console.log(`[Validation] ❌ Pyramid failed. Missing: ${missing.join(', ')}`);
    return false;
  }
  return true;
};

/** BP (Blood Pressure) / Temperature: Highest and Lowest numbers on ticket */
export const isBP = (ticket: any[][], called: number[]): boolean => {
  const flatNumbers = ticket.flat().map(n => Number(n)).filter(n => n > 0);
  const min = Math.min(...flatNumbers);
  const max = Math.max(...flatNumbers);

  const missing = [min, max].filter(n => !called.includes(n));
  if (missing.length > 0) {
    console.log(`[Validation] ❌ BP failed. Missing: ${missing.join(', ')}`);
    return false;
  }
  return true;
};

/** 
 * Master verification function
 * @param gameMode 'classic', 'plus_one', 'minus_one', 'reverse'
 */
export const checkPrize = (prizeId: string, ticket: number[][], called: number[], gameMode: string = 'classic'): boolean => {
  if (!called || called.length === 0) return false;

  const lastRaw = called[called.length - 1];

  /**
   * Transforms a called number into the number a player is allowed to mark.
   */
  const transform = (rawN: any): number => {
    const n = Number(rawN);
    if (gameMode === 'plus_one') return n + 1 > 90 ? 1 : n + 1;
    if (gameMode === 'minus_one') return n - 1 < 1 ? 90 : n - 1;
    if (gameMode === 'reverse') {
      const units = n % 10;
      const tens = Math.floor(n / 10);
      const rev = units * 10 + tens;
      return (rev >= 1 && rev <= 90) ? rev : -1;
    }
    return n;
  };

  const lastEffective = transform(lastRaw);
  console.log(`[Validation] 🔍 Checking ${prizeId} for Mode: ${gameMode}`);
  console.log(`[Validation] 📍 Last called: ${lastRaw} -> Effective: ${lastEffective}`);

  // If the transformed last number is invalid, no claim can be made on it
  if (lastEffective < 1 || lastEffective > 90) {
    console.log(`[Validation] ❌ Invalid effective number.`);
    return false;
  }

  // The last called number MUST be part of the ticket's marked numbers for this prize
  const flatTicket = ticket.flat().map(n => Number(n)).filter(n => n > 0);
  if (!flatTicket.includes(lastEffective)) {
    console.log(`[Validation] ❌ Effective number ${lastEffective} not in ticket numbers: ${flatTicket.join(', ')}`);
    return false;
  }

  // All called numbers transformed
  const effectiveCalled = (called || []).map(n => transform(n)).filter(n => n >= 1 && n <= 90);

  // Helper to check if a specific set of numbers includes the winning trigger
  const includesTrigger = (nums: number[]) => nums.includes(lastEffective);

  if (prizeId === 'top_line') {
    const res = isLine(ticket, 0, effectiveCalled) && includesTrigger(ticket[0]);
    if (!res) console.log(`[Validation] ❌ Top Line failed.`);
    return res;
  } else if (prizeId === 'middle_line') {
    const res = isLine(ticket, 1, effectiveCalled) && includesTrigger(ticket[1]);
    if (!res) console.log(`[Validation] ❌ Middle Line failed.`);
    return res;
  } else if (prizeId === 'bottom_line') {
    const res = isLine(ticket, 2, effectiveCalled) && includesTrigger(ticket[2]);
    if (!res) console.log(`[Validation] ❌ Bottom Line failed.`);
    return res;
  } else if (prizeId.startsWith('full_house')) {
    return isFullHouse(ticket, effectiveCalled) && includesTrigger(flatTicket);
  }

  switch (prizeId) {
    case 'early_5':
      return isEarly(ticket, 5, effectiveCalled) && includesTrigger(flatTicket);
    case 'early_7':
      return isEarly(ticket, 7, effectiveCalled) && includesTrigger(flatTicket);
    case 'four_corners': {
      const topRow = ticket[0].filter(n => n > 0);
      const bottomRow = ticket[2].filter(n => n > 0);
      const corners = [topRow[0], topRow[topRow.length - 1], bottomRow[0], bottomRow[bottomRow.length - 1]];
      return isFourCorners(ticket, effectiveCalled) && includesTrigger(corners);
    }
    case 'star': {
      const topRow = ticket[0].filter(n => n > 0);
      const bottomRow = ticket[2].filter(n => n > 0);
      const midRow = ticket[1].filter(n => n > 0);
      const cornersAndCenter = [topRow[0], topRow[topRow.length - 1], bottomRow[0], bottomRow[bottomRow.length - 1], midRow[2]];
      return isStar(ticket, effectiveCalled) && includesTrigger(cornersAndCenter);
    }
    case 'six_corners': {
      const corners = ticket.flatMap(row => {
        const nums = row.filter(n => n > 0);
        return [nums[0], nums[nums.length - 1]];
      });
      return isSixCorners(ticket, effectiveCalled) && includesTrigger(corners);
    }
    case 'center': {
      const midRow = ticket[1].filter(n => n > 0);
      return isCenter(ticket, effectiveCalled) && includesTrigger([midRow[2]]);
    }
    case 'odd_even': {
      const res = isOddEven(ticket, effectiveCalled);
      if (!res.won) return false;
      const targets = flatTicket.filter(n => res.type === 'odd' ? n % 2 !== 0 : n % 2 === 0);
      return includesTrigger(targets);
    }
    case 'pyramid': {
      const row0 = ticket[0].filter(n => n > 0);
      const row1 = ticket[1].filter(n => n > 0);
      const row2 = ticket[2].filter(n => n > 0);
      const pyramidNums = [row0[2], row1[1], row1[3], row2[0], row2[2], row2[4]];
      return isPyramid(ticket, effectiveCalled) && includesTrigger(pyramidNums);
    }
    case 'bp': {
      const min = Math.min(...flatTicket);
      const max = Math.max(...flatTicket);
      return isBP(ticket, effectiveCalled) && includesTrigger([min, max]);
    }
    default:
      return false;
  }
};

export default {
  generateTicket,
  getDrawSequence,
  checkPrize,
  isLine,
  isFullHouse,
  isEarly,
  isFourCorners,
  isStar
};
