import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MoreScreen = () => {
    const logout = useAuthStore((state) => state.logout);

    const handleLogout = async () => {
        // Clear local storage and reset UI authentication state
        await AsyncStorage.removeItem('mandali_token');
        await AsyncStorage.removeItem('mandali_user');
        logout();
    };

    return (
        <ScrollView className="flex-1 bg-background">
            <View className="p-6">
                <Text className="text-on-surface text-3xl font-headline-bold mb-4 mt-8">Profile & More</Text>
                <View className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm mb-6">
                   <View className="w-20 h-20 bg-surface-container rounded-full mb-4 self-center items-center justify-center">
                       <Text className="text-3xl">👩</Text>
                   </View>
                   <Text className="text-on-surface font-body-bold text-center text-xl">Anjali Mehra</Text>
                   <Text className="text-on-surface-variant font-body-medium text-center mb-4">+91 98765 43210</Text>
                   <TouchableOpacity className="bg-primary h-12 rounded-full items-center justify-center">
                       <Text className="text-white font-body-bold">Edit Profile</Text>
                   </TouchableOpacity>
                </View>
                
                <View className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm">
                    <Text className="text-on-surface font-body-bold mb-4 text-lg">App Settings</Text>
                    <View className="h-px bg-surface-container mb-4" />
                    <TouchableOpacity className="flex-row items-center justify-between mb-6">
                        <Text className="text-on-surface font-body-medium">Privacy</Text>
                        <Text className="text-on-surface-variant font-body-medium">Locked</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleLogout} className="flex-row items-center justify-between py-2">
                        <Text className="text-error font-body-bold">Logout</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
};

export default MoreScreen;
