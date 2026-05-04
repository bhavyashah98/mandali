import React, { useState } from 'react';
import {
    View, Text, TouchableOpacity,
    Modal, ScrollView, Platform,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
    visible: boolean;
    onClose: () => void;
    catalogue: any[];
    selectedPrizes: any[];
    onConfirm: (prizes: any[]) => void;
    isTablet: boolean;
}

const HousiePrizeSelectionModal: React.FC<Props> = ({
    visible, onClose, catalogue, selectedPrizes: currentPrizes, onConfirm, isTablet,
}) => {
    const insets = useSafeAreaInsets();
    
    // Internal state to track what's checked in this session
    // We store the IDs of selected items
    const [tempSelected, setTempSelected] = useState<Record<string, boolean>>({});

    // Initialize temp state when modal opens
    React.useEffect(() => {
        if (visible) {
            const initial: Record<string, boolean> = {};
            currentPrizes.forEach(p => {
                if (p.repeatable) {
                    // For repeatable ones, we might need a different logic, 
                    // but for now let's just track the base type
                    initial[p.type] = true;
                } else {
                    initial[p.id] = true;
                }
            });
            setTempSelected(initial);
        }
    }, [visible, currentPrizes]);

    const togglePrize = (item: any) => {
        const id = item.id;
        setTempSelected(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const handleConfirm = () => {
        // Map tempSelected back to actual prize objects
        const newlySelected: any[] = [];
        
        catalogue.forEach(item => {
            if (tempSelected[item.id]) {
                const existing = currentPrizes.find(p => p.id === item.id);
                if (existing) {
                    newlySelected.push(existing);
                } else {
                    newlySelected.push({
                        ...item,
                        percentage: 0,
                    });
                }
            }
        });

        // Special handling for Full House (if it was already multiple, keep them)
        // This logic might need refinement based on exact user preference
        const existingFullHouses = currentPrizes.filter(p => p.type === 'full_house');
        if (tempSelected['full_house'] && existingFullHouses.length === 0) {
            newlySelected.push({
                id: 'full_house_1',
                name: 'Full House 1',
                type: 'full_house',
                percentage: 0,
                category: 'fullhouse'
            });
        } else if (tempSelected['full_house']) {
            // Keep existing full houses
            existingFullHouses.forEach(fh => {
                if (!newlySelected.find(p => p.id === fh.id)) {
                    newlySelected.push(fh);
                }
            });
        }

        onConfirm(newlySelected);
        onClose();
    };

    const categories = ['standard', 'bonus'];
    const CATEGORY_LABELS: Record<string, string> = {
        standard: 'Standard Lines',
        bonus: 'Bonus Rewards',
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
                <View 
                    className="bg-white rounded-t-[40px] shadow-2xl"
                    style={{ 
                        height: isTablet ? '80%' : '85%',
                        paddingBottom: Math.max(insets.bottom, 20)
                    }}
                >
                    {/* Header */}
                    <View className="flex-row items-center justify-between px-8 py-6 border-b border-stone-50">
                        <View>
                            <Text className="font-headline-bold text-2xl text-stone-800">Select Prizes</Text>
                            <Text className="font-body text-stone-400 text-sm">Choose rewards for this game</Text>
                        </View>
                        <TouchableOpacity 
                            onPress={onClose}
                            className="w-10 h-10 items-center justify-center bg-stone-50 rounded-full"
                        >
                            <Ionicons name="close" size={24} color="#a8a29e" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView className="flex-1 px-6 pt-4">
                        {categories.map(cat => {
                            const items = catalogue.filter(i => i.category === cat);
                            if (items.length === 0) return null;

                            return (
                                <View key={cat} className="mb-8">
                                    <Text className="font-headline-bold text-stone-400 text-xs uppercase tracking-widest mb-4 ml-2">
                                        {CATEGORY_LABELS[cat]}
                                    </Text>
                                    <View className="gap-3">
                                        {items.map(item => {
                                            const isChecked = tempSelected[item.id];
                                            return (
                                                <TouchableOpacity
                                                    key={item.id}
                                                    onPress={() => togglePrize(item)}
                                                    className={`flex-row items-center p-4 rounded-[24px] border ${isChecked ? 'bg-[#b30069]/5 border-[#b30069]/20' : 'bg-stone-50/50 border-stone-100'}`}
                                                >
                                                    <View 
                                                        className={`w-10 h-10 rounded-2xl items-center justify-center mr-4 ${isChecked ? 'bg-[#b30069]' : 'bg-stone-100'}`}
                                                    >
                                                        <MaterialIcons 
                                                            name={item.icon as any} 
                                                            size={20} 
                                                            color={isChecked ? 'white' : '#a8a29e'} 
                                                        />
                                                    </View>
                                                    <View className="flex-1">
                                                        <Text className={`font-headline-bold text-base ${isChecked ? 'text-stone-800' : 'text-stone-600'}`}>
                                                            {item.name}
                                                        </Text>
                                                        <Text className="font-body text-stone-400 text-xs" numberOfLines={1}>
                                                            {item.description}
                                                        </Text>
                                                    </View>
                                                    <View className={`w-6 h-6 rounded-lg items-center justify-center border ${isChecked ? 'bg-[#b30069] border-[#b30069]' : 'border-stone-200 bg-white'}`}>
                                                        {isChecked && <Ionicons name="checkmark" size={16} color="white" />}
                                                    </View>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>
                            );
                        })}
                    </ScrollView>

                    {/* Footer */}
                    <View className="px-6 py-4 bg-white border-t border-stone-50">
                        <TouchableOpacity
                            onPress={handleConfirm}
                            className="w-full h-16 bg-[#b30069] rounded-[32px] items-center justify-center shadow-lg shadow-[#b30069]/20"
                        >
                            <Text className="font-headline-bold text-white text-lg">Confirm Selection</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export default HousiePrizeSelectionModal;
