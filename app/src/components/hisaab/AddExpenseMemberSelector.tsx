import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import AddExpenseEqualSplitSelector from './AddExpenseEqualSplitSelector';
import AddExpenseExactSplitSelector from './AddExpenseExactSplitSelector';

interface MemberSelectorProps {
    isTablet: boolean;
    actualMembers: any[];
    selectedMemberIds: string[];
    toggleMember: (id: string) => void;
    toggleAllMembers: () => void;
    splitType: 'equal' | 'exact';
    exactAmounts: Record<string, string>;
    setExactAmount: (id: string, val: string) => void;
    totalAmount: number;
    exactTotal: number;
    equalSplitValue: string;
}

const AddExpenseMemberSelector = ({ 
    isTablet, 
    actualMembers, 
    selectedMemberIds, 
    toggleMember, 
    toggleAllMembers,
    splitType,
    exactAmounts,
    setExactAmount,
    totalAmount,
    exactTotal,
    equalSplitValue
}: MemberSelectorProps) => {
    const isSumMatching = Math.abs(exactTotal - totalAmount) < 0.1;
    const isAllSelected = selectedMemberIds.length === actualMembers.length && actualMembers.length > 0;

    return (
        <View>
            <View className="flex-row items-center justify-between mb-4 ml-1">
                <View>
                    <Text className={`font-body-bold text-[#594048] uppercase tracking-wider ${isTablet ? 'text-xl' : 'text-[12px]'}`}>Involved Members</Text>
                    {splitType === 'exact' && (
                        <Text className={`font-body-bold ${isSumMatching ? 'text-green-600' : 'text-red-500'} ${isTablet ? 'text-lg' : 'text-[10px]'}`}>
                            Sum: ₹{exactTotal.toFixed(2)} / ₹{totalAmount.toFixed(2)}
                        </Text>
                    )}
                </View>
                <View className="flex-row items-center">
                    <TouchableOpacity 
                        onPress={toggleAllMembers}
                        activeOpacity={0.7}
                        className="mr-3 bg-stone-100 px-3 py-1 rounded-full border border-stone-200"
                    >
                        <Text className={`font-body-bold text-stone-500 uppercase tracking-widest ${isTablet ? 'text-base' : 'text-[8px]'}`}>
                            {isAllSelected ? 'Deselect All' : 'Select All'}
                        </Text>
                    </TouchableOpacity>
                    <View className="bg-[#b30069]/10 px-3 py-1 rounded-full">
                        <Text className={`font-body-bold text-[#b30069] uppercase tracking-widest ${isTablet ? 'text-base' : 'text-[9px]'}`}>{selectedMemberIds.length} Selected</Text>
                    </View>
                </View>
            </View>

            {actualMembers.length === 0 ? (
                <View className="bg-white rounded-[32px] p-10 items-center justify-center border border-stone-100 shadow-sm">
                    <ActivityIndicator color="#b30069" />
                </View>
            ) : (
                splitType === 'equal' ? (
                    <AddExpenseEqualSplitSelector 
                        isTablet={isTablet}
                        members={actualMembers}
                        selectedMemberIds={selectedMemberIds}
                        toggleMember={toggleMember}
                    />
                ) : (
                    <AddExpenseExactSplitSelector 
                        isTablet={isTablet}
                        members={actualMembers}
                        selectedMemberIds={selectedMemberIds}
                        toggleMember={toggleMember}
                        exactAmounts={exactAmounts}
                        setExactAmount={setExactAmount}
                        equalSplitValue={equalSplitValue}
                    />
                )
            )}
        </View>
    );
};

export default AddExpenseMemberSelector;
