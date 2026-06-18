import React, { useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import type { HypeOutfit } from '../../../../types/planHype';
import HypeCard from './HypeCard';
import HypeTextModal from './HypeTextModal';

interface Props {
    outfits: HypeOutfit[];
    currentUserId?: string;
    dressCode?: string | null;
    saving?: boolean;
    savingDressCode?: boolean;
    onSave: (text: string) => void;
    onSaveDressCode: (text: string) => void;
}

export default function OutfitCard({ outfits, currentUserId, dressCode, saving, savingDressCode, onSave, onSaveDressCode }: Props) {
    const [open, setOpen] = useState(false);
    const [dressOpen, setDressOpen] = useState(false);
    const mine = useMemo(() => outfits.find((o) => o.userId === currentUserId), [outfits, currentUserId]);

    return (
        <HypeCard icon="👗" title={`Dress Code: ${dressCode || 'Not set'}`} subtitle="What are you coming as?">
            {!dressCode && (
                <TouchableOpacity onPress={() => setDressOpen(true)} className="mb-3 rounded-2xl bg-[#fff0f7] py-3">
                    <Text className="text-center font-body-bold text-[#b30069]">Set dress code</Text>
                </TouchableOpacity>
            )}
            {outfits.length === 0 && <Text className="font-body-medium text-sm text-[#8a7a80]">No outfit drops yet.</Text>}
            {outfits.map((item) => (
                <View key={item.userId} className="mb-3 flex-row items-center justify-between rounded-2xl bg-[#fff8fb] px-4 py-3">
                    <Text className="font-body-bold text-sm text-[#1c1c18]">{item.userId === currentUserId ? 'You' : item.name}</Text>
                    <Text className="ml-3 flex-1 text-right font-body-medium text-sm text-[#594048]">"{item.text}"</Text>
                </View>
            ))}
            <TouchableOpacity onPress={() => setOpen(true)} className="mt-2 rounded-2xl bg-[#b30069] py-3.5" activeOpacity={0.85}>
                <Text className="text-center font-body-bold text-white">{mine ? 'Edit your look' : 'Tell the group'}</Text>
            </TouchableOpacity>
            <HypeTextModal
                visible={dressOpen}
                title="Set dress code"
                placeholder="Yellow & White"
                maxLength={40}
                saving={savingDressCode}
                onClose={() => setDressOpen(false)}
                onSubmit={(text) => {
                    onSaveDressCode(text);
                    setDressOpen(false);
                }}
            />
            <HypeTextModal
                visible={open}
                title="What are you wearing?"
                placeholder="Yellow saree, white kurti..."
                maxLength={60}
                initialValue={mine?.text || ''}
                saving={saving}
                onClose={() => setOpen(false)}
                onSubmit={(text) => {
                    onSave(text);
                    setOpen(false);
                }}
            />
        </HypeCard>
    );
}
