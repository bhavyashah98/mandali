import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { fetchMemories, fetchGroupDetail } from '../../lib/api';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';

const { width, height } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const GAP = 2; // Pixel gap between items
const GRID_SIZE = (width / COLUMN_COUNT); // Width inclusive of gaps if using margins differently

const MemoriesScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute();
    const params = route.params as { groupId: string } | undefined;
    const groupId = params?.groupId;

    const [selectedMoment, setSelectedMoment] = useState<{ url: string, memory: any } | null>(null);

    const { data: group } = useQuery({
        queryKey: ['groupDetail', groupId],
        queryFn: () => fetchGroupDetail(groupId!),
        enabled: !!groupId,
    });

    const { data: memories, isLoading } = useQuery({
        queryKey: ['memories', groupId],
        queryFn: async () => {
            const data = await fetchMemories(groupId!);
            console.log('[Memories] Raw data from API:', JSON.stringify(data, null, 2));
            return data;
        },
        enabled: !!groupId,
    });

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
            return {
                label,
                items,
                count: photoCount
            };
        });
    }, [memories]);

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
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            {/* Header */}
            <View className="px-6 py-4 flex-row items-center justify-between bg-white/80 border-b border-stone-100">
                <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 items-center justify-center">
                    <MaterialIcons name="arrow-back-ios" size={20} color="#b30069" style={{ marginLeft: 5 }} />
                </TouchableOpacity>
                <View className="flex-1 items-center px-4">
                    <Text className="text-[#31302d] font-headline-bold text-lg" numberOfLines={1}>
                        {group?.group?.name || 'Mandali'}
                    </Text>
                    <Text className="text-stone-400 font-body-bold text-[10px] uppercase tracking-widest mt-0.5">Memories</Text>
                </View>
                <TouchableOpacity 
                    onPress={() => navigation.navigate('CreateMemory', { groupId })}
                    className="w-10 h-10 items-center justify-center rounded-full bg-primary/5"
                >
                    <Ionicons name="add" size={24} color="#b30069" />
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
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
                            <View className="px-5 py-4 flex-row items-center justify-between">
                                <Text className="text-[#31302d] font-headline-bold text-xl">{section.label}</Text>
                                <Text className="text-stone-300 font-body-bold text-[10px] uppercase tracking-widest">{section.count} Photos</Text>
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
                                                onPress={() => setSelectedMoment({ url, memory })}
                                                className="w-full h-full bg-stone-100 overflow-hidden"
                                            >
                                                <Image 
                                                    source={{ uri: url }} 
                                                    style={{ width: '100%', height: '100%' }}
                                                    contentFit="cover"
                                                    transition={300}
                                                    cachePolicy="memory-disk"
                                                    onLoad={() => console.log(`[OK] Image Load: ${url.substring(0, 30)}`)}
                                                    onError={(e) => console.error(`[ERR] Image Load: ${url}`, e)}
                                                />
                                            </TouchableOpacity>
                                        </View>
                                    ))
                                })}
                            </View>
                        </View>
                    ))
                )}
                <View className="h-20" />
            </ScrollView>

            {/* Immersive Detail Modal */}
            <Modal visible={!!selectedMoment} transparent animationType="fade">
                <View className="flex-1 bg-black">
                    <Pressable onPress={() => setSelectedMoment(null)} className="absolute inset-0 z-0" />
                    <SafeAreaView className="flex-1" pointerEvents="box-none">
                        {/* Modal Header */}
                        <View className="flex-row items-center justify-between px-6 py-4 z-10">
                            <TouchableOpacity 
                                onPress={() => setSelectedMoment(null)}
                                className="w-10 h-10 rounded-full bg-black/20 items-center justify-center"
                            >
                                <Ionicons name="close" size={28} color="white" />
                            </TouchableOpacity>
                            <View className="flex-row items-center">
                                <View className="items-end mr-3">
                                    <Text className="text-white font-headline-bold text-base">{selectedMoment?.memory.user?.name}</Text>
                                    <Text className="text-white/60 font-body-medium text-[10px] uppercase tracking-wider">
                                        {selectedMoment && new Date(selectedMoment.memory.created_at).toLocaleDateString()}
                                    </Text>
                                </View>
                                <View className="w-10 h-10 rounded-full bg-white/20 border border-white/30 overflow-hidden">
                                    {selectedMoment?.memory.user?.avatar_url && (
                                        <Image 
                                            source={{ uri: selectedMoment.memory.user.avatar_url }} 
                                            style={{ width: '100%', height: '100%' }} 
                                            contentFit="cover"
                                        />
                                    )}
                                </View>
                            </View>
                        </View>

                        {/* Full Image */}
                        <View className="flex-1 justify-center z-5">
                            <Image 
                                source={{ uri: selectedMoment?.url }} 
                                style={{ width: '100%', height: '60%' }}
                                contentFit="contain"
                                transition={500}
                            />
                        </View>

                        {/* Story Overlay */}
                        {selectedMoment?.memory.story ? (
                            <View className="px-8 pb-12 pt-8 bg-gradient-to-t from-black via-black/80 to-transparent z-10">
                                <View className="w-12 h-1 bg-white/30 rounded-full self-center mb-6" />
                                <Text className="text-white/80 font-body-medium text-lg leading-7">
                                    {selectedMoment.memory.story}
                                </Text>
                            </View>
                        ) : (
                            <View className="p-12 items-center z-10">
                                <Text className="text-white/30 font-body-bold italic">No story attached to this moment</Text>
                            </View>
                        )}
                    </SafeAreaView>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

export default MemoriesScreen;
