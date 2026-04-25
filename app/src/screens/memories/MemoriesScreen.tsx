import React, { useMemo } from 'react';
import { useIsTablet } from '../../hooks/useIsTablet';
import { View, Text, ScrollView, TouchableOpacity, useWindowDimensions, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { fetchMemories, fetchGroupDetail, getOptimizedImageUrl } from '../../lib/api';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';

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

    const { data: memories, isLoading, refetch } = useQuery({
        queryKey: ['memories', groupId],
        queryFn: async () => {
            const data = await fetchMemories(groupId!);
            return data;
        },
        enabled: !!groupId,
    });

    const [refreshing, setRefreshing] = React.useState(false);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

    // 'On This Day' Filter
    const onThisDayMemories = useMemo(() => {
        if (!memories) return [];
        const t = new Date();
        return memories.filter(m => {
            const d = new Date(m.memory_date || m.created_at);
            return d.getMonth() === t.getMonth() &&
                d.getDate() === t.getDate() &&
                d.getFullYear() < t.getFullYear();
        });
    }, [memories]);

    // Flatten all photos for swiping
    const flattenedMemories = useMemo(() => {
        if (!memories) return [];
        const flat: any[] = [];
        memories.forEach((memory: any) => {
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
    }, [memories]);

    const groupedMemories = useMemo(() => {
        if (!memories) return [];
        const groups: Record<string, any[]> = {};

        memories.forEach((memory: any) => {
            const date = new Date(memory.memory_date || memory.created_at);
            const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });
            if (!groups[monthYear]) groups[monthYear] = [];
            groups[monthYear].push(memory);
        });

        return Object.entries(groups).map(([label, items]) => {
            let photoCount = 0;
            items.forEach(item => {
                const urls = Array.isArray(item.image_urls) ? item.image_urls : [];
                photoCount += urls.length;
            });
            return { label, items, count: photoCount };
        });
    }, [memories]);

    const openDetail = (index: number) => {
        navigation.navigate('MemoryDetail', {
            memories: flattenedMemories,
            initialIndex: index,
            groupName: group?.group?.name || 'Mandali'
        });
    };

    if (isLoading) {
        return (
            <View className="flex-1 bg-[#fdf9f3] items-center justify-center">
                <ActivityIndicator size="large" color="#b30069" />
            </View>
        );
    }

    if (!groupId) {
        return (
            <SafeAreaView className="flex-1 bg-white items-center justify-center px-8">
                <View className="w-24 h-24 rounded-full bg-primary/5 items-center justify-center mb-8">
                    <MaterialIcons name="photo-library" size={48} color="#e8c4d8" />
                </View>
                <Text className="text-[#594048] font-headline-bold text-2xl text-center mb-3">Select a Mandali</Text>
                <Text className="text-stone-400 text-center font-body-medium leading-5">
                    Your memories are shared within your specific circles. Visit a Mandali to relive those moments!
                </Text>
                <TouchableOpacity
                    onPress={() => navigation.navigate('Groups')}
                    className="mt-10 bg-[#b30069] px-10 py-4 rounded-full shadow-lg shadow-[#b30069]/20"
                >
                    <Text className="text-white font-headline-bold text-lg">Go to My Mandalis</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <View className="flex-1 bg-white">
            <SafeAreaView edges={['top']} className="bg-white" />

            {/* Header */}
            <View className={`flex-row items-center px-6 ${isTablet ? 'py-8' : 'py-4'}`}>
                {/* Left Action - Fixed Width for Centering Balance */}
                <View style={{ width: isTablet ? 64 : 44 }}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        className={`items-center justify-center rounded-full bg-white shadow-sm border border-stone-100 ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}
                    >
                        <MaterialIcons name="arrow-back-ios" size={isTablet ? 28 : 20} color="#b30069" style={{ marginLeft: isTablet ? 12 : 5 }} />
                    </TouchableOpacity>
                </View>

                {/* Centered Title Stack */}
                <View className="flex-1 items-center">
                    <Text
                        className="font-headline-bold text-[#1c1c18] text-center"
                        style={{ fontSize: isTablet ? 32 : 20 }}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                    >
                        {group?.group?.name || 'Mandali'}
                    </Text>
                    <Text
                        className="font-body-bold text-[#b30069] opacity-60 uppercase tracking-widest text-center"
                        style={{ fontSize: isTablet ? 18 : 10, marginTop: isTablet ? 2 : 0 }}
                    >
                        Memories
                    </Text>
                </View>

                {/* Right Action - Fixed Width for Centering Balance */}
                <View style={{ width: isTablet ? 64 : 44 }} className="items-end">
                    <TouchableOpacity
                        onPress={() => navigation.navigate('CreateMemory', { groupId })}
                        className={`items-center justify-center rounded-full bg-[#b30069] shadow-md ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}
                    >
                        <Ionicons name="add" size={isTablet ? 36 : 24} color="white" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#b30069" />
                }
            >

                {/* ── ON THIS DAY SECTION ── */}
                {onThisDayMemories.length > 0 && (
                    <View className={`mt-${isTablet ? '10' : '6'} px-5`}>
                        <View className="flex-row items-center mb-8">
                            <Ionicons name="sparkles" size={isTablet ? 42 : 18} color="#b38b00" />
                            <Text className={`ml-4 text-[#b38b00] font-headline-bold tracking-tight ${isTablet ? 'text-4xl' : 'text-lg'}`}>On This Day</Text>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row overflow-visible">
                            {onThisDayMemories.map((memory, index) => {
                                // Find global index for swiping
                                const globalIndex = flattenedMemories.findIndex(fm => fm.memory.id === memory.id);
                                return (
                                    <TouchableOpacity
                                        key={index}
                                        onPress={() => openDetail(globalIndex >= 0 ? globalIndex : 0)}
                                        className="mr-6 rounded-[48px] overflow-hidden bg-stone-100 shadow-xl"
                                        style={{ width: isTablet ? 320 : 150, height: isTablet ? 440 : 200 }}
                                    >
                                        <Image source={{ uri: getOptimizedImageUrl(memory.image_urls[0], 'w_600,q_auto,f_auto') }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                                        <BlurView tint="dark" intensity={25} className={`absolute inset-x-0 bottom-0 p-6 justify-center ${isTablet ? 'h-32' : 'h-16'}`}>
                                            <Text className={`text-white font-body-bold uppercase tracking-widest text-center ${isTablet ? 'text-xl' : 'text-xs'}`}>
                                                {today.getFullYear() - new Date(memory.memory_date || memory.created_at).getFullYear()} Years Ago
                                            </Text>
                                        </BlurView>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                        <View className="h-[1px] bg-stone-100 w-full mt-8" />
                    </View>
                )}

                {groupedMemories.length === 0 ? (
                    <View className="items-center justify-center py-40 px-12">
                        <View className={`rounded-full bg-[#fdf9f3] items-center justify-center mb-8 ${isTablet ? 'w-32 h-32' : 'w-20 h-20'}`}>
                            <Ionicons name="images-outline" size={isTablet ? 48 : 32} color="#e8c4d8" />
                        </View>
                        <Text className={`text-[#594048] font-headline-bold text-center mb-4 ${isTablet ? 'text-4xl' : 'text-xl'}`}>No moments captured yet</Text>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('CreateMemory', { groupId })}
                            style={{
                                height: isTablet ? 110 : 54,
                                width: isTablet ? 400 : 'auto'
                            }}
                            className={`mt-10 bg-[#b30069] rounded-[32px] items-center justify-center shadow-xl shadow-primary/20 ${isTablet ? 'px-16' : 'px-8'}`}
                        >
                            <Text className={`text-white font-headline-bold ${isTablet ? 'text-2xl' : 'text-lg'}`}>Preserve a Moment</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    groupedMemories.map((section, sidx) => (
                        <View key={sidx} className={`mb-${isTablet ? '16' : '4'}`}>
                            <View className={`px-5 py-${isTablet ? '12' : '6'} flex-row items-center justify-between`}>
                                <Text
                                    className="text-[#31302d] font-headline-bold"
                                    style={{ fontSize: isTablet ? 52 : 28 }}
                                >
                                    {section.label}
                                </Text>
                                <View className={`bg-stone-50 rounded-full border border-stone-100 ${isTablet ? 'px-8 py-3' : 'px-3 py-1'}`}>
                                    <Text className={`text-stone-300 font-body-bold uppercase tracking-widest ${isTablet ? 'text-xl' : 'text-[10px]'}`}>{section.count} Photos</Text>
                                </View>
                            </View>

                            <View className="flex-row flex-wrap">
                                {section.items.map((memory: any) => {
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

                                    return urls.map((url: string, midx: number) => {
                                        // Find global index for swiping
                                        const globalIndex = flattenedMemories.findIndex(fm => fm.url === url && fm.memory.id === memory.id);

                                        return (
                                            <View
                                                key={`${memory.id}-${midx}`}
                                                style={{
                                                    width: `${100 / COLUMN_COUNT}%`,
                                                    aspectRatio: 1,
                                                    padding: 1
                                                }}
                                            >
                                                <TouchableOpacity
                                                    activeOpacity={0.9}
                                                    onPress={() => openDetail(globalIndex >= 0 ? globalIndex : 0)}
                                                    className="w-full h-full bg-stone-100 overflow-hidden"
                                                >
                                                    <Image
                                                        source={{ uri: getOptimizedImageUrl(url, 'w_400,q_auto,f_auto') }}
                                                        style={{ width: '100%', height: '100%' }}
                                                        contentFit="cover"
                                                        transition={300}
                                                        cachePolicy="memory-disk"
                                                    />
                                                    {/* Personal Touch: Uploader Badge */}
                                                    <View className="absolute bottom-1 right-1 w-5 h-5 rounded-full border border-white/50 bg-white/20 overflow-hidden">
                                                        {memory.user?.avatar_url && (
                                                            <Image source={{ uri: getOptimizedImageUrl(memory.user.avatar_url, 'w_100,q_auto,f_auto') }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                                                        )}
                                                    </View>
                                                </TouchableOpacity>
                                            </View>
                                        );
                                    })
                                })}
                            </View>
                        </View>
                    ))
                )}
                <View className="h-40" />
            </ScrollView>

            <SafeAreaView edges={['bottom']} />
        </View>
    );
};

export default MemoriesScreen;
