import React from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ExactSplitSelectorProps {
    isTablet: boolean;
    members: any[];
    selectedMemberIds: string[];
    toggleMember: (id: string) => void;
    exactAmounts: Record<string, string>;
    setExactAmount: (id: string, val: string) => void;
    equalSplitValue: string;
}

const AddExpenseExactSplitSelector = ({
    isTablet,
    members,
    selectedMemberIds,
    toggleMember,
    exactAmounts,
    setExactAmount,
    equalSplitValue
}: ExactSplitSelectorProps) => {
    return (
        <View className="bg-white rounded-[32px] p-2 border border-stone-100 shadow-sm">
            {members.map((member, index) => {
                const isSelected = selectedMemberIds.includes(member.id);
                return (
                    <View
                        key={member.id}
                        className={`flex-row items-center justify-between p-4 ${index !== members.length - 1 ? 'border-b border-stone-50' : ''}`}
                    >
                        <TouchableOpacity 
                            onPress={() => toggleMember(member.id)}
                            className="flex-row items-center flex-1 mr-2"
                            activeOpacity={0.7}
                        >
                            <View className={`${isTablet ? 'w-12 h-12' : 'w-9 h-9'} rounded-full items-center justify-center mr-3 ${isSelected ? 'bg-[#b30069]/10' : 'bg-stone-50'}`}>
                                <Text className={`font-headline-bold ${isTablet ? 'text-xl' : 'text-sm'} ${isSelected ? 'text-[#b30069]' : 'text-stone-400'}`}>
                                    {member.name[0]?.toUpperCase() || '?'}
                                </Text>
                            </View>
                            <View className="flex-1">
                                <Text 
                                    numberOfLines={1}
                                    className={`font-body-bold text-[#1c1c18] ${isTablet ? 'text-xl' : 'text-[13px]'} ${!isSelected ? 'text-stone-400' : ''}`}
                                >
                                    {member.name}
                                </Text>
                            </View>
                        </TouchableOpacity>
                        
                        {isSelected ? (
                            <View 
                                className="flex-row items-center bg-stone-50 rounded-xl px-3 py-2 border border-stone-100" 
                                style={{ width: isTablet ? 140 : 100 }}
                            >
                                <Text className="font-headline-bold text-stone-400 mr-1 text-xs">₹</Text>
                                <TextInput
                                    className="font-headline-bold text-[#1c1c18] flex-1 text-right"
                                    style={{ fontSize: isTablet ? 22 : 15, padding: 0 }}
                                    keyboardType="decimal-pad"
                                    value={exactAmounts[member.id] || ''}
                                    onChangeText={(val) => setExactAmount(member.id, val)}
                                    placeholder="0"
                                    maxLength={8}
                                />
                            </View>
                        ) : (
                            <TouchableOpacity onPress={() => toggleMember(member.id)}>
                                <Ionicons
                                    name="square-outline"
                                    size={isTablet ? 32 : 24}
                                    color="#d6d3d1"
                                />
                            </TouchableOpacity>
                        )}
                    </View>
                );
            })}
        </View>
    );
};

export default AddExpenseExactSplitSelector;
