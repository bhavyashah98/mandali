import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useIsTablet } from '../../hooks/useIsTablet';
import { View, Text, ScrollView, TouchableOpacity, Alert, Share, FlatList, useWindowDimensions, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useAuthStore } from '../../stores/authStore';
import { deleteMemory, reportContent, getOptimizedImageUrl } from '../../lib/api';
import { useQueryClient } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { ResumableZoom } from 'react-native-zoom-toolkit';

const MemoryDetailScreen = () => {
    const { width, height } = useWindowDimensions();
    const isTablet = useIsTablet();
    const navigation = useNavigation<any>();
    const route = useRoute();
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const { memories, initialIndex, groupName } = route.params as { memories: any[], initialIndex: number, groupName: string };

    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [reportModalVisible, setReportModalVisible] = useState(false);
    const [reportingTarget, setReportingTarget] = useState<{ id: string, groupId: string } | null>(null);
    const flatListRef = useRef<FlatList>(null);
    const isTransitioning = useRef(false);

    // Prefetch previous, current, and next images for smooth swiping
    useEffect(() => {
        const urlsToPrefetch: string[] = [];

        const baseParams = 'c_pad,w_900,h_900,b_black,f_auto,q_auto';

        for (let i = currentIndex - 2; i <= currentIndex + 2; i++) {
            if (i >= 0 && i < memories.length) {
                urlsToPrefetch.push(getOptimizedImageUrl(memories[i].url, baseParams));
            }
        }

        urlsToPrefetch.forEach((url) => Image.prefetch(url));
    }, [currentIndex, memories]);

    const reportReasons = useMemo(() => [
        { label: 'Spam', icon: 'mail-outline' },
        { label: 'Harassment', icon: 'hand-left-outline' },
        { label: 'Inappropriate Photo', icon: 'image-outline' },
        { label: 'Others', icon: 'ellipsis-horizontal-outline' }
    ], []);

    const handleDelete = useCallback((memoryId: string) => {
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
    }, [queryClient, navigation]);

    const handleShare = useCallback(async (url: string) => {
        try {
            await Share.share({
                message: `Check out this memory from Mandali: ${url}`,
                url: url
            });
        } catch (error) {
            console.error(error);
        }
    }, []);

    const handleDownload = useCallback(async (url: string) => {
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
    }, []);

    const handleReport = useCallback((memoryId: string, groupId: string) => {
        setReportingTarget({ id: memoryId, groupId });
        setReportModalVisible(true);
    }, []);

    const submitReport = useCallback(async (reason: string) => {
        if (!reportingTarget) return;

        try {
            await reportContent({
                contentId: reportingTarget.id,
                groupId: reportingTarget.groupId,
                reason
            });
            setReportModalVisible(false);
            Alert.alert(
                'Report Submitted',
                'Thank you for reporting. This content has been hidden from your feed and will be reviewed by our moderation team within 24 hours.',
                [{
                    text: 'OK', onPress: () => {
                        queryClient.invalidateQueries({ queryKey: ['memories'] });
                        navigation.goBack();
                    }
                }]
            );
        } catch (error) {
            Alert.alert('Error', 'Failed to submit report. Please try again.');
        }
    }, [reportingTarget, queryClient, navigation]);

    const renderItem = useCallback(({ item, index }: { item: any, index: number }) => {
        const isOwner = user?.id === item.memory.user_id;
        const memoryDate = item.memory.memory_date || item.memory.created_at;
        const blurUrl = getOptimizedImageUrl(item.url, 'w_50,h_50,e_blur:2000,q_10');
        const startTime = Date.now();

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
                                        source={{ uri: getOptimizedImageUrl(item.memory.user.avatar_url, 'w_150,q_auto,f_auto') }}
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

                    {/* 2. Full Image View Container - Native Scroll Zoom + Perfect Navigation */}
                    <View className="flex-1 justify-center items-center z-10 w-full" style={{ paddingVertical: 10 }}>
                        <ResumableZoom
                            maxScale={5}
                            minScale={1}
                            onSwipe={(direction) => {
                                if (isTransitioning.current) return;

                                if (direction === 'left' && index < memories.length - 1) {
                                    isTransitioning.current = true;
                                    flatListRef.current?.scrollToIndex({ index: index + 1, animated: true });
                                    setTimeout(() => isTransitioning.current = false, 500);
                                } else if (direction === 'right' && index > 0) {
                                    isTransitioning.current = true;
                                    flatListRef.current?.scrollToIndex({ index: index - 1, animated: true });
                                    setTimeout(() => isTransitioning.current = false, 500);
                                }
                            }}
                        >
                            <Image
                                source={{ uri: getOptimizedImageUrl(item.url, 'w_900,h_900,c_pad,b_black,f_auto,q_auto') }}
                                placeholder={{ uri: blurUrl }}
                                placeholderContentFit="cover"
                                style={{
                                    width: width,
                                    height: width,
                                }}
                                contentFit="contain"
                                cachePolicy="memory-disk"
                                transition={200}
                            />
                        </ResumableZoom>
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
                            {isOwner ? (
                                <TouchableOpacity onPress={() => handleDelete(item.memory.id)} className={`items-center justify-center bg-red-500/10 border border-red-500/20 rounded-full ${isTablet ? 'w-16 h-16' : 'w-12 h-12'}`}>
                                    <MaterialCommunityIcons name="delete-outline" size={isTablet ? 28 : 22} color="#ef4444" />
                                </TouchableOpacity>
                            ) : (
                                <View className="flex-row items-center justify-end flex-1">
                                    <TouchableOpacity
                                        onPress={() => handleReport(item.memory.id, item.memory.group_id)}
                                        className={`flex-row items-center bg-red-500/10 border border-red-500/20 rounded-2xl px-6 ${isTablet ? 'h-16' : 'h-12'}`}
                                    >
                                        <Ionicons name="shield-outline" size={isTablet ? 22 : 18} color="#ef4444" />
                                        <Text className="text-red-400 ml-3 font-body-bold text-sm">Report</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

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
                </SafeAreaView >
            </View >
        );
    }, [user?.id, width, isTablet, navigation, handleDownload, handleShare, handleDelete, handleReport]);

    const getItemLayout = useCallback((data: any, index: number) => ({
        length: width,
        offset: width * index,
        index,
    }), [width]);

    const handleMomentumScrollEnd = useCallback((e: any) => {
        const index = Math.round(e.nativeEvent.contentOffset.x / width);
        setCurrentIndex(index);
    }, [width]);


    return (
        <View className="flex-1 bg-black">
            <FlatList
                ref={flatListRef}
                data={memories}
                renderItem={renderItem}
                keyExtractor={(item, index) => `${item.memory.id}-${index}`}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={initialIndex}
                initialNumToRender={2}
                maxToRenderPerBatch={2}
                windowSize={3}
                getItemLayout={getItemLayout}
                onMomentumScrollEnd={handleMomentumScrollEnd}
            />

            {/* Premium Report Reason Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={reportModalVisible}
                onRequestClose={() => setReportModalVisible(false)}
            >
                <View className="flex-1 justify-end bg-black/60">
                    <TouchableOpacity
                        style={{ flex: 1 }}
                        activeOpacity={1}
                        onPress={() => setReportModalVisible(false)}
                    />
                    <View className="bg-stone-900 border-t border-white/10 rounded-t-[40px] px-8 pt-8 pb-12">
                        <View className="w-12 h-1 bg-white/20 rounded-full self-center mb-8" />

                        <View className="mb-8">
                            <Text className="text-white text-2xl font-headline-bold mb-2">Report Content</Text>
                            <Text className="text-white/60 font-body-medium">
                                Why are you reporting this photo? We'll review it within 24 hours.
                            </Text>
                        </View>

                        <View className="gap-3">
                            {reportReasons.map((reason) => (
                                <TouchableOpacity
                                    key={reason.label}
                                    onPress={() => submitReport(reason.label)}
                                    className="flex-row items-center bg-white/5 border border-white/10 p-4 rounded-2xl active:bg-white/10"
                                >
                                    <View className="w-10 h-10 rounded-full bg-white/10 items-center justify-center mr-4">
                                        <Ionicons name={reason.icon as any} size={20} color="white" />
                                    </View>
                                    <Text className="text-white text-base font-body-bold">{reason.label}</Text>
                                    <View className="flex-1" />
                                    <Ionicons name="chevron-forward" size={18} color="white" opacity={0.3} />
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity
                            onPress={() => setReportModalVisible(false)}
                            className="mt-8 p-4 items-center"
                        >
                            <Text className="text-white/40 font-body-bold">Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default MemoryDetailScreen;
