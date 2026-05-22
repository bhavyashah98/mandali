import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { getOptimizedImageUrl } from '../../lib/api';

const MemoryGridItem = ({ photo, COLUMN_COUNT, openDetail, isSelected, isSelectionMode, onToggleSelection }: any) => {
    const gridUrl = getOptimizedImageUrl(photo.url, 'c_fill,w_300,h_300,q_auto,f_auto,dpr_auto');
    const blurUrl = getOptimizedImageUrl(photo.url, 'w_50,h_50,e_blur:2000,q_10');

    const handlePress = () => {
        if (isSelectionMode) {
            onToggleSelection();
        } else {
            openDetail(photo.url, photo.memory.id);
        }
    };

    return (
        <View style={{ width: `${100 / COLUMN_COUNT}%`, aspectRatio: 1, padding: 1 }}>
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={handlePress}
                onLongPress={onToggleSelection}
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

                {/* Selected Overlay & Border */}
                {isSelected && (
                    <View 
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(179, 0, 105, 0.2)', borderWidth: 3, borderColor: '#b30069' }} 
                        pointerEvents="none" 
                    />
                )}

                {/* Selection Checkbox Badge */}
                {isSelectionMode && (
                    <View style={{ position: 'absolute', top: 6, left: 6, zIndex: 10 }}>
                        {isSelected ? (
                            <Ionicons name="checkmark-circle" size={20} color="#b30069" style={{ backgroundColor: 'white', borderRadius: 10 }} />
                        ) : (
                            <Ionicons name="ellipse-outline" size={20} color="white" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.8, shadowRadius: 1.5 }} />
                        )}
                    </View>
                )}

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
