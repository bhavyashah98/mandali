import * as Speech from 'expo-speech';

/**
 * Announces a Housie/Tambola number in a professional style.
 * Example: Input 43 -> Speaks "4 3, 43" (Four Three, Forty Three)
 */
export const announceHousieNumber = (num: number | string) => {
    const n = typeof num === 'string' ? parseInt(num, 10) : num;
    if (isNaN(n)) return;

    const numStr = n.toString();

    // For single digits (1-9), just announce once
    if (n < 10) {
        Speech.speak(`Single Digit ${numStr}`, {
            rate: 0.85,
            pitch: 1.0,
        });
        return;
    }

    // 1. Separate digits for the "First Digit, Second Digit" call
    const separatedDigits = numStr.split('').join(' ');

    // 2. Format: "4 3, 43"
    // The comma provides a natural pause
    const finalSpeech = `${separatedDigits}, ${numStr}`;

    Speech.speak(finalSpeech, {
        rate: 0.85,
        pitch: 1.0,
    });
};
