import React, { useMemo } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getOptimizedImageUrl } from '../../../lib/api';
import { usePastPlanRecap } from '../../../hooks/plans/usePastPlanRecap';
import type { PlanCardPlan } from '../PlanCard';

const cardShadow = {
    shadowColor: '#1c1c18',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
};

const firstPhoto = (memory: any) => {
    if (Array.isArray(memory?.image_urls)) return memory.image_urls[0];
    if (typeof memory?.image_urls === 'string') {
        try {
            if (memory.image_urls.startsWith('{')) {
                return memory.image_urls.slice(1, -1).split(',')[0]?.trim().replace(/^"|"$/g, '');
            }
            return JSON.parse(memory.image_urls)?.[0];
        } catch {
            return undefined;
        }
    }
    return undefined;
};

const StatPill = ({ label, value }: { label: string; value: string | number }) => (
    <View className="rounded-2xl bg-white/70 px-4 py-3 border border-white">
        <Text className="font-body-bold text-[#8b6b73] text-[10px] uppercase tracking-widest">{label}</Text>
        <Text className="font-headline-bold text-[#1c1c18] text-lg mt-1">{value}</Text>
    </View>
);

const RecapAction = ({ icon, title, subtitle, onPress, tone = '#b30069' }: { icon: keyof typeof MaterialIcons.glyphMap; title: string; subtitle: string; onPress: () => void; tone?: string }) => (
    <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.86}
        className="bg-white rounded-[20px] p-4 border border-stone-100 flex-row items-center mb-3"
        style={cardShadow}
    >
        <View className="w-12 h-12 rounded-2xl items-center justify-center mr-4" style={{ backgroundColor: `${tone}12` }}>
            <MaterialIcons name={icon} size={24} color={tone} />
        </View>
        <View className="flex-1">
            <Text className="font-headline-bold text-[#1c1c18] text-base">{title}</Text>
            <Text className="font-body-medium text-stone-400 text-xs mt-0.5" numberOfLines={1}>{subtitle}</Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color="#c9b8be" />
    </TouchableOpacity>
);

const PastPlanRecap = ({ plan }: { plan: PlanCardPlan }) => {
    const navigation = useNavigation<any>();
    const recap = usePastPlanRecap(plan.groupId, plan.id);

    const thumbnails = useMemo(
        () => recap.memories.map(firstPhoto).filter(Boolean).slice(0, 6),
        [recap.memories]
    );

    if (recap.isLoading) {
        return (
            <View className="mx-6 mt-7 rounded-[24px] bg-white p-8 items-center border border-stone-100">
                <ActivityIndicator color="#b30069" />
                <Text className="font-body-bold text-stone-400 text-xs mt-4 uppercase tracking-widest">Building recap</Text>
            </View>
        );
    }

    if (!recap.hasAny) {
        return (
            <View className="mx-6 mt-7 rounded-[24px] bg-white p-6 border border-stone-100" style={cardShadow}>
                <View className="w-14 h-14 rounded-2xl bg-[#fdf0f7] items-center justify-center mb-5">
                    <MaterialIcons name="auto-stories" size={28} color="#b30069" />
                </View>
                <Text className="font-headline-bold text-[#1c1c18] text-xl">Quiet wrap-up</Text>
                <Text className="font-body-medium text-stone-400 text-sm mt-2 leading-5">
                    No plan-specific memories, expenses, or games were added here.
                </Text>
            </View>
        );
    }

    return (
        <View className="mx-6 mt-8">
            <View className="mb-4">
                <Text className="font-body-bold text-[#b30069] text-[10px] uppercase tracking-[3px]">Plan Recap</Text>
                <Text className="font-headline-bold text-[#1c1c18] text-2xl mt-1">What happened</Text>
            </View>

            <View className="rounded-[28px] bg-[#f8eef4] p-5 border border-[#f7d7e8] mb-5" style={cardShadow}>
                {thumbnails.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1 mb-5">
                        {thumbnails.map((url: string, index: number) => (
                            <View key={`${url}-${index}`} className="w-20 h-20 rounded-2xl overflow-hidden mx-1 bg-white border border-white">
                                <Image source={{ uri: getOptimizedImageUrl(url, 'w_220,h_220,c_fill,q_auto,f_auto') }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                            </View>
                        ))}
                    </ScrollView>
                ) : null}

                <View className="flex-row gap-3">
                    <View className="flex-1">
                        <StatPill label="Memories" value={recap.memoryCount} />
                    </View>
                    <View className="flex-1">
                        <StatPill label="Spent" value={`₹${recap.totalSpending.toLocaleString()}`} />
                    </View>
                    <View className="flex-1">
                        <StatPill label="Games" value={recap.gameCount} />
                    </View>
                </View>
            </View>

            {recap.memoryCount > 0 ? (
                <RecapAction
                    icon="photo-library"
                    title="Memories"
                    subtitle={`${recap.memoryCount} moment${recap.memoryCount === 1 ? '' : 's'} from this plan`}
                    onPress={() => navigation.navigate('Memories', { screen: 'MemoriesHome', params: { groupId: plan.groupId, planId: plan.id, readOnly: true, returnToPlanId: plan.id } })}
                />
            ) : null}

            {recap.ledger.length > 0 ? (
                <RecapAction
                    icon="account-balance-wallet"
                    title="Hisaab"
                    subtitle={`${recap.expenseCount} expense${recap.expenseCount === 1 ? '' : 's'} and ${recap.settlementCount} settlement${recap.settlementCount === 1 ? '' : 's'}`}
                    tone="#0057b3"
                    onPress={() => navigation.navigate('Groups', { screen: 'GroupHisaab', params: { groupId: plan.groupId, groupName: plan.groupName, planId: plan.id, readOnly: true, returnToPlanId: plan.id } })}
                />
            ) : null}

            {recap.housieGames.length > 0 ? (
                <RecapAction
                    icon="casino"
                    title="Housie"
                    subtitle={`${recap.housieGames.length} session${recap.housieGames.length === 1 ? '' : 's'} in this plan`}
                    tone="#7c3aed"
                    onPress={() => navigation.navigate('Games', { screen: 'HousieLeaderboard', params: { groupId: plan.groupId, groupName: plan.groupName, planId: plan.id, returnToPlanId: plan.id } })}
                />
            ) : null}

            {recap.blinkGames.length > 0 ? (
                <RecapAction
                    icon="bolt"
                    title="Blink"
                    subtitle={`${recap.blinkGames.length} match${recap.blinkGames.length === 1 ? '' : 'es'} in this plan`}
                    tone="#eab308"
                    onPress={() => navigation.navigate('Games', { screen: 'BlinkLeaderboard', params: { groupId: plan.groupId, groupName: plan.groupName, planId: plan.id, returnToPlanId: plan.id } })}
                />
            ) : null}
        </View>
    );
};

export default PastPlanRecap;
