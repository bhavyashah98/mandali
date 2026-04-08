import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Animated,
    ActivityIndicator,
    Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import CountryPicker, { Country, CountryCode } from 'react-native-country-picker-modal';
import { sendOTP, verifyOTP } from '../../lib/auth';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { firebaseConfig } from '../../lib/firebase';

const LoginScreen = () => {
    const login = useAuthStore((state) => state.login);
    const [step, setStep] = useState<'phone' | 'otp'>('phone');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [verificationId, setVerificationId] = useState('');

    // Country Picker State
    const [countryCode, setCountryCode] = useState<CountryCode>('IN');
    const [callingCode, setCallingCode] = useState<string>('91');
    const [isCountryPickerVisible, setCountryPickerVisible] = useState(false);

    // Fade animation value
    const fadeAnim = useRef(new Animated.Value(1)).current;

    // Recaptcha for correct mobile validation
    const recaptchaVerifier = useRef(null);

    const onSelectCountry = (country: Country) => {
        setCountryCode(country.cca2);
        setCallingCode(country.callingCode[0] || '');
        setCountryPickerVisible(false);
        if (error) setError('');
    };

    const handleNext = async () => {
        setError('');
        if (step === 'phone') {
            // Simple validation: lengths vary by country, but typical is ~10
            if (phoneNumber.length < 5) {
                setError('Please enter a valid mobile number.');
                return;
            }
            setLoading(true);
            try {
                const fullPhoneNumber = `+${callingCode}${phoneNumber}`;
                const vId = await sendOTP(fullPhoneNumber, recaptchaVerifier.current);
                setVerificationId(vId);

                Animated.sequence([
                    Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
                    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true })
                ]).start();
                setStep('otp');
            } catch (err: any) {
                setError(err.message || 'Failed to send OTP. Try again.');
            } finally {
                setLoading(false);
            }
        } else {
            if (otp.length < 4) {
                setError('Please enter the verification code.');
                return;
            }
            setLoading(true);
            try {
                await verifyOTP(verificationId, otp);
                // On success, backend returns the JWT which is stored locally, update UI state
                login();
            } catch (err: any) {
                setError(err.message || 'Invalid verification code.');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleBack = () => {
        setError('');
        Animated.sequence([
            Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true })
        ]).start();
        setStep('phone');
        setOtp('');
    };

    return (
        <SafeAreaView className="flex-1 bg-background">
            {/* required for real mobile devices instead of crashing on 'RecaptchaVerifier is not defined' */}
            <FirebaseRecaptchaVerifierModal
                ref={recaptchaVerifier}
                firebaseConfig={firebaseConfig}
                attemptInvisibleVerification={true}
            />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                {step === 'otp' && (
                    <TouchableOpacity
                        className="w-10 h-10 bg-surface-container rounded-full items-center justify-center absolute top-2 left-6 z-20"
                        onPress={handleBack}
                    >
                        <MaterialIcons name="arrow-back" size={24} color="#1c1c18" />
                    </TouchableOpacity>
                )}

                <View className="flex-1 justify-center px-6">
                    <Animated.View style={{ opacity: fadeAnim }}>
                        {step === 'phone' ? (
                            <View className="items-center w-full">
                                {/* Logo Text & Backing Blob */}
                                <View className="relative items-center justify-center mt-6 mb-8 h-24">
                                    <View className="absolute w-[200px] h-[200px] rounded-full bg-primary opacity-5 -left-12 -top-16" />
                                    <View className="absolute w-[140px] h-[140px] rounded-full bg-primary opacity-10 -right-6 top-0" />
                                    <Text className="text-primary font-headline-bold-italic text-[42px] z-10">
                                        Mandali
                                    </Text>
                                </View>

                                {/* Typography Hub */}
                                <View className="items-center mb-10 w-full">
                                    <Text className="font-headline-bold text-[28px] text-on-surface mb-2 tracking-tight">
                                        Welcome to Mandali
                                    </Text>
                                    <Text className="font-body-regular text-on-surface-variant text-[15px]">
                                        Enter your number to join your group
                                    </Text>
                                </View>

                                {/* Inputs Section */}
                                <View className="flex-row mb-2 w-full">
                                    {/* Code Field */}
                                    <View className="mr-3 w-[100px]">
                                        <Text className="font-body-bold text-[#594048] text-xs mb-2 ml-1 opacity-70">Code</Text>
                                        <TouchableOpacity
                                            onPress={() => setCountryPickerVisible(true)}
                                            className={`bg-surface-container-high h-[52px] rounded-2xl flex-row items-center px-4 justify-between border ${error ? 'border-error' : 'border-transparent'}`}
                                        >
                                            <Text className="font-body-bold text-on-surface text-[15px]">+{callingCode}</Text>
                                            <MaterialIcons name="keyboard-arrow-down" size={20} color="#1c1c18" />
                                        </TouchableOpacity>

                                        {isCountryPickerVisible && (
                                            <CountryPicker
                                                withFilter
                                                withFlag
                                                withAlphaFilter
                                                withCallingCode
                                                withEmoji
                                                onSelect={onSelectCountry}
                                                onClose={() => setCountryPickerVisible(false)}
                                                visible={isCountryPickerVisible}
                                                countryCode={countryCode}
                                                translation="common"
                                                containerButtonStyle={{ display: 'none' }}
                                                theme={{
                                                    fontFamily: 'System',
                                                    primaryColor: '#fdf9f3',
                                                    backgroundColor: '#fdf9f3',
                                                    onBackgroundTextColor: '#1c1c18',
                                                }}
                                            />
                                        )}
                                    </View>

                                    {/* Phone Number Field */}
                                    <View className="flex-1">
                                        <Text className="font-body-bold text-[#594048] text-xs mb-2 ml-1 opacity-70">Phone Number</Text>
                                        <View className={`bg-surface-container-high h-[52px] rounded-2xl px-5 justify-center border ${error ? 'border-error' : 'border-transparent'}`}>
                                            <TextInput
                                                style={{ paddingVertical: 0, margin: 0, height: '100%' }}
                                                className="font-body-medium text-[16px] text-on-surface opacity-80 w-full"
                                                textAlignVertical="center"
                                                placeholder="00000 00000"
                                                placeholderTextColor="#a09d96"
                                                keyboardType="phone-pad"
                                                maxLength={15}
                                                value={phoneNumber}
                                                onChangeText={(text) => {
                                                    setPhoneNumber(text);
                                                    if (error) setError('');
                                                }}
                                            />
                                        </View>
                                    </View>
                                </View>
                                {/* Phone Validation Error */}
                                {error && step === 'phone' ? (
                                    <Text className="text-error font-body-medium text-xs w-full ml-2 mb-6">{error}</Text>
                                ) : <View className="mb-6 h-4" />}
                            </View>
                        ) : (
                            <View className="items-center w-full mb-10 mt-10">
                                <Text className="font-headline-bold text-[32px] text-on-surface mb-2">
                                    Verify your number
                                </Text>
                                <Text className="font-body-regular text-on-surface-variant text-base mb-10 text-center px-4">
                                    Enter the code we just sent to +{callingCode} {phoneNumber}
                                </Text>
                                <View className={`w-full bg-surface-container-high h-[60px] rounded-2xl px-5 justify-center border ${error ? 'border-error' : 'border-transparent'}`}>
                                    <TextInput
                                        className="font-body-bold text-3xl text-center text-primary tracking-[0.6em]"
                                        placeholder="······"
                                        placeholderTextColor="#e1bdc8"
                                        keyboardType="number-pad"
                                        maxLength={6}
                                        value={otp}
                                        onChangeText={(text) => {
                                            setOtp(text);
                                            if (error) setError('');
                                        }}
                                        autoFocus
                                    />
                                </View>
                                {/* OTP Validation Error */}
                                {error && step === 'otp' ? (
                                    <Text className="text-error font-body-medium text-xs w-full text-center mt-2">{error}</Text>
                                ) : null}
                                <TouchableOpacity className="items-center mt-6">
                                    <Text className="font-body-medium text-primary">Resend Code</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Submit Button */}
                        <TouchableOpacity
                            className="w-full h-14 mt-2 rounded-full items-center justify-center flex-row shadow-md shadow-primary/30 bg-primary"
                            onPress={handleNext}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text className="font-body-bold text-lg text-white">
                                    {step === 'phone' ? 'Send OTP' : 'Verify & Continue'}
                                </Text>
                            )}
                            {!loading && (
                                <MaterialIcons name="arrow-forward" size={20} color="white" style={{ marginLeft: 8 }} />
                            )}
                        </TouchableOpacity>

                        {/* Bottom Avatars Section */}
                        {step === 'phone' && (
                            <View className="items-center mt-12 mb-4">
                                <View className="flex-row">
                                    <Image source={{ uri: 'https://randomuser.me/api/portraits/women/44.jpg' }} className="w-[38px] h-[38px] rounded-full border-2 border-background" />
                                    <Image source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }} className="w-[38px] h-[38px] rounded-full border-2 border-background -ml-3" />
                                    <Image source={{ uri: 'https://randomuser.me/api/portraits/women/68.jpg' }} className="w-[38px] h-[38px] rounded-full border-2 border-background -ml-3" />
                                    <View className="w-[38px] h-[38px] rounded-full border-2 border-background bg-[#e8e4de] -ml-3 items-center justify-center">
                                        <Text className="text-[#594048] text-[10px] font-body-bold opacity-80">+2k</Text>
                                    </View>
                                </View>
                                <Text className="text-[#594048] text-[9px] font-body-bold tracking-[0.18em] mt-4 uppercase opacity-80">
                                    2000+ Groups on Mandali
                                </Text>
                            </View>
                        )}
                    </Animated.View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default LoginScreen;
