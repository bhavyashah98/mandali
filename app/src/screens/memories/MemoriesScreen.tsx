import React, { useMemo, useCallback, useEffect } from 'react';
import { useIsTablet } from '../../hooks/useIsTablet';
import { View, Text, FlatList, TouchableOpacity, useWindowDimensions, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMemories, fetchGroupDetail, getOptimizedImageUrl, markMemoriesAsSeen } from '../../lib/api';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import OnThisDaySection from '../../components/memories/OnThisDaySection';
import SectionHeader from '../../components/memories/SectionHeader';
import GridRow from '../../components/memories/GridRow';

const MemoriesScreen = () => {
    const { width } = useWindowDimensions();
    const isTablet = useIsTablet();
    const COLUMN_COUNT = isTablet ? 5 : 3;
    const navigation = useNavigation<any>();
    const route = useRoute();
    const params = route.params as { groupId: string; initialMemoryId?: string } | undefined;
    const groupId = params?.groupId;
    const today = useMemo(() => new Date(), []);
    const queryClient = useQueryClient();

    // Mark memories as seen when entering the group and refresh unseen count
    React.useEffect(() => {
        if (groupId) {
            markMemoriesAsSeen(groupId).then(() => {
                queryClient.invalidateQueries({ queryKey: ['groups'] });
            }).catch(console.error);
        }
    }, [groupId, queryClient]);

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
        queryFn: ({ pageParam = 0 }) => fetchMemories(groupId!, pageParam, 10),
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

    const openDetail = useCallback((url: string, memoryId: string) => {
        navigation.navigate('MemoryDetail', {
            groupId,
            initialMemoryId: memoryId,
            initialPhotoUrl: url,
            groupName: group?.group?.name || 'Mandali'
        });
    }, [groupId, navigation, group?.group?.name]);

    const initialMemoryId = params?.initialMemoryId;

    // Auto-navigate to specific memory if initialMemoryId is provided (e.g. from deep link / push notification)
    useEffect(() => {
        if (initialMemoryId && allMemories.length > 0) {
            const targetMemory = allMemories.find(m => String(m.id) === String(initialMemoryId));
            if (targetMemory) {
                let firstUrl = '';
                try {
                    let urls: string[] = [];
                    if (targetMemory.image_urls) {
                        if (Array.isArray(targetMemory.image_urls)) {
                            urls = targetMemory.image_urls;
                        } else if (typeof targetMemory.image_urls === 'string') {
                            if (targetMemory.image_urls.startsWith('{')) {
                                urls = targetMemory.image_urls.slice(1, -1).split(',').map((s: string) => s.trim().replace(/^"|"$/g, ''));
                            } else {
                                urls = JSON.parse(targetMemory.image_urls);
                            }
                        }
                    }
                    if (urls.length > 0) {
                        firstUrl = urls[0];
                    }
                } catch (e) {
                    console.error('[Memories] Error parsing image_urls for auto-navigate:', e);
                }

                // Clear the param to prevent redirect loop on back navigation
                navigation.setParams({ initialMemoryId: undefined });

                // Open detail
                openDetail(firstUrl, targetMemory.id);
            }
        }
    }, [initialMemoryId, allMemories, openDetail, navigation]);

    const RENDER_MAP = useMemo<Record<string, React.FC<any>>>(() => ({
        on_this_day: OnThisDaySection,
        section_header: SectionHeader,
        grid_row: GridRow,
    }), []);

    const renderItem = useCallback(({ item }: { item: any }) => {
        const Component = RENDER_MAP[item.type];
        if (!Component) return null;
        return <Component item={item} isTablet={isTablet} today={today} COLUMN_COUNT={COLUMN_COUNT} openDetail={openDetail} />;
    }, [RENDER_MAP, isTablet, today, COLUMN_COUNT, openDetail]);

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
                initialNumToRender={6}
                maxToRenderPerBatch={6}
                windowSize={3}
                removeClippedSubviews
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
