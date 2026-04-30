import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import OnThisDayItem from './OnThisDayItem';

const OnThisDaySection = ({ item, isTablet, today, openDetail }: any) => (
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
                <OnThisDayItem memory={memory} isTablet={isTablet} today={today} openDetail={openDetail} />
            )}
        />
        <View className="h-[1px] bg-stone-100 w-full mt-10" />
    </View>
);

export default OnThisDaySection;
