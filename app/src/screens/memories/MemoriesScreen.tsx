import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { fetchMemories, fetchGroupDetail } from '../../lib/api';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;

const MemoriesScreen = () => {
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

    const { data: memories, isLoading } = useQuery({
        queryKey: ['memories', groupId],
        queryFn: async () => {
            const data = await fetchMemories(groupId!);
            return data;
        },
        enabled: !!groupId,
    });

    // 'On This Day' Filter
    const onThisDayMemories = useMemo(() => {
        if (!memories) return [];
        const t = new Date();
        return memories.filter(m => {
            const d = new Date(m.created_at);
            return d.getMonth() === t.getMonth() && 
                   d.getDate() === t.getDate() && 
                   d.getFullYear() < t.getFullYear();
        });
    }, [memories]);

    const groupedMemories = useMemo(() => {
        if (!memories) return [];
        const groups: Record<string, any[]> = {};
        
        memories.forEach((memory: any) => {
            const date = new Date(memory.created_at);
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

    const openDetail = (url: string, memory: any) => {
        navigation.navigate('MemoryDetail', { 
            url, 
            memory, 
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
            <View className="px-6 py-4 flex-row items-center justify-between bg-white border-b border-stone-100">
                <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 items-center justify-center">
                    <MaterialIcons name="arrow-back-ios" size={20} color="#b30069" style={{ marginLeft: 5 }} />
                </TouchableOpacity>
                <View className="flex-1 items-center px-4">
                    <Text className="text-[#31302d] font-headline-bold text-lg" numberOfLines={1}>
                        {group?.group?.name || 'Mandali'}
                    </Text>
                    <Text className="text-stone-400 font-body-bold text-[10px] uppercase tracking-widest mt-0.5">Gallery</Text>
                </View>
                <TouchableOpacity 
                    onPress={() => navigation.navigate('CreateMemory', { groupId })}
                    className="w-10 h-10 items-center justify-center rounded-full bg-primary/5"
                >
                    <Ionicons name="add" size={24} color="#b30069" />
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                
                {/* ── ON THIS DAY SECTION ── */}
                {onThisDayMemories.length > 0 && (
                    <View className="mt-6 px-5">
                        <View className="flex-row items-center mb-4">
                            <Ionicons name="sparkles" size={18} color="#b38b00" />
                            <Text className="ml-2 text-[#b38b00] font-headline-bold text-lg uppercase tracking-tight">On This Day</Text>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row overflow-visible">
                            {onThisDayMemories.map((memory, index) => (
                                <TouchableOpacity 
                                    key={index}
                                    onPress={() => openDetail(memory.image_urls[0], memory)}
                                    className="mr-3 rounded-[32px] overflow-hidden bg-stone-100 shadow-sm"
                                    style={{ width: 150, height: 200 }}
                                >
                                    <Image source={{ uri: memory.image_urls[0] }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                                    <BlurView tint="dark" intensity={20} className="absolute inset-x-0 bottom-0 p-3 h-16 justify-center">
                                        <Text className="text-white font-body-bold text-xs uppercase tracking-widest">
                                            {today.getFullYear() - new Date(memory.created_at).getFullYear()} Years Ago
                                        </Text>
                                    </BlurView>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <View className="h-[1px] bg-stone-100 w-full mt-8" />
                    </View>
                )}

                {groupedMemories.length === 0 ? (
                    <View className="items-center justify-center py-40 px-12">
                         <View className="w-20 h-20 rounded-full bg-[#fdf9f3] items-center justify-center mb-6">
                            <Ionicons name="images-outline" size={32} color="#e8c4d8" />
                         </View>
                         <Text className="text-[#594048] font-headline-bold text-xl text-center mb-2">No moments captured yet</Text>
                         <TouchableOpacity 
                            onPress={() => navigation.navigate('CreateMemory', { groupId })}
                            className="mt-6 bg-[#b30069] px-8 py-3 rounded-full"
                         >
                            <Text className="text-white font-headline-bold">Preserve a Moment</Text>
                         </TouchableOpacity>
                    </View>
                ) : (
                    groupedMemories.map((section, sidx) => (
                        <View key={sidx} className="mb-4">
                            <View className="px-5 py-6 flex-row items-center justify-between">
                                <Text className="text-[#31302d] font-headline-bold text-2xl">{section.label}</Text>
                                <View className="bg-stone-50 px-3 py-1 rounded-full border border-stone-100">
                                    <Text className="text-stone-300 font-body-bold text-[10px] uppercase tracking-widest">{section.count} Photos</Text>
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

                                    return urls.map((url: string, midx: number) => (
                                        <View 
                                            key={`${memory.id}-${midx}`}
                                            style={{ 
                                                width: `${100/COLUMN_COUNT}%`,
                                                aspectRatio: 1,
                                                padding: 1
                                            }}
                                        >
                                            <TouchableOpacity 
                                                activeOpacity={0.9}
                                                onPress={() => openDetail(url, memory)}
                                                className="w-full h-full bg-stone-100 overflow-hidden"
                                            >
                                                <Image 
                                                    source={{ uri: url }} 
                                                    style={{ width: '100%', height: '100%' }}
                                                    contentFit="cover"
                                                    transition={300}
                                                    cachePolicy="memory-disk"
                                                />
                                                {/* Personal Touch: Uploader Badge */}
                                                <View className="absolute bottom-1 right-1 w-5 h-5 rounded-full border border-white/50 bg-white/20 overflow-hidden">
                                                    {memory.user?.avatar_url && (
                                                        <Image source={{ uri: memory.user.avatar_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                                                    )}
                                                </View>
                                            </TouchableOpacity>
                                        </View>
                                    ))
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
