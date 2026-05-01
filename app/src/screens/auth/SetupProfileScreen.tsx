import React, { useState, useRef, useEffect } from 'react';
import { useIsTablet } from '../../hooks/useIsTablet';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Image,
    Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../stores/authStore';
import { useWindowDimensions } from 'react-native';
import { API_URL, getAuthHeaders, uploadProfileImage } from '../../lib/api';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

const SetupProfileScreen = () => {
    const { user, setUser, logout } = useAuthStore();
    const navigation = useNavigation<any>();
    const { width } = useWindowDimensions();
    const isTablet = useIsTablet();

    // Initialize states with user data if available (Edit Mode)
    const [name, setName] = useState(user?.name || '');
    const [profileImage, setProfileImage] = useState<string | null>(user?.avatar_url || null);

    // Birthday as a Date object
    const [birthday, setBirthday] = useState(user?.birthday ? new Date(user.birthday) : new Date(2000, 0, 1));
    const [showDatePicker, setShowDatePicker] = useState(false);

    useEffect(() => {
        if (user?.birthday) {
            const date = new Date(user.birthday);
            if (!isNaN(date.getTime())) {
                setBirthday(date);
            }
        }
    }, [user?.birthday]);

    const [isLoading, setIsLoading] = useState(false);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please allow access to your photo library.');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setProfileImage(result.assets[0].uri);
        }
    };

    const handleSaveProfile = async () => {
        if (!name.trim()) {
            Alert.alert('Required', 'Please enter your name.');
            return;
        }

        const y = birthday.getFullYear();
        const m = birthday.getMonth() + 1;
        const d = birthday.getDate();

        const birthdayStr = `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;

        try {
            setIsLoading(true);
            const headers = await getAuthHeaders();

            // 1. Upload image if it's a local URI (selected via picker)
            let avatarUrl = user?.avatar_url || null;
            if (profileImage && profileImage.startsWith('file')) {
                avatarUrl = await uploadProfileImage(profileImage);
            }

            // 2. Save profile
            const response = await axios.patch(`${API_URL}/auth/profile`, {
                name: name.trim(),
                birthday: birthdayStr,
                avatar_url: avatarUrl
            }, { headers });

            if (response.data.success) {
                const updatedUser = response.data.user;
                setUser(updatedUser);
                await AsyncStorage.setItem('mandali_user', JSON.stringify(updatedUser));
                Alert.alert('Success', 'Profile updated successfully!');

                // If they came from menu, navigate back.
                if (!isFirstTime && navigation.canGoBack()) {
                    navigation.goBack();
                }
            }
        } catch (error: any) {
            console.error('[ProfileUpdate] Error:', error);
            Alert.alert('Error', error.response?.data?.error || 'Failed to update profile.');
        } finally {
            setIsLoading(false);
        }
    };

    const isFirstTime = !user?.name || user?.name.trim() === '';

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            {/* Header */}
            <View className={`flex-row items-center px-6 ${isTablet ? 'py-8' : 'py-4'}`}>
                <View style={{ width: isTablet ? 64 : 40 }}>
                    {isFirstTime ? (
                        <TouchableOpacity
                            onPress={logout}
                            className={`items-center justify-center rounded-full bg-white shadow-sm border border-stone-100 ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}
                        >
                            <MaterialIcons name="logout" size={isTablet ? 28 : 22} color="#b30069" />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            className={`items-center justify-center rounded-full bg-white shadow-sm border border-stone-100 ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}
                        >
                            <MaterialIcons name="arrow-back" size={isTablet ? 28 : 24} color="#1c1c18" />
                        </TouchableOpacity>
                    )}
                </View>

                <View className="flex-1 items-center">
                    <Text
                        className="font-headline-bold text-on-surface text-[#1c1c18]"
                        style={{ fontSize: isTablet ? 36 : 22 }}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                    >
                        {isFirstTime ? 'Setup Profile' : 'My Profile'}
                    </Text>
                </View>

                <View style={{ width: isTablet ? 64 : 40 }} />
            </View>

            <View className="flex-1">


                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1"
                >
                    <ScrollView
                        contentContainerStyle={{
                            padding: isTablet ? 40 : 20,
                            paddingBottom: 60
                        }}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="always"
                    >
                        <View className="w-full">
                            {/* Profile Photo Section */}
                            <View className={`items-center mb-${isTablet ? '16' : '8'} mt-2`}>
                                <TouchableOpacity onPress={pickImage} activeOpacity={0.7} className="items-center">
                                    <View className="relative mb-6">
                                        <View
                                            className="rounded-full items-center justify-center overflow-hidden border-[4px] border-white"
                                            style={{
                                                width: isTablet ? 200 : 124,
                                                height: isTablet ? 200 : 124,
                                                backgroundColor: '#f3e8ef',
                                                shadowColor: '#b30069',
                                                shadowOffset: { width: 0, height: 4 },
                                                shadowOpacity: 0.12,
                                                shadowRadius: 12,
                                                elevation: 4,
                                            }}
                                        >
                                            {profileImage ? (
                                                <Image source={{ uri: profileImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                            ) : (
                                                <Ionicons name="person" size={isTablet ? 90 : 54} color="#b30069" />
                                            )}
                                        </View>
                                        <View className={`absolute bottom-1 right-1 items-center justify-center rounded-full bg-primary border-2 border-background ${isTablet ? 'w-12 h-12' : 'w-8 h-8'}`}>
                                            <MaterialIcons name="camera-alt" size={isTablet ? 20 : 14} color="white" />
                                        </View>
                                    </View>
                                    <Text className={`font-body-bold text-on-surface-variant ${isTablet ? 'text-2xl' : 'text-sm'}`}>Update Photo</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Name Input */}
                            <View className={`mb-${isTablet ? '10' : '6'}`}>
                                <Text className={`font-body-bold text-on-surface mb-3 ml-1 ${isTablet ? 'text-xl' : 'text-[15px]'}`}>Your Name</Text>
                                <View className="bg-surface-container rounded-[20px] px-6 justify-center" style={{ height: isTablet ? 110 : 56 }}>
                                    <TextInput
                                        placeholder="E.g. Arnav Shah"
                                        placeholderTextColor="#a09d96"
                                        style={{ height: isTablet ? 110 : 56, fontSize: isTablet ? 32 : 16, color: '#1c1c18' }}
                                        className="font-body-bold"
                                        value={name}
                                        onChangeText={setName}
                                    />
                                </View>
                            </View>

                            {/* Birthday Section */}
                            <View className={`mb-${isTablet ? '12' : '8'}`}>
                                <Text className={`font-body-bold text-on-surface mb-3 ml-1 ${isTablet ? 'text-xl' : 'text-[15px]'}`}>Your Birthday</Text>
                                <TouchableOpacity
                                    onPress={() => setShowDatePicker(true)}
                                    activeOpacity={0.7}
                                    style={{ height: isTablet ? 110 : 56 }}
                                    className="bg-surface-container rounded-[20px] px-6 flex-row items-center justify-between"
                                >
                                    <Text className={`font-body-bold text-stone-800 ${isTablet ? 'text-2xl' : 'text-base'}`}>
                                        {birthday.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </Text>
                                    <MaterialIcons name="event" size={isTablet ? 28 : 20} color="#b30069" />
                                </TouchableOpacity>

                                {Platform.OS === 'ios' ? (
                                    <Modal
                                        visible={showDatePicker}
                                        transparent={true}
                                        animationType="fade"
                                        onRequestClose={() => setShowDatePicker(false)}
                                    >
                                        <View 
                                            style={{ flex: 1, backgroundColor: 'rgba(28, 28, 24, 0.4)' }} 
                                            className="justify-end"
                                        >
                                            <View className="bg-white rounded-t-[40px] p-8 pb-12">
                                                <View className="flex-row justify-between items-center mb-6">
                                                    <Text className="text-[#1c1c18] font-headline-bold text-2xl">Select Birthday</Text>
                                                    <TouchableOpacity 
                                                        onPress={() => setShowDatePicker(false)}
                                                        className="bg-stone-100 p-2 rounded-full"
                                                    >
                                                        <MaterialIcons name="close" size={24} color="#594048" />
                                                    </TouchableOpacity>
                                                </View>
                                                
                                                <DateTimePicker
                                                    value={birthday}
                                                    mode="date"
                                                    display="spinner"
                                                    maximumDate={new Date()}
                                                    onChange={(event, selectedDate) => {
                                                        if (selectedDate) setBirthday(selectedDate);
                                                    }}
                                                    textColor="#1c1c18"
                                                />

                                                <TouchableOpacity
                                                    onPress={() => setShowDatePicker(false)}
                                                    className="bg-[#b30069] rounded-full h-16 items-center justify-center mt-6 shadow-lg shadow-[#b30069]/20"
                                                >
                                                    <Text className="text-white font-headline-bold text-lg">Confirm Birthday</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </Modal>
                                ) : showDatePicker && (
                                    <DateTimePicker
                                        value={birthday}
                                        mode="date"
                                        display="calendar"
                                        maximumDate={new Date()}
                                        onChange={(event, selectedDate) => {
                                            setShowDatePicker(false);
                                            if (selectedDate) setBirthday(selectedDate);
                                        }}
                                    />
                                )}
                            </View>

                            {/* Info Card - Different for Edit vs Setup */}
                            <View className={`flex-row items-start bg-primary/5 rounded-3xl mb-12 border border-primary/10 ${isTablet ? 'p-12' : 'p-5'}`}>
                                <View className={`${isTablet ? 'mr-8 mt-2' : 'mr-5 mt-1'}`}>
                                    <MaterialIcons name={isFirstTime ? "stars" : "verified-user"} size={isTablet ? 48 : 22} color="#b30069" />
                                </View>
                                <View className="flex-1">
                                    <Text
                                        className="font-body-bold text-on-surface"
                                        style={{ fontSize: isTablet ? 32 : 15, marginBottom: isTablet ? 12 : 4 }}
                                    >
                                        {isFirstTime ? 'Make it Yours' : 'Account Identity'}
                                    </Text>
                                    <Text
                                        className="font-body-regular text-on-surface-variant"
                                        style={{ fontSize: isTablet ? 22 : 13, lineHeight: isTablet ? 36 : 20 }}
                                    >
                                        {isFirstTime
                                            ? 'Personalizing your profile helps your friends recognize you and join your Mandali gatherings.'
                                            : 'Your Mandali profile is how you appear to others in games and memories. Keep it updated!'}
                                    </Text>
                                </View>
                            </View>

                            {/* Save/Join Button */}
                            <TouchableOpacity
                                className={`w-full rounded-[32px] items-center justify-center ${name.trim() && !isLoading ? 'bg-[#b30069]' : 'bg-[#b30069]/50'}`}
                                style={{
                                    height: isTablet ? 110 : 64,
                                    elevation: 8,
                                    shadowColor: '#b30069',
                                    shadowOffset: { width: 0, height: 6 },
                                    shadowOpacity: 0.2,
                                    shadowRadius: 12,
                                }}
                                disabled={!name.trim() || isLoading}
                                activeOpacity={0.85}
                                onPress={handleSaveProfile}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text
                                        className="font-headline-bold text-white text-center"
                                        style={{ fontSize: isTablet ? 32 : 20 }}
                                    >
                                        {isFirstTime ? 'Join Mandali' : 'Update Profile'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
        </SafeAreaView>
    );
};

export default SetupProfileScreen;
