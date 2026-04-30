import React from 'react';
import { View, Text } from 'react-native';

const SectionHeader = ({ item, isTablet }: any) => (
    <View className={`px-5 pt-${isTablet ? '12' : '8'} pb-6 flex-row items-center justify-between`}>
        <Text className="text-[#31302d] font-headline-bold" style={{ fontSize: isTablet ? 52 : 28 }}>
            {item.label}
        </Text>
        <View className={`bg-stone-50 rounded-full border border-stone-100 ${isTablet ? 'px-8 py-3' : 'px-3 py-1'}`}>
            <Text className={`text-stone-300 font-body-bold uppercase tracking-widest ${isTablet ? 'text-xl' : 'text-[10px]'}`}>{item.count} Photos</Text>
        </View>
    </View>
);

export default SectionHeader;
