import React from 'react';
import { useIsTablet } from '../../hooks/useIsTablet';
import { View, Text, ScrollView, TouchableOpacity, Alert, Share, FlatList, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Image } from 'expo-image';
import ImageViewing from "react-native-image-viewing";
import { useAuthStore } from '../../stores/authStore';
import { deleteMemory } from '../../lib/api';
import { useQueryClient } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';

import { ImageZoom } from '@likashefqet/react-native-image-zoom';

const MemoryDetailScreen = () => {
    const { width, height } = useWindowDimensions();
    const isTablet = useIsTablet();
    const navigation = useNavigation<any>();
    const route = useRoute();
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const { memories, initialIndex, groupName } = route.params as { memories: any[], initialIndex: number, groupName: string };

    const [currentIndex, setCurrentIndex] = React.useState(initialIndex);

    const handleDelete = (memoryId: string) => {
        Alert.alert(
            'Delete Memory',
            'Are you sure you want to permanently remove this moment?',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Delete', 
                    style: 'destructive', 
                    onPress: async () => {
                        try {
                            await deleteMemory(memoryId);
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

    const handleShare = async (url: string) => {
        try {
            await Share.share({
                message: `Check out this memory from Mandali: ${url}`,
                url: url
            });
        } catch (error) {
            console.error(error);
        }
    };

    const handleDownload = async (url: string) => {
        try {
            Alert.alert('Downloading...', 'Saving this memory to your device...', [], { cancelable: true });
            
            const { status } = await MediaLibrary.requestPermissionsAsync(true);
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Please allow Mandali to save photos to your gallery to enable downloads.');
                return;
            }

            const filename = url.split('/').pop()?.split('?')[0] || `mandali_memory_${Date.now()}.jpg`;
            // @ts-ignore
            const fileUri = `${FileSystem.cacheDirectory}${filename}`;

            // @ts-ignore
            const downloadedFile = await FileSystem.downloadAsync(url, fileUri);
            
            if (downloadedFile.status === 200) {
                await MediaLibrary.saveToLibraryAsync(downloadedFile.uri);
                Alert.alert('Success', 'Photo seamlessly saved to your gallery!');
            } else {
                throw new Error('Network returned abnormal status');
            }
        } catch (error) {
            console.error('[Download Error]', error);
            Alert.alert('Error', 'We encountered an issue saving this photo.');
        }
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

    const renderItem = ({ item, index }: { item: any, index: number }) => {
        const isOwner = user?.id === item.memory.user_id;
        const memoryDate = item.memory.memory_date || item.memory.created_at;

        return (
            <View style={{ width, height: '100%' }}>
                <SafeAreaView className="flex-1 bg-black" edges={['top', 'bottom']}>
                    
                    {/* 1. Modal Header */}
                    <View className={`flex-row items-center justify-between z-30 ${isTablet ? 'px-12 py-6' : 'px-6 py-4'}`}>
                        <TouchableOpacity 
                            onPress={() => navigation.goBack()}
                            className={`rounded-full bg-white/10 items-center justify-center border border-white/20 ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}
                        >
                            <Ionicons name="close" size={isTablet ? 36 : 24} color="white" />
                        </TouchableOpacity>
                        
                        <View className={`flex-row items-center bg-white/10 rounded-full border border-white/10 ${isTablet ? 'px-6 py-3' : 'px-4 py-2'}`}>
                            <View className="items-end mr-3">
                                <Text className={`text-white font-headline-bold ${isTablet ? 'text-xl' : 'text-sm'}`}>{item.memory.user?.name}</Text>
                                <Text className={`text-white/60 font-body-bold uppercase tracking-widest ${isTablet ? 'text-xs mt-1' : 'text-[9px]'}`}>
                                    {new Date(memoryDate).toLocaleDateString()}
                                </Text>
                            </View>
                            <View className={`rounded-full border border-white/30 overflow-hidden ${isTablet ? 'w-14 h-14' : 'w-8 h-8'}`}>
                                {item.memory.user?.avatar_url ? (
                                    <Image 
                                        source={{ uri: item.memory.user.avatar_url }} 
                                        style={{ width: '100%', height: '100%' }} 
                                        contentFit="cover"
                                    />
                                ) : (
                                    <View className="w-full h-full bg-stone-500 items-center justify-center">
                                        <Ionicons name="person" size={isTablet ? 20 : 14} color="white" />
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* 2. Full Image View Container - Enforced Uniform Dimensions */}
                    <View className="flex-1 justify-center z-10 w-full mt-2">
                        <ImageZoom 
                            uri={item.url} 
                            style={{ width: width, height: height * 0.65 }}
                            resizeMode="contain"
                            minScale={1}
                            maxScale={5}
                            doubleTapScale={3}
                            isSingleTouchPanEnabled={false}
                        />
                    </View>

                    {/* 3. Action Bar (Horizontal) & Description Stack */}
                    <View className={`bg-stone-900/40 border-t border-white/10 pt-4 pb-6 z-30 ${isTablet ? 'px-20' : 'px-8'}`}>
                        
                        {/* Horizontal Actions Strip */}
                        <View className="flex-row items-center justify-between mb-4 pb-4 border-b border-white/10">
                            <View className="flex-row gap-8">
                                <TouchableOpacity onPress={() => handleDownload(item.url)} className={`items-center justify-center bg-white/5 rounded-full ${isTablet ? 'w-16 h-16' : 'w-12 h-12'}`}>
                                    <Ionicons name="download-outline" size={isTablet ? 28 : 22} color="white" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleShare(item.url)} className={`items-center justify-center bg-white/5 rounded-full ${isTablet ? 'w-16 h-16' : 'w-12 h-12'}`}>
                                    <Ionicons name="share-outline" size={isTablet ? 28 : 22} color="white" />
                                </TouchableOpacity>
                            </View>

                            {isOwner && (
                                <TouchableOpacity onPress={() => handleDelete(item.memory.id)} className={`items-center justify-center bg-red-500/10 border border-red-500/20 rounded-full ${isTablet ? 'w-16 h-16' : 'w-12 h-12'}`}>
                                    <MaterialCommunityIcons name="delete-outline" size={isTablet ? 28 : 22} color="#ef4444" />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Description Section */}
                        {item.memory.story ? (
                            <Text 
                                className={`text-white/95 font-body-medium leading-relaxed ${isTablet ? 'text-2xl' : 'text-base'}`}
                                numberOfLines={3}
                                ellipsizeMode="tail"
                            >
                                {item.memory.story}
                            </Text>
                        ) : (
                            <Text className={`text-white/30 font-body-bold italic ${isTablet ? 'text-xl' : 'text-sm'}`}>No story attached</Text>
                        )}
                        
                    </View>
                </SafeAreaView>
            </View>
        );
    };

    return (
        <View className="flex-1 bg-black">
            <FlatList
                data={memories}
                renderItem={renderItem}
                keyExtractor={(item, index) => `${item.memory.id}-${index}`}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={initialIndex}
                getItemLayout={(data, index) => ({
                    length: width,
                    offset: width * index,
                    index,
                })}
                onMomentumScrollEnd={(e) => {
                    const index = Math.round(e.nativeEvent.contentOffset.x / width);
                    setCurrentIndex(index);
                }}
            />
        </View>
    );
};

export default MemoryDetailScreen;
