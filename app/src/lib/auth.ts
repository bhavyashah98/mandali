import { auth } from './firebase';
import {
    PhoneAuthProvider,
    signInWithCredential
} from 'firebase/auth';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

// Step 1 — Send OTP
export const sendOTP = async (phoneNumber: string, applicationVerifier: any) => {
    // phoneNumber must include country code e.g. +919876543210
    const provider = new PhoneAuthProvider(auth);

    const verificationId = await provider.verifyPhoneNumber(
        phoneNumber,
        applicationVerifier
    );

    return verificationId;
};

// Step 2 — Verify OTP
export const verifyOTP = async (
    verificationId: string,
    otp: string
) => {
    const credential = PhoneAuthProvider.credential(verificationId, otp);
    const result = await signInWithCredential(auth, credential);

    // Get Firebase ID token
    const firebaseToken = await result.user.getIdToken();

    console.log(firebaseToken);
    // Step 3 — Send to your backend
    const response = await axios.post(`${API_URL}/auth/verify`, {
        firebaseToken,
        phone: result.user.phoneNumber,
    });

    // Save your app's JWT token
    await AsyncStorage.setItem('mandali_token', response.data.token);
    await AsyncStorage.setItem('mandali_user',
        JSON.stringify(response.data.user)
    );

    return response.data;
};