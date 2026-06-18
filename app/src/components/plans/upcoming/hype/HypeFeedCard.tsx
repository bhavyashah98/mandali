import React, { useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import type { HypeFeedItem } from '../../../../types/planHype';
import HypeCard from './HypeCard';

export default function HypeFeedCard({ feed }: { feed: HypeFeedItem[] }) {
    const [open, setOpen] = useState(false);
    const preview = feed.slice(0, 3);

    const renderItem = (item: HypeFeedItem, index: number) => (
        <View key={`${item.at}-${index}`} className="mb-3 flex-row items-center rounded-2xl bg-[#fff8fb] px-4 py-3">
            <View className="mr-3 h-2.5 w-2.5 rounded-full bg-[#b30069]" />
            <Text className="flex-1 font-body-bold text-sm text-[#594048]">{item.text}</Text>
        </View>
    );

    return (
        <HypeCard icon="⚡" title="Hype Feed" subtitle="Tiny signals from the plan">
            {feed.length === 0 ? (
                <Text className="font-body-medium text-sm text-[#8a7a80]">No sparks yet. RSVP, bring something, or set your look.</Text>
            ) : (
                <>
                    {preview.map(renderItem)}
                    {feed.length > 3 && (
                        <TouchableOpacity onPress={() => setOpen(true)} className="rounded-2xl bg-[#b30069] py-3.5">
                            <Text className="text-center font-body-bold text-white">View all hype</Text>
                        </TouchableOpacity>
                    )}
                </>
            )}
            <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
                <View className="flex-1 justify-center bg-black/45 px-5">
                    <View className="max-h-[78%] rounded-[30px] bg-white p-5">
                        <View className="mb-4 flex-row items-center justify-between">
                            <Text className="font-headline-bold text-xl text-[#1c1c18]">Hype Feed</Text>
                            <TouchableOpacity onPress={() => setOpen(false)} className="h-10 w-10 items-center justify-center rounded-full bg-[#fff0f7]">
                                <Text className="font-body-bold text-[#b30069]">X</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>{feed.map(renderItem)}</ScrollView>
                    </View>
                </View>
            </Modal>
        </HypeCard>
    );
}
