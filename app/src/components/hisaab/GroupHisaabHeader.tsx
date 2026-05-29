import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useIsTablet } from '../../hooks/useIsTablet';
import { useNavigation } from '@react-navigation/native';

interface GroupHisaabHeaderProps {
    groupName: string;
    onAddExpense: () => void;
    readOnly?: boolean;
}

const GroupHisaabHeader = ({ groupName, onAddExpense, readOnly }: GroupHisaabHeaderProps) => {
    const isTablet = useIsTablet();
    const navigation = useNavigation();

    return (
        <View className={`px-6 py-4 flex-row items-center justify-between ${isTablet ? 'mt-8' : 'mt-2'}`}>
            <View className="flex-row items-center flex-1">
                <TouchableOpacity 
                    onPress={() => navigation.goBack()} 
                    className={`${isTablet ? 'w-16 h-16' : 'w-10 h-10'} bg-white rounded-full items-center justify-center shadow-sm border border-stone-100 mr-4`}
                >
                    <MaterialIcons name="arrow-back-ios" size={isTablet ? 24 : 18} color="#b30069" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
                <View className="flex-1">
                    <Text className={`font-headline-bold text-[#1c1c18] ${isTablet ? 'text-4xl' : 'text-xl'}`} numberOfLines={1}>{groupName}</Text>
                    <Text className={`font-body-bold text-[#b30069] uppercase tracking-widest ${isTablet ? 'text-lg' : 'text-[10px]'}`}>Hisaab Audit</Text>
                </View>
            </View>

            {!readOnly ? (
                <TouchableOpacity
                    onPress={onAddExpense}
                    className={`${isTablet ? 'w-20 h-20 rounded-3xl' : 'w-12 h-12 rounded-2xl'} bg-primary items-center justify-center shadow-lg shadow-primary/20`}
                >
                    <MaterialIcons name="add" size={isTablet ? 42 : 28} color="white" />
                </TouchableOpacity>
            ) : null}
        </View>
    );
};

export default GroupHisaabHeader;
