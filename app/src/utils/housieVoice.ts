import * as Speech from 'expo-speech';


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
