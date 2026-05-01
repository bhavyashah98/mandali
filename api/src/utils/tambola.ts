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
const allPresent = (numbers: number[], called: number[]) => {
  const targets = numbers.filter(n => n > 0);
  if (targets.length === 0) return false;
  return targets.every(n => called.includes(n));
};

/** Top, Middle, or Bottom Line */
export const isLine = (ticket: number[][], rowIdx: number, called: number[]): boolean => {
  return allPresent(ticket[rowIdx], called);
};

/** Full House: All 15 numbers */
export const isFullHouse = (ticket: number[][], called: number[]): boolean => {
  return ticket.every(row => allPresent(row, called));
};

/** Early 5 or Early 7: Any X numbers marked */
export const isEarly = (ticket: number[][], count: number, called: number[]): boolean => {
  const flatNumbers = ticket.flat().filter(n => n > 0);
  const markedCount = flatNumbers.filter(n => called.includes(n)).length;
  return markedCount >= count;
};

/** Four Corners: 1st and last of top row, 1st and last of bottom row */
export const isFourCorners = (ticket: number[][], called: number[]): boolean => {
  const topRow = ticket[0].filter(n => n > 0);
  const bottomRow = ticket[2].filter(n => n > 0);

  const corners = [
    topRow[0],
    topRow[topRow.length - 1],
    bottomRow[0],
    bottomRow[bottomRow.length - 1]
  ];

  return corners.every(n => called.includes(n));
};

/** Star: Four Corners + Center Number */
export const isStar = (ticket: number[][], called: number[]): boolean => {
  if (!isFourCorners(ticket, called)) return false;
  
  const midRow = ticket[1].filter(n => n > 0);
  const centerNum = midRow[2]; // Middle of 5 numbers
  
  return called.includes(centerNum);
};

/** Six Corners: 1st and last of all three rows */
export const isSixCorners = (ticket: number[][], called: number[]): boolean => {
  const corners = ticket.flatMap(row => {
    const nums = row.filter(n => n > 0);
    return [nums[0], nums[nums.length - 1]];
  });
  return corners.every(n => called.includes(n));
};

/** Center (Laddu): Middle number of the middle row */
export const isCenter = (ticket: number[][], called: number[]): boolean => {
  const midRow = ticket[1].filter(n => n > 0);
  return called.includes(midRow[2]);
};

/** Odd/Even: All odd or all even numbers marked */
export const isOddEven = (ticket: number[][], called: number[]): { won: boolean; type?: 'odd' | 'even' } => {
  const flatNumbers = ticket.flat().filter(n => n > 0);
  const oddNumbers = flatNumbers.filter(n => n % 2 !== 0);
  const evenNumbers = flatNumbers.filter(n => n % 2 === 0);

  if (oddNumbers.every(n => called.includes(n))) return { won: true, type: 'odd' };
  if (evenNumbers.every(n => called.includes(n))) return { won: true, type: 'even' };
  
  return { won: false };
};

/** Pyramid Pattern */
export const isPyramid = (ticket: number[][], called: number[]): boolean => {
  const row0 = ticket[0].filter(n => n > 0);
  const row1 = ticket[1].filter(n => n > 0);
  const row2 = ticket[2].filter(n => n > 0);

  const pyramidNums = [
    row0[2],           // Top: 3rd
    row1[1], row1[3],  // Mid: 2nd & 4th
    row2[0], row2[2], row2[4] // Bottom: 1st, 3rd & 5th
  ];

  return pyramidNums.every(n => called.includes(n));
};

/** BP (Blood Pressure) / Temperature: Highest and Lowest numbers on ticket */
export const isBP = (ticket: number[][], called: number[]): boolean => {
  const flatNumbers = ticket.flat().filter(n => n > 0);
  const min = Math.min(...flatNumbers);
  const max = Math.max(...flatNumbers);
  
  return called.includes(min) && called.includes(max);
};

/** 
 * Master verification function
 */
export const checkPrize = (prizeId: string, ticket: number[][], called: number[]): boolean => {
  switch (prizeId) {
    case 'top_line': return isLine(ticket, 0, called);
    case 'middle_line': return isLine(ticket, 1, called);
    case 'bottom_line': return isLine(ticket, 2, called);
    case 'full_house': return isFullHouse(ticket, called);
    case 'early_5': return isEarly(ticket, 5, called);
    case 'early_7': return isEarly(ticket, 7, called);
    case 'four_corners': return isFourCorners(ticket, called);
    case 'star': return isStar(ticket, called);
    case 'six_corners': return isSixCorners(ticket, called);
    case 'center': return isCenter(ticket, called);
    case 'odd_even': return isOddEven(ticket, called).won;
    case 'pyramid': return isPyramid(ticket, called);
    case 'bp': return isBP(ticket, called);
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
