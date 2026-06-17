import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import type { BringItem } from '../../../../types/plans';
import { getOptimizedImageUrl } from '../../../../lib/api';

interface Props {
    item: BringItem;
    currentUserId: string | null;
    isHost: boolean;
    onClaim: (id: string) => void;
    onUnclaim: (id: string) => void;
    onToggleUpvote: (id: string) => void;
    onLongPress: (item: BringItem) => void;
}

export default function BringItemCard({ item, currentUserId, onClaim, onUnclaim, onToggleUpvote, onLongPress }: Props) {
    const isClaimedByMe = item.claimedBy === currentUserId;
    const isClaimedByOther = !!item.claimedBy && !isClaimedByMe;
    const hasUpvotes = item.upvoteCount > 0;

    return (
        <TouchableOpacity
            onLongPress={() => onLongPress(item)}
            activeOpacity={0.8}
            className={`bg-white rounded-2xl mb-3 flex-row items-center border p-3 min-h-[72px]
                ${isClaimedByMe ? 'border-l-4 border-l-[#10b981] border-y-stone-100/80 border-r-stone-100/80' : 'border-stone-100/80'}
                ${!item.claimedBy && hasUpvotes ? 'bg-[#fffdf3]' : ''}
            `}
            style={{ shadowColor: '#b30069', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 }}
        >
            {/* Left: Upvote */}
            <TouchableOpacity onPress={() => onToggleUpvote(item.id)} className="items-center justify-center w-12" activeOpacity={0.6}>
                <Ionicons name={item.hasUpvoted ? 'heart' : 'heart-outline'} size={24} color={item.hasUpvoted ? '#b30069' : '#a8a29e'} />
                {hasUpvotes && <Text className={`text-[11px] font-body-bold mt-1 ${item.hasUpvoted ? 'text-[#b30069]' : 'text-stone-400'}`}>{item.upvoteCount}</Text>}
            </TouchableOpacity>

            {/* Center: Name */}
            <View className="flex-1 ml-2">
                <View className="flex-row items-center">
                    {item.isPinned && <Text className="mr-1">📌</Text>}
                    <Text className="font-body-bold text-[#1c1c18] text-base" numberOfLines={2}>{item.name}</Text>
                </View>
                {isClaimedByOther && <Text className="font-body-medium text-stone-400 text-xs mt-0.5">Claimed by {item.claimedByName}</Text>}
                {isClaimedByMe && <Text className="font-body-medium text-[#10b981] text-xs mt-0.5">You are bringing this</Text>}
            </View>

            {/* Right: Claim Action */}
            <View className="ml-3">
                {!item.claimedBy && (
                    <TouchableOpacity onPress={() => onClaim(item.id)} className="border border-[#b30069] rounded-xl px-3 py-1.5" activeOpacity={0.7}>
                        <Text className="font-body-bold text-[#b30069] text-xs">I'll bring</Text>
                    </TouchableOpacity>
                )}
                {isClaimedByMe && (
                    <TouchableOpacity onPress={() => onUnclaim(item.id)} className="bg-[#10b981]/10 rounded-xl px-3 py-1.5" activeOpacity={0.7}>
                        <Text className="font-body-bold text-[#10b981] text-xs">You ✓</Text>
                    </TouchableOpacity>
                )}
                {isClaimedByOther && (
                    <View className="w-8 h-8 rounded-full overflow-hidden bg-stone-100 border border-stone-200">
                        {item.claimedByAvatar ? (
                            <Image source={{ uri: getOptimizedImageUrl(item.claimedByAvatar, 'w_100,q_auto') }} style={{ width: '100%', height: '100%' }} />
                        ) : (
                            <View className="flex-1 items-center justify-center bg-stone-200">
                                <Text className="font-headline-bold text-stone-500 text-xs">{item.claimedByName?.charAt(0).toUpperCase()}</Text>
                            </View>
                        )}
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
}
