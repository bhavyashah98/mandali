import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import { useAuthStore } from '../../stores/authStore';
import axios from 'axios';
import { API_URL, getAuthHeaders } from '../../lib/api';
import { useSettingsStore } from '../../stores/settingsStore';
import { Switch } from 'react-native';

const ProfileMenuScreen = () => {
    const { user, logout } = useAuthStore();
    const navigation = useNavigation<any>();
    const { width } = useWindowDimensions();
    const isTablet = width > 500;
    const [isDeleting, setIsDeleting] = useState(false);

    // Settings Store
    const { notificationsEnabled, setNotificationsEnabled } = useSettingsStore();

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
            <View className={`px-6 ${isTablet ? 'py-4' : 'py-2'}`}>
                <Text 
                    className="font-headline-bold text-on-surface text-[#1c1c18]"
                    style={{ fontSize: isTablet ? 48 : 28 }}
                >
                    Mandali Profile
                </Text>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: isTablet ? 60 : 24, paddingTop: isTablet ? 40 : 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

                {/* Profile Information Header */}
                <View className={`items-center mb-${isTablet ? '16' : '10'}`}>
                    <View
                        className="rounded-[40px] overflow-hidden bg-stone-100 shadow-md border-[3px] border-white mb-6"
                        style={{ width: isTablet ? 180 : 96, height: isTablet ? 180 : 96 }}
                    >
                        {user?.avatar_url ? (
                            <Image source={{ uri: user.avatar_url }} className="w-full h-full" resizeMode="cover" />
                        ) : (
                            <View className="w-full h-full items-center justify-center bg-primary/5">
                                <Text className={`font-headline-bold text-primary opacity-30 ${isTablet ? 'text-7xl' : 'text-3xl'}`}>
                                    {(user?.name || 'M').charAt(0).toUpperCase()}
                                </Text>
                            </View>
                        )}
                    </View>
                    <Text className={`font-headline-bold text-[#1c1c18] ${isTablet ? 'text-5xl' : 'text-2xl'}`}>{user?.name}</Text>
                    <Text className={`font-body-medium text-stone-500 mt-2 ${isTablet ? 'text-2xl' : 'text-[14px]'}`}>{user?.phone}</Text>
                </View>

                {/* Account Actions Section */}
                <Text className={`text-stone-400 font-body-bold uppercase tracking-widest mb-4 ml-4 ${isTablet ? 'text-xl' : 'text-[11px]'}`}>Personalization</Text>
                <View className={`bg-white rounded-[32px] shadow-sm border border-stone-50 mb-12 ${isTablet ? 'p-6' : 'p-2'}`}>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('UpdateProfile')}
                        activeOpacity={0.7}
                        className={`flex-row items-center justify-between px-6 py-4 rounded-2xl`}
                    >
                        <View className="flex-row items-center">
                            <View className={`rounded-full bg-primary/5 items-center justify-center mr-6 ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}>
                                <MaterialIcons name="edit" size={isTablet ? 32 : 20} color="#b30069" />
                            </View>
                            <Text className={`font-headline-bold text-[#1c1c18] ${isTablet ? 'text-2xl' : 'text-[16px]'}`}>Edit Profile Details</Text>
                        </View>
                        <MaterialIcons name="chevron-right" size={isTablet ? 42 : 24} color="#e6d9d0" />
                    </TouchableOpacity>

                    <View className={`flex-row items-center justify-between px-6 py-4 rounded-2xl`}>
                        <View className="flex-row items-center">
                            <View className={`rounded-full bg-primary/5 items-center justify-center mr-6 ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}>
                                <MaterialIcons name={notificationsEnabled ? "notifications-active" : "notifications-off"} size={isTablet ? 32 : 20} color="#b30069" />
                            </View>
                            <View>
                                <Text className={`font-headline-bold text-[#1c1c18] ${isTablet ? 'text-2xl' : 'text-[16px]'}`}>Push Notifications</Text>
                                <Text className={`font-body-medium text-stone-400 ${isTablet ? 'text-xl mt-1' : 'text-[12px]'}`}>
                                    {notificationsEnabled ? 'Enabled' : 'Disabled'}
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={notificationsEnabled}
                            onValueChange={setNotificationsEnabled}
                            trackColor={{ false: "#e6d9d0", true: "#b3006940" }}
                            thumbColor={notificationsEnabled ? "#b30069" : "#f4f3f4"}
                            ios_backgroundColor="#e6d9d0"
                            style={isTablet ? { transform: [{ scaleX: 1.5 }, { scaleY: 1.5 }] } : {}}
                        />
                    </View>
                </View>

                {/* Legal & Compliance Section */}
                <Text className={`text-stone-400 font-body-bold uppercase tracking-widest mb-4 ml-4 ${isTablet ? 'text-xl' : 'text-[11px]'}`}>Legal Agreements</Text>
                <View className={`bg-white rounded-[32px] shadow-sm border border-stone-50 mb-12 ${isTablet ? 'p-6' : 'p-2'}`}>
                    <TouchableOpacity
                        onPress={() => openLink('https://api.mandaliapp.com/privacy')}
                        activeOpacity={0.7}
                        className="flex-row items-center justify-between px-6 py-5 rounded-2xl border-b border-stone-50"
                    >
                        <View className="flex-row items-center">
                            <View className={`rounded-full bg-stone-50 items-center justify-center mr-6 ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}>
                                <MaterialIcons name="privacy-tip" size={isTablet ? 32 : 20} color="#b30069" />
                            </View>
                            <Text className={`font-headline-bold text-[#1c1c18] ${isTablet ? 'text-2xl' : 'text-[16px]'}`}>Privacy Policy</Text>
                        </View>
                        <MaterialIcons name="open-in-new" size={isTablet ? 32 : 20} color="#b3006969" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => openLink('https://api.mandaliapp.com/terms')}
                        activeOpacity={0.7}
                        className="flex-row items-center justify-between px-6 py-5 rounded-2xl"
                    >
                        <View className="flex-row items-center">
                            <View className={`rounded-full bg-stone-50 items-center justify-center mr-6 ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}>
                                <MaterialIcons name="gavel" size={isTablet ? 32 : 20} color="#b30069" />
                            </View>
                            <Text className={`font-headline-bold text-[#1c1c18] ${isTablet ? 'text-2xl' : 'text-[16px]'}`}>Terms of Service</Text>
                        </View>
                        <MaterialIcons name="open-in-new" size={isTablet ? 32 : 20} color="#b3006969" />
                    </TouchableOpacity>
                </View>

                {/* Secure Actions Section */}
                <TouchableOpacity
                    onPress={logout}
                    activeOpacity={0.7}
                    style={{ height: isTablet ? 110 : 64 }}
                    className={`flex-row items-center justify-center bg-stone-100 rounded-[32px] border border-stone-200 mb-6`}
                >
                    <MaterialIcons name="logout" size={isTablet ? 32 : 20} color="#594048" />
                    <Text className={`font-headline-bold text-[#594048] ml-4 ${isTablet ? 'text-3xl' : 'text-[16px]'}`}>Secure Logout</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleDeleteAccount}
                    activeOpacity={0.6}
                    disabled={isDeleting}
                    style={{ height: isTablet ? 80 : 44 }}
                    className={`flex-row items-center justify-center opacity-70`}
                >
                    {isDeleting ? (
                        <ActivityIndicator color="#d32f2f" size={isTablet ? 'large' : 'small'} />
                    ) : (
                        <Text className={`font-body-bold text-[#d32f2f] underline ${isTablet ? 'text-2xl' : 'text-[13px]'}`}>Permanently Delete Account</Text>
                    )}
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
};

export default ProfileMenuScreen;
