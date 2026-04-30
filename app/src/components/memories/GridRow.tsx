import React from 'react';
import { View } from 'react-native';
import MemoryGridItem from './MemoryGridItem';

const GridRow = ({ item, COLUMN_COUNT, openDetail }: any) => (
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

export default GridRow;
