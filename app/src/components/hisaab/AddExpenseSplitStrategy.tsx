import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface SplitStrategyProps {
    isTablet: boolean;
    splitType: 'equal' | 'exact';
    setSplitType: (val: 'equal' | 'exact') => void;
}

const AddExpenseSplitStrategy = ({ isTablet, splitType, setSplitType }: SplitStrategyProps) => (
    <View>
        <Text className={`font-body-bold text-[#594048] mb-3 ml-1 uppercase tracking-wider ${isTablet ? 'text-xl' : 'text-[12px]'}`}>Split Strategy</Text>
        <View className="flex-row gap-4">
            <TouchableOpacity
                onPress={() => setSplitType('equal')}
                activeOpacity={0.7}
                className={`flex-1 flex-row items-center justify-center rounded-[24px] border ${isTablet ? 'py-10' : 'py-5'} ${splitType === 'equal' ? 'bg-[#1c1c18] border-[#1c1c18] shadow-lg shadow-black/20' : 'bg-white border-stone-100 shadow-sm'}`}
            >
                <MaterialIcons name="people" size={isTablet ? 32 : 22} color={splitType === 'equal' ? 'white' : '#594048'} style={{ marginRight: 8 }} />
                <Text className={`font-headline-bold ${isTablet ? 'text-2xl' : 'text-base'} ${splitType === 'equal' ? 'text-white' : 'text-stone-500'}`}>Equally</Text>
            </TouchableOpacity>
            <TouchableOpacity
                onPress={() => setSplitType('exact')}
                activeOpacity={0.7}
                className={`flex-1 flex-row items-center justify-center rounded-[24px] border ${isTablet ? 'py-10' : 'py-5'} ${splitType === 'exact' ? 'bg-[#1c1c18] border-[#1c1c18] shadow-lg shadow-black/20' : 'bg-white border-stone-100 shadow-sm'}`}
            >
                <MaterialIcons name="calculate" size={isTablet ? 32 : 22} color={splitType === 'exact' ? 'white' : '#594048'} style={{ marginRight: 8 }} />
                <Text className={`font-headline-bold ${isTablet ? 'text-2xl' : 'text-base'} ${splitType === 'exact' ? 'text-white' : 'text-stone-500'}`}>Exact</Text>
            </TouchableOpacity>
        </View>
    </View>
);

export default AddExpenseSplitStrategy;
