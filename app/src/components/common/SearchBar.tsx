import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsTablet } from '../../hooks/useIsTablet';

interface SearchBarProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    containerStyle?: string; // Tailwind class name
}

export const SearchBar: React.FC<SearchBarProps> = ({
    value,
    onChangeText,
    placeholder = 'Search Mandalis...',
    containerStyle = 'mx-6 mb-5'
}) => {
    const isTablet = useIsTablet();
    const [isFocused, setIsFocused] = useState(false);

    return (
        <View
            className={`
                ${containerStyle} 
                flex-row 
                items-center 
                rounded-[16px] 
                px-4 
                transition-all 
                duration-200
                ${isFocused
                    ? 'bg-white border-[#b30069]/45'
                    : 'bg-white border-stone-200/60'
                }
                ${isTablet ? 'h-14 border-2' : 'h-[46px] border'}
            `}
            style={[
                styles.containerShadow,
                isFocused ? styles.focusedShadow : null
            ]}
        >
            <Ionicons
                name="search-outline"
                size={isTablet ? 24 : 18}
                color={isFocused ? '#b30069' : '#a09d96'}
                style={{ marginRight: 8 }}
            />

            <TextInput
                placeholder={placeholder}
                placeholderTextColor="#a09d96"
                value={value}
                onChangeText={onChangeText}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className={`flex-1 text-[#1c1c18] font-body-medium ${isTablet ? 'text-2xl' : 'text-[17px]'}`}
                autoCapitalize="none"
                autoCorrect={false}
                style={{ paddingVertical: 0 }}
            />

            {value.length > 0 && (
                <TouchableOpacity
                    onPress={() => onChangeText('')}
                    className="p-1 rounded-full active:bg-stone-100"
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name="close-circle"
                        size={isTablet ? 22 : 16}
                        color="#a09d96"
                    />
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    containerShadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 2,
    },
    focusedShadow: {
        shadowColor: '#b30069',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
    }
});
