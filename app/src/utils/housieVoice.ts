import * as Speech from 'expo-speech';

const HOUSIE_NICKNAMES: Record<number, string[]> = {
    1: ["Kelly's eye 1", "Butter finger 1", "Single Digit 1"],
    2: ["One little duck 2", "Do hans 2", "Single Digit 2"],
    3: ["Cup of tea 3", "Teen tigada 3", "Single Digit 3"],
    4: ["Knock at the door 4", "Darwaza khol 4", "Single Digit 4"],
    5: ["Man alive 5", "High five 5", "Single Digit 5"],
    6: ["Half a dozen 6", "Chhakka maar 6", "Single Digit 6"],
    7: ["Lucky seven 7", "Saat samundar 7", "Single Digit 7"],
    8: ["One fat lady 8", "Garden gate 8", "Single Digit 8"],
    9: ["Doctor's orders 9", "Cloud nine 9", "Single Digit 9"],
    10: ["Uncle Ben 10", "Dus ka dum 10", "1 0 10"],
    11: ["Legs eleven 11", "Two beautiful legs 11", "1 1 11"],
    12: ["One dozen 12", "Monkey's cousin 12", "1 2 12"],
    13: ["Unlucky for some 13", "Bakers dozen 13", "1 3 13"],
    14: ["Valentine's Day 14", "Pyaar wala number 14", "1 4 14"],
    15: ["Young and keen 15", "Sweet fifteen 15", "1 5 15"],
    16: ["Sweet sixteen 16", "Solah singaar 16", "1 6 16"],
    17: ["Dancing queen 17", "Often been 17", "1 7 17"],
    18: ["Coming of age 18", "Voting age 18", "1 8 18"],
    19: ["Goodbye teens 19", "Last teenage 19", "1 9 19"],
    20: ["One score 20", "Blind twenty 20", "2 0 20"],
    21: ["Key of the door 21", "Royal salute 21", "2 1 21"],
    22: ["Two little ducks 22", "Quack quack 22", "2 2 22"],
    23: ["Thee and me 23", "You and me 23", "2 3 23"],
    24: ["Two dozen 24", "Clock number 24", "2 4 24"],
    25: ["Silver jubilee 25", "Duck and dive 25", "2 5 25"],
    26: ["Half a deck 26", "Pick and mix 26", "2 6 26"],
    27: ["Gateway to heaven 27", "Duck and a crutch 27", "2 7 27"],
    28: ["In a state 28", "Overweight 28", "2 8 28"],
    29: ["Rise and shine 29", "In your prime 29", "2 9 29"],
    30: ["Dirty thirty 30", "Flirty thirty 30", "3 0 30"],
    31: ["Get up and run 31", "Baskin Robbins 31", "3 1 31"],
    32: ["Buckle my shoe 32", "Toothpaste number 32", "3 2 32"],
    33: ["All the threes 33", "Dirty knee 33", "3 3 33"],
    34: ["Ask for more 34", "Dil maange more 34", "3 4 34"],
    35: ["Jump and jive 35", "Dance and jive 35", "3 5 35"],
    36: ["Three dozen 36", "Six times six 36", "3 6 36"],
    37: ["More than heaven 37", "Lucky number 37", "3 7 37"],
    38: ["Christmas cake 38", "Sweet treat 38", "3 8 38"],
    39: ["Steps number 39", "Fine wine 39", "3 9 39"],
    40: ["Life begins at 40", "Naughty forty 40", "4 0 40"],
    41: ["Time for fun 41", "Life's begun 41", "4 1 41"],
    42: ["Winnie the Pooh 42", "Answer to life 42", "4 2 42"],
    43: ["Down on your knees 43", "Answer please 43", "4 3 43"],
    44: ["All the fours 44", "Droopy drawers 44", "4 4 44"],
    45: ["Halfway there 45", "Halfway house 45", "4 5 45"],
    46: ["Up to tricks 46", "Fix it 46", "4 6 46"],
    47: ["Four and seven 47", "Lucky jodi 47", "4 7 47"],
    48: ["Four dozen 48", "Strong number 48", "4 8 48"],
    49: ["PC 49", "Rise and shine 49", "4 9 49"],
    50: ["Half a century 50", "Golden jubilee 50", "5 0 50"],
    51: ["Tweak of the thumb 51", "Pure fun 51", "5 1 51"],
    52: ["Weeks in a year 52", "Pack of cards 52", "5 2 52"],
    53: ["Stuck in a tree 53", "Monkey number 53", "5 3 53"],
    54: ["Clean the floor 54", "House more 54", "5 4 54"],
    55: ["All the fives 55", "Snakes alive 55", "5 5 55"],
    56: ["Was she worth it 56", "Paisa vasool 56", "5 6 56"],
    57: ["Heinz varieties 57", "Sauce number 57", "5 7 57"],
    58: ["Make them wait 58", "Late for the gate 58", "5 8 58"],
    59: ["Brighton line 59", "The finishing line 59", "5 9 59"],
    60: ["Five dozen 60", "Three score 60", "6 0 60"],
    61: ["Bakers bun 61", "Bun maska 61", "6 1 61"],
    62: ["Turn on the screw 62", "Tight screw 62", "6 2 62"],
    63: ["Tickle me 63", "Masti number 63", "6 3 63"],
    64: ["Red raw 64", "Almost retired 64", "6 4 64"],
    65: ["Old age pension 65", "Retirement age 65", "6 5 65"],
    66: ["Clickety click 66", "Chhakka chhakka 66", "6 6 66"],
    67: ["Stairway to heaven 67", "Made in heaven 67", "6 7 67"],
    68: ["Saving grace 68", "Check your face 68", "6 8 68"],
    69: ["Anyway up 69", "The meal for two 69", "6 9 69"],
    70: ["Three score and ten 70", "Blind seventy 70", "7 0 70"],
    71: ["Bang the drum 71", "Setting fun 71", "7 1 71"],
    72: ["Six dozen 72", "Parity number 72", "7 2 72"],
    73: ["Queen bee 73", "Honey bee 73", "7 3 73"],
    74: ["Candy store 74", "Dance floor 74", "7 4 74"],
    75: ["Strive and thrive 75", "Still alive 75", "7 5 75"],
    76: ["Trombones 76", "Seven and six 76", "7 6 76"],
    77: ["Sunset strip 77", "Two walking sticks 77", "7 7 77"],
    78: ["Heaven's gate 78", "Lucky fate 78", "7 8 78"],
    79: ["One more time 79", "Beat the line 79", "7 9 79"],
    80: ["Eight and blank 80", "Gandhi's spectacles 80", "8 0 80"],
    81: ["Fat lady with a crutch 81", "Corner number 81", "8 1 81"],
    82: ["Fat lady with a duck 82", "Seedha number 82", "8 2 82"],
    83: ["Ethel's ear 83", "Chai time 83", "8 3 83"],
    84: ["Seven dozen 84", "Heavy set 84", "8 4 84"],
    85: ["Staying alive 85", "Energy high 85", "8 5 85"],
    86: ["Between the sticks 86", "Cricket score 86", "8 6 86"],
    87: ["Fat lady with a cane 87", "Torquay in Devon 87", "8 7 87"],
    88: ["Two fat ladies 88", "8 8 88"],
    89: ["Nearly there 89", "Almost the end 89", "8 9 89"],
    90: ["Top of the house 90", "End of the line 90", "9 0 90"]
};

export const announceHousieNumber = (num: number | string) => {
    const n = typeof num === 'string' ? parseInt(num, 10) : num;
    if (isNaN(n)) return;

    const numStr = n.toString();

    // Reverted to old logic for clarity
    if (n < 10) {
        Speech.speak(`Single Digit ${numStr}`, {
            rate: 0.85,
            pitch: 1.0,
        });
        return;
    }

    const separatedDigits = numStr.split('').join(' ');
    const finalSpeech = `${separatedDigits}, ${numStr}`;

    Speech.speak(finalSpeech, {
        rate: 0.85,
        pitch: 1.0,
    });
};
