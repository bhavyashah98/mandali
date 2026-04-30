import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { getOptimizedImageUrl } from '../../lib/api';

const MemoryGridItem = ({ photo, COLUMN_COUNT, openDetail }: any) => {
    const gridUrl = getOptimizedImageUrl(photo.url, 'c_fill,w_300,h_300,q_auto,f_auto');
    const blurUrl = getOptimizedImageUrl(photo.url, 'w_50,h_50,e_blur:2000,q_10');

    return (
        <View style={{ width: `${100 / COLUMN_COUNT}%`, aspectRatio: 1, padding: 1 }}>
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => openDetail(photo.url, photo.memory.id)}
                className="w-full h-full bg-stone-50 overflow-hidden"
            >
                <Image
                    source={{ uri: gridUrl }}
                    placeholder={{ uri: blurUrl }}
                    placeholderContentFit="cover"
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    transition={200}
                    priority="high"
                    recyclingKey={gridUrl}
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

export default MemoryGridItem;
