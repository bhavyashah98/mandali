import React, { useMemo, useEffect } from 'react';
import { useIsTablet } from '../../hooks/useIsTablet';
import { View, Text, FlatList, TouchableOpacity, useWindowDimensions, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { fetchMemories, fetchGroupDetail, getOptimizedImageUrl } from '../../lib/api';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';

const MemoryGridItem = ({ photo, COLUMN_COUNT, openDetail }: any) => {
    // High-res Prefetch Trigger - Now matching the 900x900 Detail View size
    useEffect(() => {
        if (photo.url) {
            Image.prefetch(getOptimizedImageUrl(photo.url, 'w_900,h_900,c_limit,q_auto,f_auto'));
        }
    }, [photo.url]);

    return (
        <View style={{ width: `${100 / COLUMN_COUNT}%`, aspectRatio: 1, padding: 1 }}>
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => openDetail(photo.url, photo.memory.id)}
                className="w-full h-full bg-stone-50 overflow-hidden"
            >
                <Image
                    source={{ uri: getOptimizedImageUrl(photo.url, 'w_300,h_300,c_fill,g_auto,f_auto,q_auto') }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    transition={300}
                    cachePolicy="memory-disk"
                />
                <View className="absolute bottom-1.5 right-1.5 w-4 h-4 rounded-full border border-white/40 bg-white/10 overflow-hidden">
                    {photo.memory.user?.avatar_url && (
                        <Image source={{ uri: getOptimizedImageUrl(photo.memory.user.avatar_url, 'w_50,q_auto,f_auto') }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    )}
                </View>
            </TouchableOpacity>
        </View>
    );
};

const MemoriesScreen = () => {
    const { width } = useWindowDimensions();
    const isTablet = useIsTablet();
    const COLUMN_COUNT = isTablet ? 5 : 3;
    const navigation = useNavigation<any>();
    const route = useRoute();
    const params = route.params as { groupId: string } | undefined;
    const groupId = params?.groupId;
    const today = new Date();

    const { data: group } = useQuery({
        queryKey: ['groupDetail', groupId],
        queryFn: () => fetchGroupDetail(groupId!),
        enabled: !!groupId,
    });

    const {
        data: infiniteData,
        isLoading,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
        refetch
    } = useInfiniteQuery({
        queryKey: ['memories', groupId],
        queryFn: ({ pageParam = 0 }) => fetchMemories(groupId!, pageParam, 30),
        getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.page + 1 : undefined,
        enabled: !!groupId,
        initialPageParam: 0,
    });

    const [refreshing, setRefreshing] = React.useState(false);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

    // Consolidate all memories from all pages
    const allMemories = useMemo(() => {
        return infiniteData?.pages.flatMap(page => page.memories) || [];
    }, [infiniteData]);

    // 'On This Day' Filter (Only from initial payload for speed)
    const onThisDayMemories = useMemo(() => {
        const t = new Date();
        return allMemories.filter(m => {
            const d = new Date(m.memory_date || m.created_at);
            return d.getMonth() === t.getMonth() &&
                d.getDate() === t.getDate() &&
                d.getFullYear() < t.getFullYear();
        }).slice(0, 5); // Keep it light
    }, [allMemories]);

    // Flatten all photos for swiping
    const flattenedMemories = useMemo(() => {
        const flat: any[] = [];
        allMemories.forEach((memory: any) => {
            let urls: string[] = [];
            try {
                if (memory.image_urls) {
                    if (Array.isArray(memory.image_urls)) {
                        urls = memory.image_urls;
                    } else if (typeof memory.image_urls === 'string') {
                        if (memory.image_urls.startsWith('{')) {
                            urls = memory.image_urls.slice(1, -1).split(',').map(s => s.trim().replace(/^"|"$/g, ''));
                        } else {
                            urls = JSON.parse(memory.image_urls);
                        }
                    }
                }
            } catch (e) {
                console.error('[Memories] Data parsing error:', e);
            }
            urls.forEach(url => {
                flat.push({ url, memory });
            });
        });
        return flat;
    }, [allMemories]);

    // Grouping logic for the grid
    const groupedMemories = useMemo(() => {
        const groups: Record<string, any[]> = {};

        allMemories.forEach((memory: any) => {
            const date = new Date(memory.memory_date || memory.created_at);
            const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });
            if (!groups[monthYear]) groups[monthYear] = [];
            groups[monthYear].push(memory);
        });

        return Object.entries(groups).map(([label, items]) => {
            let photoCount = 0;
            const flattenedItems: any[] = [];
            items.forEach(item => {
                const urls = Array.isArray(item.image_urls) ? item.image_urls : [];
                photoCount += urls.length;
                urls.forEach(url => flattenedItems.push({ url, memory: item }));
            });
            return { label, items: flattenedItems, count: photoCount };
        });
    }, [allMemories]);

    // Flattened data for FlatList, including section headers
    const listData = useMemo(() => {
        const result: any[] = [];
        if (onThisDayMemories.length > 0) {
            result.push({ type: 'on_this_day', data: onThisDayMemories });
        }

        groupedMemories.forEach(section => {
            result.push({ type: 'section_header', label: section.label, count: section.count });

            // Group grid photos into rows for the simple FlatList implementation
            for (let i = 0; i < section.items.length; i += COLUMN_COUNT) {
                result.push({
                    type: 'grid_row',
                    photos: section.items.slice(i, i + COLUMN_COUNT)
                });
            }
        });
        return result;
    }, [onThisDayMemories, groupedMemories, COLUMN_COUNT]);

    const openDetail = (url: string, memoryId: string) => {
        const index = flattenedMemories.findIndex(fm => fm.url === url && fm.memory.id === memoryId);
        navigation.navigate('MemoryDetail', {
            memories: flattenedMemories,
            initialIndex: index >= 0 ? index : 0,
            groupName: group?.group?.name || 'Mandali'
        });
    };

    const renderItem = ({ item }: { item: any }) => {
        if (item.type === 'on_this_day') {
            return (
                <View className={`mt-${isTablet ? '10' : '6'} px-5 mb-6`}>
                    <View className="flex-row items-center mb-8">
                        <Ionicons name="sparkles" size={isTablet ? 42 : 18} color="#b38b00" />
                        <Text className={`ml-4 text-[#b38b00] font-headline-bold tracking-tight ${isTablet ? 'text-4xl' : 'text-lg'}`}>On This Day</Text>
                    </View>
                    <FlatList
                        data={item.data}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(m) => `on-this-day-${m.id}`}
                        renderItem={({ item: memory }) => (
                            <TouchableOpacity
                                onPress={() => openDetail(memory.image_urls[0], memory.id)}
                                className="mr-6 rounded-[48px] overflow-hidden bg-stone-100 shadow-xl"
                                style={{ width: isTablet ? 320 : 150, height: isTablet ? 440 : 200 }}
                            >
                                <Image
                                    source={{ uri: getOptimizedImageUrl(memory.image_urls[0], 'w_600,q_auto,f_auto') }}
                                    style={{ width: '100%', height: '100%' }}
                                    contentFit="cover"
                                />
                                <BlurView tint="dark" intensity={25} className={`absolute inset-x-0 bottom-0 p-6 justify-center ${isTablet ? 'h-32' : 'h-16'}`}>
                                    <Text className={`text-white font-body-bold uppercase tracking-widest text-center ${isTablet ? 'text-xl' : 'text-xs'}`}>
                                        {today.getFullYear() - new Date(memory.memory_date || memory.created_at).getFullYear()} Years Ago
                                    </Text>
                                </BlurView>
                            </TouchableOpacity>
                        )}
                    />
                    <View className="h-[1px] bg-stone-100 w-full mt-10" />
                </View>
            );
        }

        if (item.type === 'section_header') {
            return (
                <View className={`px-5 pt-${isTablet ? '12' : '8'} pb-6 flex-row items-center justify-between`}>
                    <Text className="text-[#31302d] font-headline-bold" style={{ fontSize: isTablet ? 52 : 28 }}>
                        {item.label}
                    </Text>
                    <View className={`bg-stone-50 rounded-full border border-stone-100 ${isTablet ? 'px-8 py-3' : 'px-3 py-1'}`}>
                        <Text className={`text-stone-300 font-body-bold uppercase tracking-widest ${isTablet ? 'text-xl' : 'text-[10px]'}`}>{item.count} Photos</Text>
                    </View>
                </View>
            );
        }

        if (item.type === 'grid_row') {
            return (
                <View className="flex-row">
                    {item.photos.map((photo: any, idx: number) => (
                        <MemoryGridItem
                            key={`photo-${photo.memory.id}-${idx}`}
                            photo={photo}
                            COLUMN_COUNT={COLUMN_COUNT}
                            openDetail={openDetail}
                        />
                    ))}
                    {/* Filler views to maintain alignment for non-full rows */}
                    {item.photos.length < COLUMN_COUNT && (
                        Array(COLUMN_COUNT - item.photos.length).fill(0).map((_, i) => (
                            <View key={`filler-${i}`} style={{ width: `${100 / COLUMN_COUNT}%`, aspectRatio: 1 }} />
                        ))
                    )}
                </View>
            );
        }

        return null;
    };

    if (isLoading && !infiniteData) {
        return (
            <View className="flex-1 bg-white items-center justify-center">
                <ActivityIndicator size="large" color="#b30069" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-white">
            <SafeAreaView edges={['top']} className="bg-white" />

            <View className={`flex-row items-center px-6 ${isTablet ? 'py-8' : 'py-4'}`}>
                <View style={{ width: isTablet ? 64 : 44 }}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        className={`items-center justify-center rounded-full bg-white shadow-sm border border-stone-100 ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}
                    >
                        <MaterialIcons name="arrow-back-ios" size={isTablet ? 28 : 20} color="#b30069" style={{ marginLeft: isTablet ? 12 : 5 }} />
                    </TouchableOpacity>
                </View>

                <View className="flex-1 items-center">
                    <Text className="font-headline-bold text-[#1c1c18] text-center" style={{ fontSize: isTablet ? 32 : 20 }} numberOfLines={1} adjustsFontSizeToFit>
                        {group?.group?.name || 'Mandali'}
                    </Text>
                    <Text className="font-body-bold text-[#b30069] opacity-60 uppercase tracking-widest text-center" style={{ fontSize: isTablet ? 18 : 10, marginTop: isTablet ? 2 : 0 }}>
                        Memories
                    </Text>
                </View>

                <View style={{ width: isTablet ? 64 : 44 }} className="items-end">
                    <TouchableOpacity
                        onPress={() => navigation.navigate('CreateMemory', { groupId })}
                        className={`items-center justify-center rounded-full bg-[#b30069] shadow-md ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}
                    >
                        <Ionicons name="add" size={isTablet ? 36 : 24} color="white" />
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={listData}
                renderItem={renderItem}
                keyExtractor={(item, index) => `${item.type}-${item.label || index}`}
                onEndReached={() => hasNextPage && fetchNextPage()}
                onEndReachedThreshold={0.7}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#b30069" />
                }
                ListEmptyComponent={
                    <View className="items-center justify-center py-40 px-12">
                        <View className={`rounded-full bg-[#fdf9f3] items-center justify-center mb-8 ${isTablet ? 'w-32 h-32' : 'w-20 h-20'}`}>
                            <Ionicons name="images-outline" size={isTablet ? 48 : 32} color="#e8c4d8" />
                        </View>
                        <Text className={`text-[#594048] font-headline-bold text-center mb-4 ${isTablet ? 'text-4xl' : 'text-xl'}`}>No moments captured yet</Text>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('CreateMemory', { groupId })}
                            className={`mt-10 bg-[#b30069] rounded-[32px] items-center justify-center shadow-xl shadow-primary/20 ${isTablet ? 'px-16 py-6' : 'px-8 py-4'}`}
                        >
                            <Text className={`text-white font-headline-bold ${isTablet ? 'text-2xl' : 'text-base'}`}>Preserve a Moment</Text>
                        </TouchableOpacity>
                    </View>
                }
                ListFooterComponent={
                    isFetchingNextPage ? (
                        <View className="py-10">
                            <ActivityIndicator color="#b30069" />
                        </View>
                    ) : <View className="h-40" />
                }
            />
        </View>
    );
};

export default MemoriesScreen;
