import React, { useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../../stores/authStore';
import { useBringItems } from '../../../hooks/plans/useBringItems';
import { useBringActions } from '../../../hooks/plans/useBringActions';
import type { PlanCardPlan } from '../PlanCard';
import type { BringItem } from '../../../types/plans';
import BringItemCard from './bring/BringItemCard';
import BringSmartSuggestions from './bring/BringSmartSuggestions';
import BringAddSheet, { BringAddSheetRef } from './bring/BringAddSheet';

interface Props {
    plan: PlanCardPlan;
}

export default function UpcomingBringTab({ plan }: Props) {
    const { user } = useAuthStore();
    const { items, isLoading } = useBringItems(plan.id);
    const { addItem, claimItem, unclaimItem, toggleUpvote, deleteItem, pinItem, isAdding } = useBringActions(plan.id, user?.id ?? null);

    const sheetRef = useRef<BringAddSheetRef>(null);
    const isHost = plan.createdBy === user?.id;

    const handleAdd = useCallback((name: string, autoClaim: boolean) => {
        addItem({ name, autoClaim });
        sheetRef.current?.close();
    }, [addItem]);

    const handleLongPress = useCallback((item: BringItem) => {
        const options: { text: string; style?: 'cancel' | 'destructive'; onPress: () => void }[] = [];
        if (isHost) options.push({ text: item.isPinned ? 'Unpin' : 'Pin to top', onPress: () => pinItem(item.id) });
        options.push({ text: 'Delete item', style: 'destructive', onPress: () => deleteItem(item.id) });
        options.push({ text: 'Cancel', style: 'cancel', onPress: () => { } });

        if (options.length > 1) {
            Alert.alert('Manage Item', item.name, options);
        }
    }, [isHost, user?.id, pinItem, deleteItem]);

    const renderEmpty = () => {
        if (isLoading) return <View className="py-10"><Text className="text-center text-stone-400">Loading...</Text></View>;
        return (
            <View className="items-center py-12 px-6">
                <Text className="text-6xl mb-4 opacity-50">🎒</Text>
                <Text className="font-headline-bold text-[#1c1c18] text-xl mb-2 text-center">What to bring?</Text>
                <Text className="font-body-medium text-stone-500 text-center mb-6">Suggest what someone should bring. Others can claim it.</Text>
                <TouchableOpacity onPress={() => sheetRef.current?.expand()} className="bg-[#b30069] rounded-2xl px-6 py-3.5" activeOpacity={0.8}>
                    <Text className="font-body-bold text-white text-base">Add First Suggestion</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View className="flex-1 bg-[#fafaf9] p-6 pb-24">
            {items.length === 0 ? renderEmpty() : items.map((item) => (
                <BringItemCard
                    key={item.id}
                    item={item}
                    currentUserId={user?.id ?? null}
                    isHost={isHost}
                    onClaim={claimItem}
                    onUnclaim={unclaimItem}
                    onToggleUpvote={toggleUpvote}
                    onLongPress={handleLongPress}
                />
            ))}

            {items.length > 0 && (
                <View className="absolute bottom-6 right-6">
                    <TouchableOpacity onPress={() => sheetRef.current?.expand()} activeOpacity={0.8} className="w-14 h-14 bg-[#b30069] rounded-full items-center justify-center shadow-lg" style={{ shadowColor: '#b30069', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 5 }}>
                        <MaterialIcons name="add" size={28} color="white" />
                    </TouchableOpacity>
                </View>
            )}
            <BringAddSheet ref={sheetRef} onSubmit={handleAdd} isAdding={isAdding} />
        </View>
    );
}
