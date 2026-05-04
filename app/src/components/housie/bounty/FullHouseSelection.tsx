import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

interface Props {
    count: number;
    onCountChange: (newCount: number) => void;
}

const FullHouseSelection: React.FC<Props> = ({ count, onCountChange }) => {
    const increment = () => onCountChange(count + 1);
    const decrement = () => onCountChange(Math.max(1, count - 1));

    return (
        <View className="bg-white p-6 rounded-[40px] border border-stone-100 shadow-sm mb-6">
            <View className="flex-row items-center mb-5">
                <View className="w-10 h-10 bg-[#b30069]/10 rounded-2xl items-center justify-center mr-3">
                    <MaterialCommunityIcons name="home-group" size={20} color="#b30069" />
                </View>
                <View className="flex-1">
                    <Text className="font-headline-bold text-stone-800 text-lg">Full Houses</Text>
                    <Text className="font-body text-stone-400 text-xs">Number of grand prizes</Text>
                </View>

                {/* Stepper Control */}
                <View className="flex-row items-center bg-stone-50 rounded-2xl p-1 border border-stone-100">
                    <TouchableOpacity
                        onPress={decrement}
                        className="w-10 h-10 items-center justify-center bg-white rounded-xl shadow-sm"
                    >
                        <Ionicons name="remove" size={20} color={count > 1 ? "#b30069" : "#d6d3d1"} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => {
                            Alert.prompt(
                                'Full House Count',
                                'Enter number of grand prizes',
                                [
                                    { text: 'Cancel', style: 'cancel' },
                                    { text: 'Set', onPress: (val) => onCountChange(Math.max(1, parseInt(val || '1'))) }
                                ],
                                'plain-text',
                                count.toString(),
                                'number-pad'
                            );
                        }}
                        className="px-4 min-w-[40px] items-center"
                    >
                        <Text className="font-headline-bold text-[#b30069] text-xl">{count}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={increment}
                        className="w-10 h-10 items-center justify-center bg-white rounded-xl shadow-sm"
                    >
                        <Ionicons name="add" size={20} color="#b30069" />
                    </TouchableOpacity>
                </View>
            </View>

            <View className="px-2">
                <Text className="font-body text-stone-400 text-[11px] leading-4 italic">
                    * Prizes are automatically distributed: FH1 > FH2 > FH3... to reward earlier claims.
                </Text>
            </View>
        </View>
    );
};

export default FullHouseSelection;
