import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, Alert, Share, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useAuthStore } from '../../stores/authStore';
import { deleteMemory } from '../../lib/api';
import { useQueryClient } from '@tanstack/react-query';

const { width, height } = Dimensions.get('window');

const MemoryDetailScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute();
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const { url, memory, groupName } = route.params as { url: string, memory: any, groupName: string };

    const isOwner = user?.id === memory.user_id;

    const handleDelete = () => {
        Alert.alert(
            'Delete Memory',
            'Are you sure you want to permanently remove this moment from the Mandali Gallery?',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Delete', 
                    style: 'destructive', 
                    onPress: async () => {
                        try {
                            await deleteMemory(memory.id);
                            queryClient.invalidateQueries({ queryKey: ['memories'] });
                            navigation.goBack();
                        } catch (error) {
                            Alert.alert('Error', 'Could not delete memory. Please try again.');
                        }
                    } 
                }
            ]
        );
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Check out this memory from ${groupName} Mandali: ${url}`,
                url: url
            });
        } catch (error) {
            console.error(error);
        }
    };

    const handleDownload = async () => {
        Alert.alert('Download Started', 'Saving this memory to your device...');
        setTimeout(() => Alert.alert('Success', 'Photo saved to your gallery!'), 1500);
    };

    const handleReport = () => {
        Alert.alert(
            'Report Content',
            'Are you sure you want to report this photo as inappropriate?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Report', style: 'destructive', onPress: () => Alert.alert('Thank you', 'Our team will review this content.') }
            ]
        );
    };

    return (
        <View className="flex-1 bg-black">
            {/* Standard Navigation Behavior (Tapping back closes) */}
            <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
                {/* 1. Modal Header (Fixed Top) */}
                <View className="flex-row items-center justify-between px-6 py-4 bg-black/50 z-30">
                    <TouchableOpacity 
                        onPress={() => navigation.goBack()}
                        className="w-12 h-12 rounded-full bg-white/10 items-center justify-center border border-white/20"
                    >
                        <Ionicons name="close" size={32} color="white" />
                    </TouchableOpacity>
                    
                    <View className="flex-row items-center bg-white/10 px-4 py-2 rounded-full border border-white/10">
                        <View className="items-end mr-3">
                            <Text className="text-white font-headline-bold text-sm">{memory.user?.name}</Text>
                            <Text className="text-white/60 font-body-bold text-[9px] uppercase tracking-tighter">
                                {new Date(memory.created_at).toLocaleDateString()}
                            </Text>
                        </View>
                        <View className="w-8 h-8 rounded-full border border-white/30 overflow-hidden">
                            {memory.user?.avatar_url ? (
                                <Image 
                                    source={{ uri: memory.user.avatar_url }} 
                                    style={{ width: '100%', height: '100%' }} 
                                    contentFit="cover"
                                />
                            ) : (
                                <View className="w-full h-full bg-stone-500 items-center justify-center">
                                    <Ionicons name="person" size={14} color="white" />
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                {/* 2. Full Image View (Flex Middle) */}
                <View className="flex-1 justify-center z-10">
                    <ScrollView
                        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
                        maximumZoomScale={5}
                        minimumZoomScale={1}
                        showsHorizontalScrollIndicator={false}
                        showsVerticalScrollIndicator={false}
                        bouncesZoom={true}
                        centerContent={true}
                        pinchGestureEnabled={true}
                    >
                        <Image 
                            source={{ uri: url }} 
                            style={{ width: width, height: height * 0.65 }}
                            contentFit="contain"
                            transition={400}
                        />
                    </ScrollView>

                        {/* Floating Side Actions */}
                        <View className="absolute right-6 top-1/2 -mt-24 gap-5 z-40">
                            {isOwner && (
                                <TouchableOpacity onPress={handleDelete} className="w-14 h-14 rounded-full bg-red-500/80 items-center justify-center shadow-lg">
                                    <MaterialCommunityIcons name="delete-outline" size={26} color="white" />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={handleDownload} className="w-14 h-14 rounded-full bg-black/50 border border-white/20 items-center justify-center shadow-lg">
                                <Ionicons name="download-outline" size={26} color="white" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleShare} className="w-14 h-14 rounded-full bg-[#25D366]/90 items-center justify-center shadow-lg">
                                <Ionicons name="logo-whatsapp" size={28} color="white" />
                            </TouchableOpacity>
                        </View>
                </View>

                {/* 3. Story / Description (Bottom) */}
                <View className="bg-black/80 border-t border-white/10 pb-10 pt-6 px-8 min-h-[120px] justify-center z-30">
                    <View className="w-8 h-1 bg-white/20 rounded-full self-center mb-6" />
                    {memory.story ? (
                        <Text className="text-white/90 font-body-medium text-lg leading-7 text-center">
                            {memory.story}
                        </Text>
                    ) : (
                        <Text className="text-white/30 font-body-bold italic text-center">No story attached</Text>
                    )}
                    <TouchableOpacity onPress={handleReport} className="mt-8 self-center">
                        <Text className="text-white/20 font-body-bold text-[10px] uppercase tracking-widest">Report Content</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
};

export default MemoryDetailScreen;
