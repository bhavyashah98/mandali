import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    Image,
    ScrollView,
    Platform,
    KeyboardAvoidingView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { createGroup, uploadImage } from '../../lib/api';

const CreateGroupScreen = () => {
    const navigation = useNavigation();
    const queryClient = useQueryClient();
    
    const [groupName, setGroupName] = useState('');
    const [description, setDescription] = useState('');
    const [groupImage, setGroupImage] = useState<string | null>(null);

    const createMutation = useMutation({
        mutationFn: async () => {
            let uploadedUrl = null;
            if (groupImage) {
                uploadedUrl = await uploadImage(groupImage);
            }
            return createGroup({
                name: groupName.trim(),
                description: description.trim(),
                coverPhotoUrl: uploadedUrl,
            });
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            Alert.alert('Success', `"${data.group.name}" created!`, [
                { text: 'OK', onPress: () => navigation.goBack() },
            ]);
        },
        onError: (err: any) => {
            console.error('[CreateGroup] Error:', err?.response?.data || err.message);
            Alert.alert('Error', err?.response?.data?.error || 'Failed to create group');
        }
    });

    const handleCreateGroup = () => {
        if (!groupName.trim()) return;
        createMutation.mutate();
    };

    const loading = createMutation.isPending;

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please allow access to your photo library to add a group photo.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled && result.assets[0]) {
            setGroupImage(result.assets[0].uri);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            {/* Top Bar */}
            <View className="flex-row items-center justify-between px-4 py-3.5 bg-background">
                <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 items-center justify-center">
                    <MaterialIcons name="arrow-back" size={24} color="#b30069" />
                </TouchableOpacity>
                <Text className="text-[22px] font-headline-bold text-on-surface text-center">New Group</Text>
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
                    {/* Add Group Photo */}
                    <View className="items-center mb-8 mt-2">
                        <TouchableOpacity onPress={pickImage} activeOpacity={0.7} className="items-center">
                            <View className="relative mb-2.5">
                                <View
                                    className="w-[120px] h-[120px] rounded-full items-center justify-center overflow-hidden border-[3px] border-white"
                                    style={{
                                        backgroundColor: '#f3e8ef',
                                        shadowColor: '#b30069',
                                        shadowOffset: { width: 0, height: 4 },
                                        shadowOpacity: 0.12,
                                        shadowRadius: 12,
                                        elevation: 4,
                                    }}
                                >
                                    {groupImage ? (
                                        <Image source={{ uri: groupImage }} className="w-full h-full" resizeMode="cover" />
                                    ) : (
                                        <MaterialIcons name="group" size={48} color="#b30069" />
                                    )}
                                </View>
                                <View className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary border-2 border-background items-center justify-center">
                                    <MaterialIcons name="camera-alt" size={14} color="white" />
                                </View>
                            </View>
                            <Text className="text-sm font-body-bold text-on-surface-variant">Add Group Photo</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Group Name */}
                    <View className="mb-5">
                        <Text className="text-[15px] font-body-bold text-on-surface mb-2 ml-1">Group Name</Text>
                        <View className="bg-surface-container rounded-[20px] px-5 justify-center" style={{ height: 56 }}>
                            <TextInput
                                placeholder="Family Reunion"
                                placeholderTextColor="#a09d96"
                                style={{ height: 56, padding: 0, margin: 0, fontSize: 15, color: '#1c1c18', letterSpacing: 0, textAlignVertical: 'center', includeFontPadding: false, paddingVertical: 0 }}
                                value={groupName}
                                onChangeText={setGroupName}
                            />
                        </View>
                    </View>

                    {/* Description */}
                    <View className="mb-6">
                        <Text className="text-[15px] font-body-bold text-on-surface mb-2 ml-1">Description (Optional)</Text>
                        <View className="bg-surface-container rounded-3xl px-5 pt-4" style={{ minHeight: 120 }}>
                            <TextInput
                                placeholder="A place for our games, laughs and memories"
                                placeholderTextColor="#a09d96"
                                style={{ padding: 0, margin: 0, textAlignVertical: 'top', fontSize: 15, color: '#1c1c18', letterSpacing: 0 }}
                                multiline
                                numberOfLines={4}
                                value={description}
                                onChangeText={setDescription}
                            />
                        </View>
                    </View>

                    {/* Privacy Info Card */}
                    <View className="flex-row items-start bg-primary/5 rounded-3xl p-5 mb-7 border border-primary/10">
                        <View className="mr-3.5 mt-0.5">
                            <MaterialIcons name="lock" size={22} color="#b30069" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-[15px] font-body-bold text-on-surface mb-1">Private by Default</Text>
                            <Text className="text-[13px] font-body-regular text-on-surface-variant leading-5">
                                Your group and its conversations are private. Only people you invite will be able to see or join your Mandali.
                            </Text>
                        </View>
                    </View>

                    {/* Create Button */}
                    <TouchableOpacity
                        className={`w-full h-[58px] rounded-full items-center justify-center ${groupName.trim() && !loading ? 'bg-primary' : 'bg-primary/50'}`}
                        style={{
                            shadowColor: '#b30069',
                            shadowOffset: { width: 0, height: 6 },
                            shadowOpacity: 0.3,
                            shadowRadius: 14,
                            elevation: 8,
                        }}
                        disabled={!groupName.trim() || loading}
                        activeOpacity={0.85}
                        onPress={handleCreateGroup}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text className="text-lg font-headline-bold text-white">Create Group</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default CreateGroupScreen;
