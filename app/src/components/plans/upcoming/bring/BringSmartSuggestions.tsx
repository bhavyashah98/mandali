import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

const SUGGESTIONS: Record<string, string[]> = {
    trip: ['Sunscreen', 'First aid kit', 'Snacks', 'Power bank', 'Water bottles'],
    birthday: ['Decorations', 'Camera', 'Gift wrapping', 'Party hats', 'Cake knife'],
    religious: ['Flowers', 'Prasad', 'Diyas', 'Agarbatti', 'Fruits'],
    kitty_party: ['Snacks', 'Cash for games', 'Playing cards', 'Drinks'],
    dinner: [], // Hide for dinners
    default: ['Snacks', 'Drinks', 'Music speaker', 'Trash bags', 'Ice'],
};

interface Props {
    activityLabel: string;
    onSuggest: (name: string) => void;
}

export default function BringSmartSuggestions({ activityLabel, onSuggest }: Props) {
    const suggestions = useMemo(() => {
        const label = activityLabel.toLowerCase();
        if (label.includes('trip') || label.includes('travel')) return SUGGESTIONS.trip;
        if (label.includes('birthday')) return SUGGESTIONS.birthday;
        if (label.includes('pooja') || label.includes('religious')) return SUGGESTIONS.religious;
        if (label.includes('kitty')) return SUGGESTIONS.kitty_party;
        if (label.includes('dinner') || label.includes('restaurant')) return SUGGESTIONS.dinner;
        return SUGGESTIONS.default;
    }, [activityLabel]);

    if (suggestions.length === 0) return null;

    return (
        <View className="mt-8">
            <Text className="font-body-bold text-[#1c1c18] text-sm mb-3">Smart Suggestions</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-6 px-6" contentContainerStyle={{ paddingRight: 48 }}>
                {suggestions.map((s, i) => (
                    <TouchableOpacity
                        key={i}
                        onPress={() => onSuggest(s)}
                        activeOpacity={0.7}
                        className="bg-[#b30069]/5 border border-[#b30069]/10 rounded-xl px-4 py-2 mr-3 flex-row items-center"
                    >
                        <Text className="text-base mr-2">✨</Text>
                        <Text className="font-body-medium text-[#b30069] text-sm">{s}</Text>
                        <Text className="font-body-bold text-[#b30069] text-lg ml-2 leading-5">+</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}
