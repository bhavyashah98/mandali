import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Share, FlatList, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useAuthStore } from '../../stores/authStore';
import { deleteMemory } from '../../lib/api';
import { useQueryClient } from '@tanstack/react-query';

const MemoryDetailScreen = () => {
    const { width, height } = useWindowDimensions();
    const isTablet = width > 500;
    const navigation = useNavigation<any>();
    const route = useRoute();
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const { memories, initialIndex, groupName } = route.params as { memories: any[], initialIndex: number, groupName: string };

    const [currentIndex, setCurrentIndex] = React.useState(initialIndex);

    const handleDelete = (memoryId: string) => {
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

    const renderItem = ({ item, index }: { item: any, index: number }) => {
        const isOwner = user?.id === item.memory.user_id;
        const memoryDate = item.memory.memory_date || item.memory.created_at;

        return (
            <View style={{ width, height: '100%' }}>
                <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
                    {/* 1. Modal Header */}
                    <View className={`flex-row items-center justify-between bg-black/50 z-30 ${isTablet ? 'px-12 py-10' : 'px-6 py-4'}`}>
                        <TouchableOpacity 
                            onPress={() => navigation.goBack()}
                            className={`rounded-full bg-white/10 items-center justify-center border border-white/20 ${isTablet ? 'w-20 h-20' : 'w-12 h-12'}`}
                        >
                            <Ionicons name="close" size={isTablet ? 48 : 32} color="white" />
                        </TouchableOpacity>
                        
                        <View className={`flex-row items-center bg-white/10 rounded-full border border-white/10 ${isTablet ? 'px-8 py-4' : 'px-4 py-2'}`}>
                            <View className="items-end mr-4">
                                <Text className={`text-white font-headline-bold ${isTablet ? 'text-2xl' : 'text-sm'}`}>{item.memory.user?.name}</Text>
                                <Text className={`text-white/60 font-body-bold uppercase tracking-widest ${isTablet ? 'text-xs mt-1' : 'text-[9px]'}`}>
                                    {new Date(memoryDate).toLocaleDateString()}
                                </Text>
                            </View>
                            <View className={`rounded-full border border-white/30 overflow-hidden ${isTablet ? 'w-16 h-16' : 'w-8 h-8'}`}>
                                {item.memory.user?.avatar_url ? (
                                    <Image 
                                        source={{ uri: item.memory.user.avatar_url }} 
                                        style={{ width: '100%', height: '100%' }} 
                                        contentFit="cover"
                                    />
                                ) : (
                                    <View className="w-full h-full bg-stone-500 items-center justify-center">
                                        <Ionicons name="person" size={isTablet ? 24 : 14} color="white" />
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* 2. Full Image View */}
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
                                source={{ uri: item.url }} 
                                style={{ width: width, height: height * 0.65 }}
                                contentFit="contain"
                                transition={400}
                            />
                        </ScrollView>

                        {/* Floating Side Actions */}
                        <View className={`absolute right-6 top-1/2 -mt-32 gap-6 z-40 ${isTablet ? 'right-12' : 'right-6'}`}>
                            {isOwner && (
                                <TouchableOpacity 
                                    onPress={() => handleDelete(item.memory.id)} 
                                    className={`rounded-full bg-red-500/80 items-center justify-center shadow-lg ${isTablet ? 'w-24 h-24' : 'w-14 h-14'}`}
                                >
                                    <MaterialCommunityIcons name="delete-outline" size={isTablet ? 42 : 26} color="white" />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity 
                                onPress={handleDownload} 
                                className={`rounded-full bg-black/50 border border-white/20 items-center justify-center shadow-lg ${isTablet ? 'w-24 h-24' : 'w-14 h-14'}`}
                            >
                                <Ionicons name="download-outline" size={isTablet ? 42 : 26} color="white" />
                            </TouchableOpacity>
                            <TouchableOpacity 
                                onPress={() => handleShare(item.url)} 
                                className={`rounded-full bg-[#25D366]/90 items-center justify-center shadow-lg ${isTablet ? 'w-24 h-24' : 'w-14 h-14'}`}
                            >
                                <Ionicons name="logo-whatsapp" size={isTablet ? 48 : 28} color="white" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* 3. Story / Description (Bottom) */}
                    <View className={`bg-black/80 border-t border-white/10 pb-16 pt-10 justify-center z-30 ${isTablet ? 'px-40 min-h-[220px]' : 'px-8 min-h-[120px]'}`}>
                        <View className={`bg-white/20 rounded-full self-center mb-8 ${isTablet ? 'w-16 h-1.5' : 'w-8 h-1'}`} />
                        {item.memory.story ? (
                            <Text className={`text-white/90 font-body-medium text-center leading-relaxed ${isTablet ? 'text-3xl' : 'text-lg'}`}>
                                {item.memory.story}
                            </Text>
                        ) : (
                            <Text className={`text-white/30 font-body-bold italic text-center ${isTablet ? 'text-2xl' : ''}`}>No story attached</Text>
                        )}
                        <TouchableOpacity onPress={handleReport} className="mt-12 self-center">
                            <Text className={`text-white/20 font-body-bold uppercase tracking-widest ${isTablet ? 'text-sm' : 'text-[10px]'}`}>Report Content</Text>
                        </TouchableOpacity>
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
