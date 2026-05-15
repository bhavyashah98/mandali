import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EqualSplitSelectorProps {
    isTablet: boolean;
    members: any[];
    selectedMemberIds: string[];
    toggleMember: (id: string) => void;
}

const AddExpenseEqualSplitSelector = ({
    isTablet,
    members,
    selectedMemberIds,
    toggleMember
}: EqualSplitSelectorProps) => {
    return (
        <View className="bg-white rounded-[32px] p-2 border border-stone-100 shadow-sm">
            {members.map((member, index) => {
                const isSelected = selectedMemberIds.includes(member.id);
                return (
                    <TouchableOpacity
                        key={member.id}
                        onPress={() => toggleMember(member.id)}
                        activeOpacity={0.6}
                        className={`flex-row items-center justify-between p-4 ${index !== members.length - 1 ? 'border-b border-stone-50' : ''}`}
                    >
                        <View className="flex-row items-center flex-1">
                            <View className={`${isTablet ? 'w-16 h-16' : 'w-11 h-11'} rounded-full items-center justify-center mr-4 ${isSelected ? 'bg-[#b30069]/10' : 'bg-stone-50'}`}>
                                <Text className={`font-headline-bold ${isTablet ? 'text-2xl' : 'text-base'} ${isSelected ? 'text-[#b30069]' : 'text-stone-400'}`}>
                                    {member.name[0]?.toUpperCase() || '?'}
                                </Text>
                            </View>
                            <View className="flex-1">
                                <Text className={`font-headline-bold text-[#1c1c18] ${isTablet ? 'text-3xl' : 'text-lg'}`}>{member.name}</Text>
                            </View>
                        </View>
                        <Ionicons
                            name={isSelected ? "checkbox" : "square-outline"}
                            size={isTablet ? 36 : 28}
                            color={isSelected ? "#b30069" : "#d6d3d1"}
                        />
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

export default AddExpenseEqualSplitSelector;
