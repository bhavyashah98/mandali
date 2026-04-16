import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, useWindowDimensions, Switch, Image, Platform } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

const MoreScreen = () => {
    const { user, logout } = useAuthStore();
    const { notificationsEnabled, toggleNotifications } = useSettingsStore();
    const { width } = useWindowDimensions();
    const isTablet = width > 500;

    const handleLogout = async () => {
        logout();
    };

    return (
        <ScrollView className="flex-1 bg-[#FDF9F3]" showsVerticalScrollIndicator={false}>
            <View className={`p-${isTablet ? '16' : '6'} pb-24`}>
                <View className="w-full">
                    <Text 
                        className={`text-on-surface font-headline-bold mb-10 mt-8 ${isTablet ? 'text-5xl' : 'text-3xl'}`}
                    >
                        Profile & Settings
                    </Text>
                    
                    {/* User Profile Card */}
                    <View 
                        className={`bg-white rounded-[40px] shadow-sm mb-10 border border-stone-50 items-center ${isTablet ? 'p-16' : 'p-8'}`}
                        style={{ elevation: 4 }}
                    >
                        <View 
                            className={`bg-[#f3e8ef] rounded-full mb-8 items-center justify-center overflow-hidden border-4 border-white ${isTablet ? 'w-48 h-48' : 'w-24 h-24'}`}
                            style={{ elevation: 8 }}
                        >
                            {user?.avatar_url ? (
                                <Image source={{ uri: user.avatar_url }} className="w-full h-full" />
                            ) : (
                                <Text className={isTablet ? 'text-8xl' : 'text-4xl'}>
                                    {user?.name?.[0] || '👤'}
                                </Text>
                            )}
                        </View>
                        <Text className={`text-[#1c1c18] font-headline-bold text-center ${isTablet ? 'text-5xl' : 'text-2xl'}`}>
                            {user?.name || 'Mandali Member'}
                        </Text>
                        <Text className={`text-stone-400 font-body-medium text-center mb-10 ${isTablet ? 'text-2xl mt-4' : 'text-base mt-1'}`}>
                            {user?.phone || 'Account Verified'}
                        </Text>
                        
                        <TouchableOpacity 
                            className={`bg-primary/5 rounded-full items-center justify-center border border-primary/20 ${isTablet ? 'h-24 px-16' : 'h-14 px-8'}`}
                        >
                            <Text className={`text-primary font-body-bold ${isTablet ? 'text-2xl' : 'text-base'}`}>
                                Edit Profile details
                            </Text>
                        </TouchableOpacity>
                    </View>
                    
                    {/* Settings Group */}
                    <View 
                        className={`bg-white rounded-[40px] shadow-sm border border-stone-50 ${isTablet ? 'p-16' : 'p-8'}`}
                        style={{ elevation: 4 }}
                    >
                        <Text className={`text-[#1c1c18] font-headline-bold mb-8 ${isTablet ? 'text-4xl' : 'text-xl'}`}>Preferences</Text>
                        
                        {/* Notifications Toggle */}
                        <View className="flex-row items-center justify-between py-4 border-b border-stone-50">
                            <View className="flex-row items-center flex-1">
                                <View className={`bg-blue-50 rounded-2xl items-center justify-center mr-5 ${isTablet ? 'w-16 h-16' : 'w-11 h-11'}`}>
                                    <Ionicons name="notifications" size={isTablet ? 32 : 22} color="#3b82f6" />
                                </View>
                                <View>
                                    <Text className={`text-[#1c1c18] font-body-bold ${isTablet ? 'text-2xl' : 'text-base'}`}>Push Notifications</Text>
                                    <Text className={`text-stone-400 font-body-medium ${isTablet ? 'text-xl mt-1' : 'text-xs'}`}>Stay updated with activity</Text>
                                </View>
                            </View>
                            <Switch 
                                value={notificationsEnabled}
                                onValueChange={toggleNotifications}
                                trackColor={{ false: '#e5e7eb', true: '#b30069' }}
                                thumbColor={Platform.OS === 'ios' ? undefined : '#ffffff'}
                            />
                        </View>

                        {/* Privacy Link */}
                        <TouchableOpacity className="flex-row items-center justify-between py-6 border-b border-stone-50">
                            <View className="flex-row items-center flex-1">
                                <View className={`bg-green-50 rounded-2xl items-center justify-center mr-5 ${isTablet ? 'w-16 h-16' : 'w-11 h-11'}`}>
                                    <MaterialIcons name="security" size={isTablet ? 32 : 22} color="#10b981" />
                                </View>
                                <Text className={`text-[#1c1c18] font-body-bold ${isTablet ? 'text-2xl' : 'text-base'}`}>Privacy & Security</Text>
                            </View>
                            <MaterialIcons name="chevron-right" size={isTablet ? 32 : 24} color="#a09d96" />
                        </TouchableOpacity>

                        {/* Logout */}
                        <TouchableOpacity 
                            onPress={handleLogout} 
                            className="flex-row items-center mt-8 py-4"
                        >
                            <View className={`bg-red-50 rounded-2xl items-center justify-center mr-5 ${isTablet ? 'w-16 h-16' : 'w-11 h-11'}`}>
                                <MaterialIcons name="logout" size={isTablet ? 32 : 22} color="#ef4444" />
                            </View>
                            <Text className={`text-error font-headline-bold ${isTablet ? 'text-2xl' : 'text-lg'}`}>Sign Out</Text>
                        </TouchableOpacity>
                    </View>

                    {/* App Version */}
                    <Text className="text-stone-300 font-body-bold text-center mt-12 uppercase tracking-widest text-[10px]">Mandali v1.0.4 • Made with ❤️</Text>
                </View>
            </View>
        </ScrollView>
    );
};

export default MoreScreen;
