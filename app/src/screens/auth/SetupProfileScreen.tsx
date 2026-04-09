import React, { useState, useRef, useEffect } from 'react';
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
    Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { API_URL, getAuthHeaders, uploadImage } from '../../lib/api';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

const SetupProfileScreen = () => {
    const { user, setUser, logout } = useAuthStore();
    
    // Initialize states with user data if available (Edit Mode)
    const [name, setName] = useState(user?.name || '');
    const [profileImage, setProfileImage] = useState<string | null>(user?.avatar_url || null);
    
    // Parse user birthday if exists (YYYY-MM-DD)
    const [day, setDay] = useState('');
    const [month, setMonth] = useState('');
    const [year, setYear] = useState('');

    useEffect(() => {
        if (user?.birthday) {
            const parts = user.birthday.split('-');
            if (parts.length === 3) {
                setYear(parts[0]);
                setMonth(parts[1]);
                setDay(parts[2]);
            }
        }
    }, [user?.birthday]);
    
    const monthRef = useRef<TextInput>(null);
    const yearRef = useRef<TextInput>(null);
    
    const [isLoading, setIsLoading] = useState(false);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please allow access to your photo library.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled && result.assets[0]) {
            setProfileImage(result.assets[0].uri);
        }
    };

    const handleSaveProfile = async () => {
        if (!name.trim()) {
            Alert.alert('Required', 'Please enter your name.');
            return;
        }

        const d = parseInt(day);
        const m = parseInt(month);
        const y = parseInt(year);

        if (!d || d < 1 || d > 31 || !m || m < 1 || m > 12 || !y || y < 1920 || y > new Date().getFullYear()) {
            Alert.alert('Invalid Date', 'Please enter a valid birthday.');
            return;
        }

        const birthdayStr = `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;

        try {
            setIsLoading(true);
            const headers = await getAuthHeaders();
            
            // 1. Upload image if it's a local URI (selected via picker)
            let avatarUrl = user?.avatar_url || null;
            if (profileImage && profileImage.startsWith('file')) {
                avatarUrl = await uploadImage(profileImage);
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
            <View className="flex-row items-center justify-between px-4 py-3.5 bg-background">
                <TouchableOpacity onPress={logout} className="w-10 h-10 items-center justify-center">
                    <MaterialIcons name="logout" size={22} color="#b30069" />
                </TouchableOpacity>
                <Text className="text-[22px] font-headline-bold text-on-surface text-center">
                    {isFirstTime ? 'Setup Profile' : 'My Profile'}
                </Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <ScrollView 
                    contentContainerStyle={{ padding: 24, paddingBottom: 40 }} 
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="always"
                >
                    {/* Profile Photo Section */}
                    <View className="items-center mb-8 mt-2">
                        <TouchableOpacity onPress={pickImage} activeOpacity={0.7} className="items-center">
                            <View className="relative mb-2.5">
                                <View 
                                    className="w-[124px] h-[124px] rounded-full items-center justify-center overflow-hidden border-[3px] border-white"
                                    style={{
                                        backgroundColor: '#f3e8ef',
                                        shadowColor: '#b30069',
                                        shadowOffset: { width: 0, height: 4 },
                                        shadowOpacity: 0.12,
                                        shadowRadius: 12,
                                        elevation: 4,
                                    }}
                                >
                                    {profileImage ? (
                                        <Image source={{ uri: profileImage }} className="w-full h-full" resizeMode="cover" />
                                    ) : (
                                        <Ionicons name="person" size={54} color="#b30069" />
                                    )}
                                </View>
                                <View className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary border-2 border-background items-center justify-center">
                                    <MaterialIcons name="camera-alt" size={14} color="white" />
                                </View>
                            </View>
                            <Text className="text-sm font-body-bold text-on-surface-variant">Update Photo</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Name Input */}
                    <View className="mb-6">
                        <Text className="text-[15px] font-body-bold text-on-surface mb-2 ml-1">Your Name</Text>
                        <View className="bg-surface-container rounded-[20px] px-5 justify-center" style={{ height: 56 }}>
                            <TextInput
                                placeholder="E.g. Arnav Shah"
                                placeholderTextColor="#a09d96"
                                style={{ height: 56, fontSize: 15, color: '#1c1c18' }}
                                value={name}
                                onChangeText={setName}
                            />
                        </View>
                    </View>

                    {/* Birthday Section */}
                    <View className="mb-8">
                        <Text className="text-[15px] font-body-bold text-on-surface mb-2 ml-1">Birthday (DD/MM/YYYY)</Text>
                        <View className="flex-row gap-3">
                            <View className="flex-1 bg-surface-container rounded-[20px] px-2 items-center justify-center" style={{ height: 56 }}>
                                <TextInput
                                    value={day}
                                    onChangeText={(v) => {
                                        setDay(v);
                                        if (v.length === 2) monthRef.current?.focus();
                                    }}
                                    placeholder="DD"
                                    placeholderTextColor="#a09d96"
                                    keyboardType="number-pad"
                                    maxLength={2}
                                    style={{ height: 56, fontSize: 16, color: '#1c1c18', fontWeight: '700', textAlign: 'center' }}
                                />
                            </View>
                            <View className="flex-1 bg-surface-container rounded-[20px] px-2 items-center justify-center" style={{ height: 56 }}>
                                <TextInput
                                    ref={monthRef}
                                    value={month}
                                    onChangeText={(v) => {
                                        setMonth(v);
                                        if (v.length === 2) yearRef.current?.focus();
                                    }}
                                    placeholder="MM"
                                    placeholderTextColor="#a09d96"
                                    keyboardType="number-pad"
                                    maxLength={2}
                                    style={{ height: 56, fontSize: 16, color: '#1c1c18', fontWeight: '700', textAlign: 'center' }}
                                />
                            </View>
                            <View className="flex-[1.5] bg-surface-container rounded-[20px] px-2 items-center justify-center" style={{ height: 56 }}>
                                <TextInput
                                    ref={yearRef}
                                    value={year}
                                    onChangeText={setYear}
                                    placeholder="YYYY"
                                    placeholderTextColor="#a09d96"
                                    keyboardType="number-pad"
                                    maxLength={4}
                                    style={{ height: 56, fontSize: 16, color: '#1c1c18', fontWeight: '700', textAlign: 'center' }}
                                />
                            </View>
                        </View>
                    </View>

                    {/* Info Card - Different for Edit vs Setup */}
                    <View className="flex-row items-start bg-primary/5 rounded-3xl p-5 mb-8 border border-primary/10">
                        <View className="mr-3.5 mt-0.5">
                            <MaterialIcons name={isFirstTime ? "stars" : "verified-user"} size={22} color="#b30069" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-[14px] font-body-bold text-on-surface mb-1">
                                {isFirstTime ? 'Make it Yours' : 'Account Identity'}
                            </Text>
                            <Text className="text-[12px] font-body-regular text-on-surface-variant leading-4">
                                {isFirstTime 
                                    ? 'Personalizing your profile helps your friends recognize you and join your Mandali gatherings.'
                                    : 'Your Mandali profile is how you appear to others in games and memories. Keep it updated!'}
                            </Text>
                        </View>
                    </View>

                    {/* Save/Join Button */}
                    <TouchableOpacity
                        className={`w-full h-[58px] rounded-full items-center justify-center ${name.trim() && day && month && year && !isLoading ? 'bg-primary' : 'bg-primary/50'}`}
                        style={{
                            shadowColor: '#b30069',
                            shadowOffset: { width: 0, height: 6 },
                            shadowOpacity: 0.3,
                            shadowRadius: 14,
                            elevation: 8,
                        }}
                        disabled={!name.trim() || !day || isLoading}
                        activeOpacity={0.85}
                        onPress={handleSaveProfile}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text className="text-lg font-headline-bold text-white">
                                {isFirstTime ? 'Join Mandali' : 'Update Profile'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default SetupProfileScreen;
