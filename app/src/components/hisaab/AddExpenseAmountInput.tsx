import React from 'react';
import { View, Text, TextInput, useWindowDimensions } from 'react-native';
import { useIsTablet } from '../../hooks/useIsTablet';

interface AddExpenseAmountInputProps {
    amount: string;
    setAmount: (val: string) => void;
}

const AddExpenseAmountInput = ({ amount, setAmount }: AddExpenseAmountInputProps) => {
    const isTablet = useIsTablet();
    const { width } = useWindowDimensions();
    const amountFontSize = isTablet ? 84 : Math.min(60, width / 6);

    return (
        <View className={`items-center ${isTablet ? 'mb-16' : 'mb-10'}`}>
            <Text className={`font-body-bold uppercase tracking-[3px] text-[#b30069] ${isTablet ? 'text-lg mb-6' : 'text-[10px] mb-3'}`}>Amount Details</Text>
            <View className="flex-row items-center justify-center w-full">
                <Text className={`font-headline-bold text-primary mr-2 ${isTablet ? 'text-6xl' : 'text-4xl'}`}>₹</Text>
                <TextInput
                    className="font-headline-bold text-[#1c1c18] text-center p-0 m-0"
                    style={{ 
                        fontSize: amountFontSize,
                        height: amountFontSize * 1.2,
                        minWidth: 100,
                        textAlignVertical: 'center',
                        includeFontPadding: false
                    }}
                    placeholder="0"
                    placeholderTextColor="#e1e1e1"
                    keyboardType="decimal-pad"
                    value={amount}
                    onChangeText={setAmount}
                    autoFocus
                    selectionColor="#b30069"
                />
            </View>
        </View>
    );
};

export default AddExpenseAmountInput;
