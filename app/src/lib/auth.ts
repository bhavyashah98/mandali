import { getAuth, signInWithPhoneNumber, type FirebaseAuthTypes } from '@react-native-firebase/auth';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAppVersionHeaders } from './appVersion';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

// Step 1 — Send OTP using native Firebase (uses APNs on iOS, no ReCaptcha)
export const sendOTP = async (phoneNumber: string): Promise<FirebaseAuthTypes.ConfirmationResult> => {
    const confirmation = await signInWithPhoneNumber(getAuth(), phoneNumber);
    return confirmation;
};

// Step 2 — Verify OTP
export const verifyOTP = async (
    confirmation: FirebaseAuthTypes.ConfirmationResult,
    otp: string
) => {
    const result = await confirmation.confirm(otp);
    if (!result || !result.user) throw new Error('Verification failed.');

    // Get Firebase ID token
    const firebaseToken = await result.user.getIdToken();

    // Step 3 — Send to backend
    const response = await axios.post(`${API_URL}/auth/verify`, {
        firebaseToken,
        phone: result.user.phoneNumber,
    }, {
        headers: getAppVersionHeaders(),
    });

    // Save JWT token
    await AsyncStorage.setItem('mandali_token', response.data.token);
    await AsyncStorage.setItem('mandali_user', JSON.stringify(response.data.user));

    return response.data;
};
