import React, { useState, useMemo, useRef, memo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    useWindowDimensions,
    Alert,
    Share,
    Animated,
    TouchableWithoutFeedback,
    StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';

//Image
import PinchableImage from '../common/PinchableImage';

import {
    fetchMemoryComments,
    fetchMemoryReactions,
    toggleMemoryReaction,
    getOptimizedImageUrl
} from '../../lib/api';

interface InstagramPostCardProps {
    id: string;
    memory: any;
    scrollRef: any;
    currentUser: any;
    isTablet: boolean;
    initialPhotoUrl?: string;
    onOpenComments: (id: string) => void;
    onOpenReactions: (id: string) => void;
    onDelete: (id: string) => void;
    onReport: (id: string, groupId: string) => void;
    readOnly?: boolean;
}

const InstagramPostCard: React.FC<InstagramPostCardProps> = ({
    memory,
    scrollRef,
    currentUser,
    isTablet,
    initialPhotoUrl,
    onOpenComments,
    onOpenReactions,
    onDelete,
    onReport,
    readOnly
}) => {
    const { width } = useWindowDimensions();
    const queryClient = useQueryClient();

    const uploaderName = memory.user?.name || 'Unknown';
    const uploaderAvatar = memory.user?.avatar_url;
    const isOwner = currentUser?.id === memory.user_id;

    const heartScale = useRef(new Animated.Value(0)).current;
    const [showHeartPop, setShowHeartPop] = useState(false);

    // Parse image URLs
    const imageUrls = useMemo(() => {
        let urls: string[] = [];
        try {
            if (memory.image_urls) {
                if (Array.isArray(memory.image_urls)) {
                    urls = memory.image_urls;
                } else if (typeof memory.image_urls === 'string') {
                    if (memory.image_urls.startsWith('{')) {
                        urls = memory.image_urls.slice(1, -1).split(',').map((s: string) => s.trim().replace(/^"|"$/g, ''));
                    } else {
                        urls = JSON.parse(memory.image_urls);
                    }
                }
            }
        } catch (e) {
            console.error('[Card] Error parsing image urls:', e);
        }
        return urls;
    }, [memory.image_urls]);

    // Calculate initial index for carousel
    const initialPhotoIndex = useMemo(() => {
        if (!initialPhotoUrl) return 0;
        const idx = imageUrls.indexOf(initialPhotoUrl);
        return idx >= 0 ? idx : 0;
    }, [imageUrls, initialPhotoUrl]);

    const [activeDot, setActiveDot] = useState(initialPhotoIndex);

    // Format memory upload date
    const formattedDate = useMemo(() => {
        const dateStr = memory.memory_date || memory.created_at;
        if (!dateStr) return '';
        try {
            return new Date(dateStr).toLocaleDateString([], {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        } catch {
            return '';
        }
    }, [memory.memory_date, memory.created_at]);

    const commentCount = memory.commentCount || 0;
    const baseSummary = memory.reactionsSummary || {};
    const apiUserReaction = memory.userReaction || null;

    // Toggle Reaction Mutation
    const reactionMutation = useMutation({
        mutationFn: () => toggleMemoryReaction(memory.id, '❤️'),
        onMutate: async () => {
            await queryClient.cancelQueries({
                queryKey: ['memories']
            });

            const previousData = queryClient.getQueriesData({
                queryKey: ['memories']
            });

            queryClient.setQueriesData(
                { queryKey: ['memories'] },
                (oldData: any) => {
                    if (!oldData) return oldData;

                    return {
                        ...oldData,
                        pages: oldData.pages.map((page: any) => ({
                            ...page,
                            memories: page.memories.map((m: any) => {
                                if (m.id !== memory.id) return m;

                                const alreadyLiked = !!m.userReaction;

                                return {
                                    ...m,
                                    userReaction: alreadyLiked ? null : '❤️',

                                    reactionsSummary: {
                                        ...m.reactionsSummary,
                                        '❤️': Math.max(
                                            0,
                                            (m.reactionsSummary?.['❤️'] || 0) +
                                            (alreadyLiked ? -1 : 1)
                                        )
                                    }
                                };
                            })
                        }))
                    };
                }
            );

            return { previousData };
        },

        onError: (_err, _vars, context) => {
            if (context?.previousData) {
                context.previousData.forEach(([queryKey, data]: any) => {
                    queryClient.setQueryData(queryKey, data);
                });
            }
        },

        onSettled: () => {
            queryClient.invalidateQueries({
                queryKey: ['memories']
            });
        }
    });

    const totalReactions = Object.values(memory.reactionsSummary).reduce((acc: number, val: any) => acc + val, 0);

    const isLiked = !!memory.userReaction;

    // Double tap heart pop animation
    const animateHeartPop = () => {
        setShowHeartPop(true);
        Animated.sequence([
            Animated.spring(heartScale, {
                toValue: 1.2,
                friction: 3,
                tension: 40,
                useNativeDriver: true
            }),
            Animated.timing(heartScale, {
                toValue: 0,
                duration: 150,
                delay: 350,
                useNativeDriver: true
            })
        ]).start(() => {
            setShowHeartPop(false);
        });
    };

    const handleLikePress = () => {
        reactionMutation.mutate();
    };

    const handleImagePress = () => {
        reactionMutation.mutate();
        if (!isLiked) {
            animateHeartPop();
        }
    };

    // Handle Share
    const handleShare = async () => {
        if (imageUrls.length === 0) return;
        try {
            await Share.share({
                message: `Check out this memory from Mandali: ${imageUrls[0]}`,
                url: imageUrls[0]
            });
        } catch (error) {
            console.error(error);
        }
    };

    // Handle Download
    const handleDownload = async () => {
        if (imageUrls.length === 0) return;
        const url = imageUrls[activeDot] || imageUrls[0];
        try {
            Alert.alert('Downloading...', 'Saving this memory to your device...', [], { cancelable: true });

            const { status } = await MediaLibrary.requestPermissionsAsync(true);
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Please allow Mandali to save photos to your gallery.');
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

    const handleMorePress = () => {
        Alert.alert(
            'Options',
            undefined,
            isOwner && !readOnly
                ? [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete Memory', style: 'destructive', onPress: () => onDelete(memory.id) }
                ]
                : [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Report Memory', style: 'destructive', onPress: () => onReport(memory.id, memory.group_id) }
                ]
        );
    };

    const avatarUri = useMemo(() => ({ uri: getOptimizedImageUrl(uploaderAvatar, 'w_100,h_100,c_fill,q_auto,f_auto') }), [uploaderAvatar]);

    const optimizedSources = useMemo(() => {
        const map = new Map();
        imageUrls.forEach(url => {
            map.set(url, { uri: getOptimizedImageUrl(url, 'w_600,h_600,c_fill,q_auto:good,f_auto,dpr_auto') });
        });
        return map;
    }, [imageUrls]);

    return (
        <View className="w-full bg-white mb-6 border-b border-stone-100 pb-4">
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 py-3">
                <View className="flex-row items-center">
                    <View className="w-9 h-9 rounded-full border border-stone-200 overflow-hidden mr-3">
                        {uploaderAvatar ? (
                            <Image
                                source={avatarUri}
                                style={{ width: '100%', height: '100%' }}
                                contentFit="cover"
                            />
                        ) : (
                            <View className="w-full h-full bg-stone-100 items-center justify-center">
                                <Ionicons name="person" size={16} color="#b30069" opacity={0.6} />
                            </View>
                        )}
                    </View>
                    <View>
                        <Text className="text-stone-900 font-headline-bold text-sm leading-tight">{uploaderName}</Text>
                        <Text className="text-stone-400 font-body-medium text-[10px] mt-0.5">{formattedDate}</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={handleMorePress} className="p-1">
                    <Ionicons name="ellipsis-horizontal" size={20} color="#594048" />
                </TouchableOpacity>
            </View>

            {/* Media Zoomable view */}
            <View style={{ width, height: width }} className="bg-stone-50 relative">
                {imageUrls.length > 1 ? (
                    <View className="relative">
                        <FlatList
                            data={imageUrls}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            initialScrollIndex={initialPhotoIndex}
                            onScrollToIndexFailed={(info) => {
                                // Fallback
                            }}
                            onMomentumScrollEnd={(e) => {
                                const index = Math.round(e.nativeEvent.contentOffset.x / width);
                                setActiveDot(index);
                            }}
                            renderItem={({ item: url }) => (
                                <PinchableImage source={optimizedSources.get(url)}
                                    style={{ width, height: width }}
                                    id={url}
                                />
                            )}
                            keyExtractor={(item, index) => `${item}_${index}`}
                        />
                        {/* Overlay dot indicators */}
                        <View className="flex-row justify-center items-center py-2 bg-transparent gap-1.5 absolute bottom-4 left-0 right-0">
                            {imageUrls.map((_, i) => (
                                <View
                                    key={i}
                                    className={`h-1.5 rounded-full ${activeDot === i ? 'w-3 bg-[#b30069]' : 'w-1.5 bg-white/60'
                                        }`}
                                />
                            ))}
                        </View>
                    </View>
                ) : imageUrls.length === 1 ? (
                    <PinchableImage source={optimizedSources.get(imageUrls[0])}
                        style={{ width, height: width }}
                        id={imageUrls[0]}
                    />
                ) : (
                    <View className="w-full h-full justify-center items-center">
                        <Ionicons name="image-outline" size={48} color="#e8c4d8" />
                    </View>
                )}

                {/* Animated Heart Overlay */}
                {showHeartPop && (
                    <View style={StyleSheet.absoluteFillObject} className="items-center justify-center bg-black/5 z-50">
                        <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                            <Ionicons name="heart" size={90} color="#b30069" />
                        </Animated.View>
                    </View>
                )}
            </View>

            {/* Action Bar */}
            <View className="flex-row items-center justify-between px-4 pt-3.5 pb-2">
                <View className="flex-row items-center gap-5">
                    {/* Like button with inline count */}
                    <TouchableOpacity
                        onPress={handleLikePress}
                        onLongPress={() => onOpenReactions(memory.id)}
                        className="flex-row items-center gap-1 active:scale-125"
                    >
                        <Ionicons
                            name={isLiked ? 'heart' : 'heart-outline'}
                            size={26}
                            color={isLiked ? '#b30069' : '#1c1c18'}
                        />
                        {totalReactions > 0 && (
                            <Text className="text-stone-700 font-headline-bold text-xs ml-0.5">{totalReactions}</Text>
                        )}
                    </TouchableOpacity>

                    {/* Comment button with inline count */}
                    <TouchableOpacity
                        onPress={() => onOpenComments(memory.id)}
                        className="flex-row items-center gap-1 active:scale-125"
                    >
                        <Ionicons name="chatbubble-outline" size={24} color="#1c1c18" />
                        {commentCount > 0 && (
                            <Text className="text-stone-700 font-headline-bold text-xs ml-0.5">{commentCount}</Text>
                        )}
                    </TouchableOpacity>

                    {/* Share button */}
                    <TouchableOpacity
                        onPress={handleShare}
                        className="flex-row items-center gap-1 active:scale-125"
                    >
                        <Ionicons name="paper-plane-outline" size={24} color="#1c1c18" />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={handleDownload} className="active:scale-125">
                    <Ionicons name="download-outline" size={24} color="#1c1c18" />
                </TouchableOpacity>
            </View>

            {/* Story / Caption */}
            <View className="px-4 mt-2">
                <Text className="text-stone-900 font-body-medium text-sm leading-relaxed">
                    <Text className="font-headline-bold mr-1.5">{uploaderName} </Text>
                    {memory.story || ''}
                </Text>
            </View>

            {/* Comments Inline Preview */}
            {/* Comments Inline Preview */}
            {commentCount > 0 && (
                <View className="px-4 mt-2">
                    <TouchableOpacity onPress={() => onOpenComments(memory.id)}>
                        <Text className="text-xs font-body-bold text-[#b30069]/85 mb-1.5">
                            View all {commentCount} comments
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

export default memo(InstagramPostCard);
