import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useIsTablet } from '../../hooks/useIsTablet';

interface GroupHisaabSummaryProps {
    groupBalance: number;
    totalSpending: number;
    onSettle: () => void;
    readOnly?: boolean;
}

const GroupHisaabSummary = ({ groupBalance, totalSpending, onSettle, readOnly }: GroupHisaabSummaryProps) => {
    const isTablet = useIsTablet();
    const isSettled = groupBalance === 0;
    const isOwed = groupBalance > 0;

    return (
        <View className="px-6 mb-8 mt-4">
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={onSettle}
                disabled={isSettled || readOnly}
                style={{ elevation: 10, shadowColor: '#b30069', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 }}
                className={`bg-[#b30069] rounded-[40px] overflow-hidden ${isTablet ? 'p-12' : 'p-6'}`}
            >
                <LinearGradient
                    colors={['rgba(255,255,255,0.15)', 'transparent']}
                    className="absolute inset-0"
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
                <View className="flex-row items-center justify-between mb-4">
                    <View className="flex-1">
                        <Text className={`text-white/70 font-body-bold uppercase tracking-widest ${isTablet ? 'text-2xl mb-4' : 'text-[10px] mb-1'}`}>Current Standing</Text>
                        <View className="flex-row items-center">
                            <Text className={`font-headline-bold text-white ${isTablet ? 'text-7xl' : 'text-3xl'}`}>
                                {isSettled ? 'Settled' : `₹${Math.abs(groupBalance).toLocaleString()}`}
                            </Text>
                        </View>
                        {!isSettled && (
                            <Text className={`font-body-bold mt-1 text-white/90 ${isTablet ? 'text-2xl' : 'text-[10px]'} uppercase tracking-wider`}>
                                {isOwed ? 'You are owed in this group' : 'You owe this group'}
                            </Text>
                        )}
                    </View>
                    {!isSettled && !readOnly && (
                        <View className="bg-white/20 px-4 py-2 rounded-2xl">
                            <Text className="text-white font-headline-bold text-[10px] uppercase tracking-wider">Settle</Text>
                        </View>
                    )}
                </View>

                {/* Total Spending Section */}
                <View className="pt-4 border-t border-white/10 flex-row items-center justify-between">
                    <Text className={`text-white/60 font-body-bold uppercase tracking-widest ${isTablet ? 'text-xl' : 'text-[9px]'}`}>Total Group Spending</Text>
                    <Text className={`text-white font-headline-bold ${isTablet ? 'text-2xl' : 'text-sm'}`}>₹{totalSpending.toLocaleString()}</Text>
                </View>
            </TouchableOpacity>
        </View>
    );
};


export default GroupHisaabSummary;
