import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import { useAuthStore } from '../../stores/authStore';
import axios from 'axios';
import { API_URL, getAuthHeaders } from '../../lib/api';

const ProfileMenuScreen = () => {
    const { user, logout } = useAuthStore();
    const navigation = useNavigation<any>();
    const [isDeleting, setIsDeleting] = useState(false);

    const openLink = async (url: string) => {
        await WebBrowser.openBrowserAsync(url);
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            "Delete Account",
            "Are you sure? This cannot be undone. You will lose access to all your Mandalis, tickets, and shared memories permanently.",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Yes, Delete It", 
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setIsDeleting(true);
                            const headers = await getAuthHeaders();
                            await axios.delete(`${API_URL}/auth/profile`, { headers });
                            logout();
                        } catch (error) {
                            Alert.alert("Error", "Failed to delete account. Please try again.");
                            setIsDeleting(false);
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top']}>
            <View className="px-6 py-4 flex-row items-center justify-between">
                <View>
                    <Text className="text-stone-400 font-body-bold text-[10px] uppercase tracking-[3px] mb-1">Account & Settings</Text>
                    <Text className="text-2xl font-headline-bold text-primary">Mandali Profile</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                
                {/* Profile Information Header */}
                <View className="items-center mb-10">
                    <View className="w-24 h-24 rounded-[32px] overflow-hidden bg-stone-100 shadow-md border-2 border-white mb-4">
                        {user?.avatar_url ? (
                            <Image source={{ uri: user.avatar_url }} className="w-full h-full" resizeMode="cover" />
                        ) : (
                            <View className="w-full h-full items-center justify-center bg-primary/5">
                                <Text className="font-headline-bold text-3xl text-primary opacity-30">
                                    {(user?.name || 'M').charAt(0).toUpperCase()}
                                </Text>
                            </View>
                        )}
                    </View>
                    <Text className="text-2xl font-headline-bold text-[#1c1c18]">{user?.name}</Text>
                    <Text className="text-[14px] font-body-medium text-stone-500 mt-1">{user?.phone}</Text>
                </View>

                {/* Account Actions Section */}
                <Text className="text-stone-400 font-body-bold text-[11px] uppercase tracking-widest mb-3 ml-2">Personalization</Text>
                <View className="bg-white rounded-3xl p-2 shadow-sm border border-stone-50 mb-8">
                    <TouchableOpacity 
                        onPress={() => navigation.navigate('UpdateProfile')}
                        activeOpacity={0.7}
                        className="flex-row items-center justify-between px-4 py-3 rounded-2xl"
                    >
                        <View className="flex-row items-center">
                            <View className="w-10 h-10 rounded-full bg-primary/5 items-center justify-center mr-4">
                                <MaterialIcons name="edit" size={20} color="#b30069" />
                            </View>
                            <Text className="font-headline-bold text-[#1c1c18] text-[16px]">Edit Profile Details</Text>
                        </View>
                        <MaterialIcons name="chevron-right" size={24} color="#e6d9d0" />
                    </TouchableOpacity>
                </View>

                {/* Legal & Compliance Section */}
                <Text className="text-stone-400 font-body-bold text-[11px] uppercase tracking-widest mb-3 ml-2">Legal Agreements</Text>
                <View className="bg-white rounded-3xl p-2 shadow-sm border border-stone-50 mb-8">
                    <TouchableOpacity 
                        onPress={() => openLink('https://api.mandaliapp.com/privacy')}
                        activeOpacity={0.7}
                        className="flex-row items-center justify-between px-4 py-3 rounded-2xl border-b border-stone-50"
                    >
                        <View className="flex-row items-center">
                            <View className="w-10 h-10 rounded-full bg-stone-50 items-center justify-center mr-4">
                                <MaterialIcons name="privacy-tip" size={20} color="#b30069" />
                            </View>
                            <Text className="font-headline-bold text-[#1c1c18] text-[16px]">Privacy Policy</Text>
                        </View>
                        <MaterialIcons name="open-in-new" size={20} color="#b3006969" />
                    </TouchableOpacity>

                    <TouchableOpacity 
                        onPress={() => openLink('https://api.mandaliapp.com/terms')}
                        activeOpacity={0.7}
                        className="flex-row items-center justify-between px-4 py-3 rounded-2xl"
                    >
                        <View className="flex-row items-center">
                            <View className="w-10 h-10 rounded-full bg-stone-50 items-center justify-center mr-4">
                                <MaterialIcons name="gavel" size={20} color="#b30069" />
                            </View>
                            <Text className="font-headline-bold text-[#1c1c18] text-[16px]">Terms of Service</Text>
                        </View>
                        <MaterialIcons name="open-in-new" size={20} color="#b3006969" />
                    </TouchableOpacity>
                </View>

                {/* Secure Actions Section */}
                <TouchableOpacity 
                    onPress={logout}
                    activeOpacity={0.7}
                    className="flex-row items-center justify-center bg-stone-100 rounded-3xl p-5 border border-stone-200 mb-4"
                >
                    <MaterialIcons name="logout" size={20} color="#594048" className="mr-2" />
                    <Text className="font-headline-bold text-[#594048] text-[16px] ml-2">Secure Logout</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    onPress={handleDeleteAccount}
                    activeOpacity={0.6}
                    disabled={isDeleting}
                    className="flex-row items-center justify-center py-4 opacity-70"
                >
                    {isDeleting ? (
                        <ActivityIndicator color="#d32f2f" size="small" />
                    ) : (
                        <Text className="font-body-bold text-[#d32f2f] text-[13px] underline">Permanently Delete Account</Text>
                    )}
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
};

export default ProfileMenuScreen;
