import React, { useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { HypeMember } from '../../../../types/planHype';

interface Props {
    members: HypeMember[];
    selectedIds: string[];
    selectionType: 'single_select' | 'multi_select';
    onToggle: (id: string) => void;
}

export default function HypeMemberPicker({ members, selectedIds, selectionType, onToggle }: Props) {
    const [open, setOpen] = useState(false);
    const [localSelected, setLocalSelected] = useState(selectedIds);
    const selectedLabel = localSelected.length ? `${localSelected.length} selected` : 'Pick names';

    useEffect(() => {
        setLocalSelected(selectedIds);
    }, [selectedIds.join('|')]);

    const handleToggle = (id: string) => {
        setLocalSelected((prev) => {
            if (selectionType === 'single_select') return prev.includes(id) ? [] : [id];
            return prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
        });
        onToggle(id);
        if (selectionType === 'single_select') setOpen(false);
    };

    return (
        <View>
            <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => setOpen(!open)}
                className="flex-row items-center rounded-[22px] border border-[#f1dbe7] bg-[#fff8fb] px-4 py-3.5"
            >
                <View className="mr-3 h-10 w-10 items-center justify-center rounded-2xl bg-[#b30069]/10">
                    <MaterialIcons name="people" size={22} color="#b30069" />
                </View>
                <Text className="flex-1 font-headline-bold text-base text-[#1c1c18]">{selectedLabel}</Text>
                <View className="h-10 w-10 items-center justify-center rounded-full bg-[#b30069]/10">
                    <MaterialIcons name={open ? 'close' : 'keyboard-arrow-down'} size={24} color="#b30069" />
                </View>
            </TouchableOpacity>
            {open && (
                <View
                    className="mt-3 rounded-[28px] border border-[#b30069]/10 bg-white p-3"
                    style={{ elevation: 10, shadowColor: '#b30069', shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } }}
                >
                    <ScrollView style={{ maxHeight: 250 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                        {members.map((member) => {
                            const selected = localSelected.includes(member.id);
                            return (
                                <TouchableOpacity key={member.id} activeOpacity={0.85} onPress={() => handleToggle(member.id)} className={`mb-2 flex-row items-center rounded-[22px] px-4 py-4 ${selected ? 'bg-[#b30069]' : 'bg-[#fdf9f3]'}`}>
                                    <View className={`mr-3 h-10 w-10 items-center justify-center rounded-[14px] ${selected ? 'bg-white/20' : 'bg-[#b30069]/5'}`}>
                                        <Text className={`font-headline-bold text-base ${selected ? 'text-white' : 'text-[#b30069]/70'}`}>{member.name.charAt(0).toUpperCase()}</Text>
                                    </View>
                                    <Text className={`flex-1 font-headline-bold text-base ${selected ? 'text-white' : 'text-[#1c1c18]'}`}>{member.name}</Text>
                                    <MaterialIcons name={selected ? 'check' : 'radio-button-unchecked'} size={21} color={selected ? '#fff' : '#d6d3d1'} />
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            )}
        </View>
    );
}
