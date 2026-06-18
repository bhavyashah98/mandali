import React, { useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import type { HypeShoutout } from '../../../../types/planHype';
import HypeCard from './HypeCard';
import HypeTextModal from './HypeTextModal';

const EMOJIS = ['🔥', '🎉', '😄', '❤️', '👀', '✨'];

interface Props {
    shoutouts: HypeShoutout[];
    currentUserId?: string;
    adding?: boolean;
    onAdd: (message: string) => void;
    onReact: (shoutoutId: string, emoji: string) => void;
}

export default function ShoutoutWall({ shoutouts, currentUserId, adding, onAdd, onReact }: Props) {
    const [open, setOpen] = useState(false);
    const mine = useMemo(() => shoutouts.find((s) => s.userId === currentUserId), [shoutouts, currentUserId]);

    return (
        <HypeCard icon="📣" title="Shoutout Wall" subtitle="One line per person. No deletes. Make it count.">
            {shoutouts.length === 0 && <Text className="font-body-medium text-sm text-[#8a7a80]">Be the first permanent hype artifact.</Text>}
            {shoutouts.map((item) => (
                <View key={item.id} className="mb-4 rounded-2xl bg-[#fff8fb] px-4 py-3">
                    <Text className="font-body-bold text-sm text-[#1c1c18]">
                        {item.userId === currentUserId ? 'You' : item.name}: <Text className="font-body-medium">"{item.message}"</Text>
                    </Text>
                    <View className="mt-3 flex-row flex-wrap gap-2">
                        {EMOJIS.map((emoji) => {
                            const count = item.reactions.find((r) => r.emoji === emoji)?.count || 0;
                            const active = item.myReaction === emoji;
                            return (
                                <TouchableOpacity
                                    key={emoji}
                                    onPress={() => onReact(item.id, emoji)}
                                    className={`rounded-full px-3 py-1.5 ${active ? 'bg-[#b30069]' : 'bg-white'}`}
                                >
                                    <Text className={`font-body-bold text-xs ${active ? 'text-white' : 'text-[#594048]'}`}>
                                        {emoji}{count ? ` ${count}` : ''}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            ))}
            {!mine && (
                <TouchableOpacity onPress={() => setOpen(true)} className="mt-1 rounded-2xl bg-[#b30069] py-3.5" activeOpacity={0.85}>
                    <Text className="text-center font-body-bold text-white">Add yours - one line only</Text>
                </TouchableOpacity>
            )}
            <HypeTextModal
                visible={open}
                title="Add your shoutout"
                placeholder="Kem cho badhaa! Ready!"
                maxLength={60}
                saving={adding}
                onClose={() => setOpen(false)}
                onSubmit={(message) => {
                    onAdd(message);
                    setOpen(false);
                }}
            />
        </HypeCard>
    );
}
