import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { getOptimizedImageUrl } from '../../lib/api';

const OnThisDayItem = ({ memory, isTablet, today, openDetail }: any) => {
    const gridUrl = getOptimizedImageUrl(memory.image_urls[0], 'c_fill,w_600,h_800,q_auto,f_auto');
    const blurUrl = getOptimizedImageUrl(memory.image_urls[0], 'w_50,h_50,e_blur:2000,q_10');

    return (
        <TouchableOpacity
            onPress={() => openDetail(memory.image_urls[0], memory.id)}
            className="mr-6 rounded-[48px] overflow-hidden bg-stone-100 shadow-xl"
            style={{ width: isTablet ? 320 : 150, height: isTablet ? 440 : 200 }}
        >
            <Image
                source={{ uri: gridUrl }}
                placeholder={{ uri: blurUrl }}
                style={{ width: '100%', height: '100%' }}
                placeholderContentFit="cover"
                contentFit="cover"
                transition={200}
                priority="high"
                recyclingKey={gridUrl}
                cachePolicy="memory-disk"
            />
            <BlurView tint="dark" intensity={25} className={`absolute inset-x-0 bottom-0 p-6 justify-center ${isTablet ? 'h-32' : 'h-16'}`}>
                <Text className={`text-white font-body-bold uppercase tracking-widest text-center ${isTablet ? 'text-xl' : 'text-xs'}`}>
                    {today.getFullYear() - new Date(memory.memory_date || memory.created_at).getFullYear()} Years Ago
                </Text>
            </BlurView>
        </TouchableOpacity>
    );
};

export default OnThisDayItem;
