import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../../stores/authStore';

const LoginScreen = () => {
    const login = useAuthStore((state) => state.login);

    return (
        <View className="flex-1 bg-background p-6 justify-center">
            <Text className="text-on-surface text-3xl font-bold mb-4">Login & Verification</Text>
            <View className="bg-surface-container h-12 rounded-xl px-4 justify-center mb-4">
                <Text className="text-on-surface-variant">Phone Number</Text>
            </View>
            <TouchableOpacity 
                className="bg-primary h-12 rounded-full items-center justify-center"
                onPress={login}
            >
                <Text className="text-on-primary font-semibold">Get Started</Text>
            </TouchableOpacity>
        </View>
    );
};

export default LoginScreen;
