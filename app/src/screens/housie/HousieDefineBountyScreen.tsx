import React, { useState, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView,
    ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

import { useIsTablet } from '../../hooks/useIsTablet';
import { useSocket } from '../../hooks/useSocket';
import { API_URL, getAuthHeaders, activateHousieGame, fetchHousiePrizeCatalogue, fetchHousieGame } from '../../lib/api';

import PoolDashboard from '../../components/housie/bounty/PoolDashboard';
import MilestonesList, { Prize } from '../../components/housie/bounty/MilestonesList';
import AddPrizeModal, { ordinal } from '../../components/housie/bounty/AddPrizeModal';

// ─── Pure helpers (no JSX) ────────────────────────────────────────────────────

/** Expand catalogue into default prize list — only standard rows + full houses. */
const seedPrizes = (catalogue: any[]): Prize[] => {
    const seeded: Prize[] = [];
    catalogue.forEach((p: any) => {
        // Only seed the 6 core prizes: 3 line rows + 3 full houses
        if (p.category !== 'standard' && p.category !== 'fullhouse') return;
        if (!p.repeatable) {
            seeded.push({ ...p, amount: '0', isHighlight: false });
        } else {
            for (let i = 1; i <= 3; i++) {
                seeded.push({ ...p, id: `full_house_${i}`, name: `${ordinal(i)} Full House`, amount: '0', isHighlight: true });
            }
        }
    });
    return seeded;
};

/** Auto-distribute prize pool: 10% per line row, rest split (weighted) among full houses. */
const distributePool = (prizes: Prize[], pool: number): Prize[] => {
    const fhPrizes = prizes.filter(p => p.id.startsWith('full_house_'));
    const lineIds = ['top_line', 'middle_line', 'bottom_line'];
    const lineCount = prizes.filter(p => lineIds.includes(p.id)).length;
    if (fhPrizes.length === 0 || pool <= 0) return prizes;

    const lineAmt = Math.floor(pool * 0.10);
    const remaining = pool - lineAmt * lineCount;
    const totalW = (fhPrizes.length * (fhPrizes.length + 1)) / 2;
    const fhAmts = fhPrizes.map((_, i) => Math.floor(remaining * (i + 1) / totalW));
    fhAmts[fhAmts.length - 1] += remaining - fhAmts.reduce((a, b) => a + b, 0);

    return prizes.map(p => {
        if (lineIds.includes(p.id)) return { ...p, amount: lineAmt.toString() };
        const fi = fhPrizes.findIndex(fh => fh.id === p.id);
        if (fi >= 0) return { ...p, amount: fhAmts[fi].toString() };
        return p;
    });
};

// ─── Screen ───────────────────────────────────────────────────────────────────
const HousieDefineBountyScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute();
    const insets = useSafeAreaInsets();
    const { gameCode, groupId } = (route.params as { gameCode: string; groupId: string }) || {};
    const isTablet = useIsTablet();
    const socket = useSocket();

    const [isStarting, setIsStarting] = useState(false);
    const [prizes, setPrizes] = useState<Prize[]>([]);
    const [catalogueSeeded, setCatalogueSeeded] = useState(false);
    const [addModalVisible, setAddModalVisible] = useState(false);

    // ── Fetch game (to read calling mode) ────────────────────────────────────
    const { data: game } = useQuery({
        queryKey: ['housieGame', gameCode],
        queryFn: () => fetchHousieGame(gameCode),
        staleTime: 30_000,
    });
    const callingMode: 'auto' | 'manual' = game?.settings?.callingMode || 'manual';

    // ── Fetch prize catalogue ─────────────────────────────────────────────────
    const { data: catalogueData } = useQuery({
        queryKey: ['housiePrizeCatalogue', callingMode],
        queryFn: () => fetchHousiePrizeCatalogue(callingMode),
        staleTime: 60_000,
        enabled: !!game,
    });
    const catalogue = catalogueData?.prizes || [];
    const allowCustom = catalogueData?.allowCustom ?? (callingMode === 'manual');

    // Seed default prizes once catalogue arrives
    useEffect(() => {
        if (!catalogue.length || catalogueSeeded) return;
        setPrizes(seedPrizes(catalogue));
        setCatalogueSeeded(true);
    }, [catalogue]);

    // ── Participants + prize pool ─────────────────────────────────────────────
    const { data: stats, refetch: refetchStats } = useQuery({
        queryKey: ['housieParticipants', gameCode],
        queryFn: async () => {
            const headers = await getAuthHeaders();
            const res = await axios.get(`${API_URL}/housie/${gameCode}/participants`, { headers });
            return res.data;
        },
        staleTime: 5000,
        refetchOnMount: 'always',
    });

    useEffect(() => {
        if (!socket || !gameCode) return;
        const h = () => refetchStats();
        socket.on('tickets_bought', h);
        return () => { socket.off('tickets_bought', h); };
    }, [gameCode, socket]);

    const totalPrizePool = stats?.totalPrizePool || 0;
    const fhCount = prizes.filter(p => p.id.startsWith('full_house_')).length;

    // Re-distribute whenever pool or full-house count changes
    useEffect(() => {
        setPrizes(prev => distributePool(prev, totalPrizePool));
    }, [totalPrizePool, fhCount]);

    // ── Computed values ────────────────────────────────────────────────────────────
    const totalAllocated = prizes.reduce((s, p) => s + (parseInt(p.amount) || 0), 0);
    const isBalanced = totalAllocated === totalPrizePool && totalPrizePool > 0;
    // Any prize with amount 0 or empty is invalid
    const hasZeroPrize = prizes.some(p => !parseInt(p.amount) || parseInt(p.amount) <= 0);
    const canStart = isBalanced && !hasZeroPrize;

    // ── Start game ────────────────────────────────────────────────────────────
    const handleStart = async () => {
        // All prizes must have amount > 0
        const zeroPrizes = prizes.filter(p => !parseInt(p.amount) || parseInt(p.amount) <= 0);
        if (zeroPrizes.length > 0) {
            Alert.alert(
                'Missing Amounts',
                `Every prize needs a reward amount greater than 0.\n\nPlease set an amount for:\n${zeroPrizes.map(p => `• ${p.name}`).join('\n')}`,
            );
            return;
        }
        if (!isBalanced) {
            Alert.alert('Pool Mismatch', `Target: 🪙${totalPrizePool}\nAllocated: 🪙${totalAllocated}\n\nPlease balance the rewards.`);
            return;
        }
        try {
            setIsStarting(true);
            await activateHousieGame(gameCode, prizes);
            navigation.replace('HousieStarting', { gameCode, groupId });
        } catch (e: any) {
            Alert.alert('Error', e.response?.data?.error || 'Failed to start game');
            setIsStarting(false);
        }
    };

    const px = isTablet ? 64 : 24;

    return (
        <View className="flex-1 bg-[#fdf9f3]" style={{ paddingTop: insets.top }}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">

                {/* ── Header ── */}
                <View className="bg-[#fdf9f3]">
                    <View className="flex-row items-center px-6 py-4">
                        {/* Back button */}
                        <View style={{ width: isTablet ? 64 : 44 }}>
                            <TouchableOpacity
                                onPress={() => navigation.replace('HousieWaitingRoom', { gameCode, groupId })}
                                className="items-center justify-center rounded-full bg-white border border-stone-100"
                                style={{ width: isTablet ? 60 : 40, height: isTablet ? 60 : 40 }}
                            >
                                <MaterialIcons name="arrow-back-ios" size={isTablet ? 26 : 18} color="#b30069" style={{ marginLeft: 4 }} />
                            </TouchableOpacity>
                        </View>

                        {/* Title */}
                        <View className="flex-1 items-center">
                            <Text
                                className="font-headline-bold uppercase"
                                style={{ fontSize: isTablet ? 28 : 17, color: '#1c1c18', letterSpacing: 1.5 }}
                            >
                                Define Rewards
                            </Text>
                            <Text
                                className="font-body-bold text-stone-400 uppercase tracking-widest mt-0.5"
                                style={{ fontSize: isTablet ? 14 : 9 }}
                            >
                                Set the stage
                            </Text>
                        </View>
                        <View style={{ width: isTablet ? 64 : 44 }} />
                    </View>

                    {/* Pool dashboard */}
                    <View style={{ paddingHorizontal: px }} className="mb-3">
                        <PoolDashboard
                            totalPrizePool={totalPrizePool}
                            totalAllocated={totalAllocated}
                            isBalanced={isBalanced}
                            participantCount={stats?.participants?.length || 0}
                            isTablet={isTablet}
                        />
                    </View>
                </View>

                {/* ── Milestones list ── */}
                <ScrollView
                    className="flex-1"
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingHorizontal: px, paddingBottom: 160 }}
                >
                    <MilestonesList
                        prizes={prizes}
                        setPrizes={setPrizes}
                        isTablet={isTablet}
                        onAdd={() => setAddModalVisible(true)}
                        callingMode={callingMode}
                    />
                </ScrollView>

                {/* ── Footer CTA ── */}
                <View
                    className="bg-[#fdf9f3] border-t border-stone-100"
                    style={{
                        paddingHorizontal: px,
                        paddingTop: isTablet ? 24 : 14,
                        paddingBottom: Math.max(insets.bottom, isTablet ? 40 : 20),
                    }}
                >
                    <TouchableOpacity
                        onPress={handleStart}
                        disabled={isStarting || !canStart}
                        activeOpacity={0.9}
                        className="flex-row items-center justify-center rounded-[40px]"
                        style={{
                            height: isTablet ? 100 : 76,
                            backgroundColor: canStart ? '#b30069' : '#d6d3d1',
                        }}
                    >
                        {isStarting ? (
                            <ActivityIndicator color="white" size={isTablet ? 'large' : 'small'} />
                        ) : (
                            <>
                                <Ionicons name="lock-closed" size={isTablet ? 30 : 22} color="white" />
                                <Text className="font-headline-bold text-white ml-3"
                                    style={{ fontSize: isTablet ? 26 : 18 }}>
                                    Lock &amp; Start Game
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            {/* ── Add Prize Modal ── */}
            <AddPrizeModal
                visible={addModalVisible}
                onClose={() => setAddModalVisible(false)}
                catalogue={catalogue}
                allowCustom={allowCustom}
                prizes={prizes}
                onAdd={(prize) => setPrizes(prev => [...prev, prize])}
                isTablet={isTablet}
                callingMode={callingMode}
            />
        </View>
    );
};

export default HousieDefineBountyScreen;
