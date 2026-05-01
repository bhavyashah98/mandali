import React, { useState, useCallback } from 'react';
import { View, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

// Hooks
import { useIsTablet } from '../../hooks/useIsTablet';
import { useHousieBountyData } from '../../hooks/housie/useHousieBountyData';
import { useHousieBountySync } from '../../hooks/housie/useHousieBountySync';

// API
import { activateHousieGame } from '../../lib/api';

// Components
import BountyHeader from '../../components/housie/bounty/BountyHeader';
import BountyFooter from '../../components/housie/bounty/BountyFooter';
import PoolDashboard from '../../components/housie/bounty/PoolDashboard';
import MilestonesList, { Prize } from '../../components/housie/bounty/MilestonesList';
import AddPrizeModal from '../../components/housie/bounty/AddPrizeModal';

const HousieDefineBountyScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute();
    const insets = useSafeAreaInsets();
    const { gameCode, groupId } = (route.params as { gameCode: string; groupId: string }) || {};
    const isTablet = useIsTablet();

    const [isStarting, setIsStarting] = useState(false);
    const [addModalVisible, setAddModalVisible] = useState(false);

    // ── Data & Logic Hook ──
    const {
        prizes,
        setPrizes,
        catalogue,
        allowCustom,
        totalPrizePool,
        totalAllocated,
        participantCount,
        isBalanced,
        canStart,
        refetchStats,
        callingMode
    } = useHousieBountyData(gameCode);

    // ── Sync Hook ──
    useHousieBountySync({
        gameCode,
        onTicketsBought: refetchStats
    });

    // ── Handlers ──
    const handleStart = useCallback(async () => {
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
    }, [gameCode, groupId, prizes, isBalanced, totalPrizePool, totalAllocated, navigation]);

    const handleBack = useCallback(() => {
        navigation.replace('HousieWaitingRoom', { gameCode, groupId });
    }, [navigation, gameCode, groupId]);

    const px = isTablet ? 64 : 24;

    return (
        <View className="flex-1 bg-[#fdf9f3]" style={{ paddingTop: insets.top }}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
                
                <BountyHeader onBack={handleBack} isTablet={isTablet} />

                {/* Pool dashboard */}
                <View style={{ paddingHorizontal: px }} className="mb-3">
                    <PoolDashboard
                        totalPrizePool={totalPrizePool}
                        totalAllocated={totalAllocated}
                        isBalanced={isBalanced}
                        participantCount={participantCount}
                        isTablet={isTablet}
                    />
                </View>

                {/* Milestones list */}
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

                <BountyFooter 
                    onStart={handleStart}
                    isStarting={isStarting}
                    canStart={canStart}
                    isTablet={isTablet}
                    px={px}
                />

            </KeyboardAvoidingView>

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
