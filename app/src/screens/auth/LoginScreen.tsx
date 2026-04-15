import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Animated,
    ActivityIndicator,
    Image,
    TouchableWithoutFeedback,
    Keyboard,
    Alert,
    ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import CountryPicker, { Country, CountryCode } from 'react-native-country-picker-modal';
import { sendOTP, verifyOTP } from '../../lib/auth';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';


const LoginScreen = () => {
    const login = useAuthStore((state) => state.login);
    const [step, setStep] = useState<'phone' | 'otp'>('phone');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [confirmationResult, setConfirmationResult] = useState<FirebaseAuthTypes.ConfirmationResult | null>(null);

    // Country Picker State
    const [countryCode, setCountryCode] = useState<CountryCode>('IN');
    const [callingCode, setCallingCode] = useState<string>('91');
    const [isCountryPickerVisible, setCountryPickerVisible] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);

    // Fade animation value
    const fadeAnim = useRef(new Animated.Value(1)).current;

    // (Recaptcha not required for Native Firebase Auth)

    const onSelectCountry = (country: Country) => {
        setCountryCode(country.cca2);
        setCallingCode(country.callingCode[0] || '');
        setCountryPickerVisible(false);
        if (error) setError('');
    };

    // Countdown Timer Logic
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [resendTimer]);

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
                const confirmation = await sendOTP(fullPhoneNumber);
                setConfirmationResult(confirmation);

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
                if (!confirmationResult) throw new Error("Missing confirmation data.");
                const response = await verifyOTP(confirmationResult, otp);
                // On success, backend returns the JWT and user data
                const { setUser, login } = useAuthStore.getState();
                setUser(response.user);
                login();
            } catch (err: any) {
                setError(err.message || 'Invalid verification code.');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleResendOTP = async () => {
        if (resendTimer > 0 || loading) return;

        setError('');
        setLoading(true);
        try {
            const fullPhoneNumber = `+${callingCode}${phoneNumber}`;
            const confirmation = await sendOTP(fullPhoneNumber);
            setConfirmationResult(confirmation);
            setResendTimer(30); // Reset to 30 seconds
            setOtp('');
            Alert.alert('Sent!', 'A new verification code has been sent.');
        } catch (err: any) {
            setError(err.message || 'Failed to resend OTP.');
        } finally {
            setLoading(false);
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
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <SafeAreaView className="flex-1 bg-background">
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

                    <ScrollView
                        contentContainerStyle={{ flexGrow: 1 }}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        className="px-6 py-10"
                    >
                        <Animated.View style={{ opacity: fadeAnim }} className="flex-1">
                            <View className="flex-1 justify-center gap-8">
                                {step === 'phone' ? (
                                    <View className="items-center w-full gap-6">
                                        {/* Brand Header - Pop-out Seal */}
                                        <View className="items-center">
                                            <View
                                                className="w-[170px] h-[170px] rounded-full bg-white items-center justify-center border-8 border-primary shadow-2xl"
                                                style={{
                                                    elevation: 24,
                                                    shadowColor: '#b30069',
                                                    shadowOffset: { width: 0, height: 10 },
                                                    shadowOpacity: 0.3,
                                                    shadowRadius: 20
                                                }}
                                            >
                                                <Image
                                                    source={require('../../../assets/icon.png')}
                                                    style={{ width: 140, height: 140, borderRadius: 70 }}
                                                    resizeMode="contain"
                                                />
                                            </View>
                                        </View>

                                        {/* Typography Hub */}
                                        <View className="items-center w-full px-2">
                                            <Text
                                                className="font-headline-bold text-primary mb-2 tracking-tight text-center w-full"
                                                style={{ fontSize: 32 }}
                                                numberOfLines={1}
                                                adjustsFontSizeToFit
                                            >
                                                Welcome to Mandali
                                            </Text>
                                            <Text className="font-body-regular text-on-surface-variant text-[15px] text-center">
                                                Join your group and start the fun
                                            </Text>
                                        </View>

                                        {/* Inputs Section */}
                                        <View className="w-full">
                                            <View className="flex-row w-full">
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

                                            {/* Phone Validation Error Space */}
                                            <View className="h-6 justify-center pl-2 mt-1">
                                                {error && step === 'phone' ? (
                                                    <Text className="text-error font-body-medium text-xs">{error}</Text>
                                                ) : null}
                                            </View>
                                        </View>
                                    </View>
                                ) : (
                                    <View className="items-center w-full gap-6">
                                        <View className="items-center mb-4">
                                            <Text className="font-headline-bold text-[32px] text-on-surface mb-2 text-center">
                                                Verify your number
                                            </Text>
                                            <Text className="font-body-regular text-on-surface-variant text-base text-center px-4">
                                                Enter the code we just sent to +{callingCode} {phoneNumber}
                                            </Text>
                                        </View>

                                        <View className="w-full items-center">
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
                                            {/* OTP Validation Error Space */}
                                            <View className="h-6 justify-center pt-2">
                                                {error && step === 'otp' ? (
                                                    <Text className="text-error font-body-medium text-xs text-center">{error}</Text>
                                                ) : null}
                                            </View>
                                            <TouchableOpacity
                                                className="items-center"
                                                onPress={handleResendOTP}
                                                disabled={resendTimer > 0 || loading}
                                            >
                                                <Text className={`font-body-medium ${resendTimer > 0 ? 'text-on-surface-variant opacity-40' : 'text-primary'}`}>
                                                    {resendTimer > 0 ? `Resend Code in ${resendTimer}s` : 'Resend Code'}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}

                                {/* Submit Button */}
                                <TouchableOpacity
                                    className="w-full h-14 rounded-full items-center justify-center flex-row shadow-md shadow-primary/30 bg-primary"
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
                            </View>

                            {/* Bottom Avatars Section - Community Social Proof */}
                            {step === 'phone' && (
                                <View className="items-center pt-8">
                                    <View className="flex-row items-center">
                                        <View className="flex-row">
                                            <Image source={{ uri: 'https://randomuser.me/api/portraits/women/44.jpg' }} className="w-[34px] h-[34px] rounded-full border-2 border-background" />
                                            <Image source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }} className="w-[34px] h-[34px] rounded-full border-2 border-background -ml-2.5" />
                                            <Image source={{ uri: 'https://randomuser.me/api/portraits/women/68.jpg' }} className="w-[34px] h-[34px] rounded-full border-2 border-background -ml-2.5" />
                                            <View className="w-[34px] h-[34px] rounded-full border-2 border-background bg-primary/10 -ml-2.5 items-center justify-center">
                                                <MaterialIcons name="favorite" size={12} color="#b30069" />
                                            </View>
                                        </View>
                                    </View>
                                    <Text className="text-[#594048]/60 text-[10px] font-body-bold tracking-[0.12em] mt-3 uppercase">
                                        Many Mandalis Gathering
                                    </Text>
                                </View>
                            )}
                        </Animated.View>
                    </ScrollView>

                </KeyboardAvoidingView>
            </SafeAreaView>
        </TouchableWithoutFeedback>
    );
};

export default LoginScreen;
