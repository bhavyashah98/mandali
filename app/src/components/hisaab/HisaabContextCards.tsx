import React from 'react';
import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useIsTablet } from '../../hooks/useIsTablet';

const HisaabContextCards = () => {
    const isTablet = useIsTablet();

    return (
        <View className={`gap-4 flex-1 w-full pb-12 ${isTablet ? 'mt-12' : 'mt-4'}`}>
            <View 
                style={{ backgroundColor: 'rgba(231, 229, 228, 0.8)' }}
                className={`h-[1px] w-full mb-${isTablet ? '12' : '4'} mt-2`} 
            />
            
            <View 
                style={{ backgroundColor: 'rgba(179, 0, 105, 0.05)' }}
                className={`rounded-[32px] ${isTablet ? 'p-12' : 'p-5'}`}
            >
                <MaterialIcons name="call-split" size={isTablet ? 48 : 24} color="#b30069" className="mb-4" />
                <Text className={`font-headline-bold text-[#1c1c18] mb-2 ${isTablet ? 'text-3xl' : 'text-[15px]'}`}>Easy Splitting</Text>
                <Text className={`font-body-medium text-stone-500 leading-relaxed ${isTablet ? 'text-2xl' : 'text-[13px]'}`}>
                    Split restaurant bills, travel costs, or shared household expenses with your Mandali in seconds.
                </Text>
            </View>

            <View 
                style={{ backgroundColor: 'rgba(179, 0, 105, 0.05)' }}
                className={`rounded-[32px] ${isTablet ? 'p-12' : 'p-5'}`}
            >
                <MaterialIcons name="done-all" size={isTablet ? 48 : 24} color="#b30069" className="mb-4" />
                <Text className={`font-headline-bold text-[#1c1c18] mb-2 ${isTablet ? 'text-3xl' : 'text-[15px]'}`}>Quick Settlements</Text>
                <Text className={`font-body-medium text-stone-500 leading-relaxed ${isTablet ? 'text-2xl' : 'text-[13px]'}`}>
                    Record payments easily and keep your Mandali relationships stress-free by staying all settled up.
                </Text>
            </View>

            <View 
                style={{ backgroundColor: 'rgba(179, 0, 105, 0.05)' }}
                className={`rounded-[32px] ${isTablet ? 'p-12' : 'p-5'}`}
            >
                <MaterialIcons name="history-edu" size={isTablet ? 48 : 24} color="#b30069" className="mb-4" />
                <Text className={`font-headline-bold text-[#1c1c18] mb-2 ${isTablet ? 'text-3xl' : 'text-[15px]'}`}>Shared Ledger</Text>
                <Text className={`font-body-medium text-stone-500 leading-relaxed ${isTablet ? 'text-2xl' : 'text-[13px]'}`}>
                    A transparent audit log for every group means everyone knows exactly who paid for what and when.
                </Text>
            </View>

            <View 
                style={{ backgroundColor: 'rgba(179, 0, 105, 0.05)' }}
                className={`rounded-[32px] ${isTablet ? 'p-12' : 'p-5'}`}
            >
                <MaterialIcons name="security" size={isTablet ? 48 : 24} color="#b30069" className="mb-4" />
                <Text className={`font-headline-bold text-[#1c1c18] mb-2 ${isTablet ? 'text-3xl' : 'text-[15px]'}`}>Secure Tracking</Text>
                <Text className={`font-body-medium text-stone-500 leading-relaxed ${isTablet ? 'text-2xl' : 'text-[13px]'}`}>
                    Your data is safe with us. Only you and your Mandali members can see the shared expenses.
                </Text>
            </View>
        </View>
    );
};

export default HisaabContextCards;
