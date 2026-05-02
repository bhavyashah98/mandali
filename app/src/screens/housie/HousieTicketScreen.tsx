import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, ActivityIndicator, FlatList } from 'react-native';
import { announceHousieNumber } from '../../utils/housieVoice';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';

import { useIsTablet } from '../../hooks/useIsTablet';
import { useAuthStore } from '../../stores/authStore';
import { pauseHousieGame, resumeHousieGame } from '../../lib/api';

// Hooks
import { useHousieTicketData } from '../../hooks/housie/useHousieTicketData';
import { useHousieTicketSync } from '../../hooks/housie/useHousieTicketSync';
import { useHousieMarking } from '../../hooks/housie/useHousieMarking';
import { useHousieClaiming } from '../../hooks/housie/useHousieClaiming';

// Components
import TicketHeader from '../../components/housie/tickets/TicketHeader';
import CallingSection from '../../components/housie/tickets/CallingSection';
import TicketItem from '../../components/housie/tickets/TicketItem';
import RewardPoolTracker from '../../components/housie/tickets/RewardPoolTracker';
import ClaimPrizeModal from '../../components/housie/tickets/ClaimPrizeModal';
import ClaimConfirmModal from '../../components/housie/tickets/ClaimConfirmModal';
import HousieWinNotification from '../../components/housie/HousieWinNotification';

const HousieTicketScreen = () => {
    const isTablet = useIsTablet();
    const route = useRoute();
    const navigation = useNavigation<any>();
    const { user } = useAuthStore();

    // 1. Params & Basic State
    const params = route.params as { gameCode?: string, groupId?: string };
    const gameCode = useMemo(() => params?.gameCode?.trim().toUpperCase() || '', [params?.gameCode]);
    const groupId = params?.groupId;

    const [isPlayerClaiming, setIsPlayerClaiming] = useState(false);
    const [activeNotification, setActiveNotification] = useState<{
        type: 'win' | 'boggy';
        playerName: string;
        avatarUrl?: string;
        prizeName: string;
    } | null>(null);

    // 2. Core Data Hook
    const {
        game,
        tickets,
        isJoined,
        calledNumbers,
        latestNumber,
        isLoading,
        refetchGame
    } = useHousieTicketData(gameCode);

    // 3. Marking Logic Hook
    const { markedTickets, toggleMark } = useHousieMarking(tickets);

    // 4. Claiming Logic Hook
    const {
        prizesModalVisible,
        claimingTicketId,
        claimConfirmVisible,
        pendingClaimPrizeId,
        claimCountdown,
        deniedClaims,
        setDeniedClaims,
        isClaimLoading,
        setIsClaimLoading,
        openPrizesModal,
        closePrizesModal,
        openClaimConfirm,
        closeClaimConfirm,
        handleClaimPrize
    } = useHousieClaiming({
        gameCode,
        userId: user?.id,
        game,
        markedTickets
    });

    const handleClaimResult = useCallback((data: any) => {
        const { prizeId, status, playerName, avatarUrl, prizeName, userId, ticketId } = data;
        if (status === 'accepted') {
            setActiveNotification({ type: 'win', playerName, avatarUrl, prizeName });
        } else if (status === 'denied' && data.message !== 'Prize already claimed') {
            setActiveNotification({ type: 'boggy', playerName, avatarUrl, prizeName });
            if (userId === user?.id) {
                setDeniedClaims(prev => ({
                    ...prev,
                    [ticketId]: [...(prev[ticketId] || []), prizeId]
                }));
            }
        }
    }, [user?.id, setDeniedClaims]);

    const handleGameEnded = useCallback(() => {
        setTimeout(() => {
            navigation.replace('HousieResults', { gameCode, groupId });
        }, 100);
    }, [navigation, gameCode, groupId]);

    const handlePlayerClaimingOpen = useCallback(() => setIsPlayerClaiming(true), []);
    const handlePlayerClaimingClosed = useCallback(() => setIsPlayerClaiming(false), []);

    // 5. Sync Hook (Socket listeners)
    useHousieTicketSync({
        gameCode,
        userId: user?.id,
        groupId,
        onClaimResult: handleClaimResult,
        onGameEnded: handleGameEnded,
        onPlayerClaimingOpen: handlePlayerClaimingOpen,
        onPlayerClaimingClosed: handlePlayerClaimingClosed
    });

    // 6. Helpers & Actions
    const handleTogglePause = useCallback(async () => {
        if (!game) return;
        try {
            if (game.settings?.isPaused) {
                await resumeHousieGame(gameCode);
            } else {
                await pauseHousieGame(gameCode);
            }
            // Small delay to allow DB update to propagate before refetch
            setTimeout(() => refetchGame(), 200);
        } catch (e) {
            console.error("Failed to toggle pause:", e);
        }
    }, [game?.settings?.isPaused, gameCode, refetchGame]);

    const getParticipantName = useCallback((userId: string) => {
        const participant = game?.participants?.find((p: any) => p.id === userId);
        return participant?.name || 'Player';
    }, [game?.participants]);

    // 8. Handle Voice Announcement & Ended state
    const lastAnnouncedRef = useRef<number | null>(null);

    useEffect(() => {
        if (!game || game.status !== 'active') return;
        
        const numbers = game.called_numbers || [];
        const latest = numbers[numbers.length - 1];

        if (latest !== undefined && latest !== null && latest !== lastAnnouncedRef.current) {
            // Only announce if we've already initialized the ref (to avoid announcing on first load)
            // or if the game just started and this is the very first number.
            if (lastAnnouncedRef.current !== null) {
                announceHousieNumber(latest);
            }
            lastAnnouncedRef.current = latest;
        }
    }, [game?.called_numbers, game?.status]);

    useEffect(() => {
        if (game?.status === 'ended') {
            navigation.replace('HousieResults', { gameCode, groupId });
        }
    }, [game?.status, gameCode, groupId, navigation]);

    const handleConfirmClaim = useCallback(() => {
        if (pendingClaimPrizeId) {
            handleClaimPrize(pendingClaimPrizeId);
        }
    }, [pendingClaimPrizeId, handleClaimPrize]);

    if (isLoading || !isJoined) {
        return (
            <SafeAreaView className="flex-1 bg-background items-center justify-center">
                <ActivityIndicator size="large" color="#b30069" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-[#FDF9F3]" edges={['top']}>
            <TicketHeader 
                gameCode={gameCode}
                hostName={game?.hostName || 'MANDALI'}
                hostId={game?.host_id}
                userId={user?.id}
                isTablet={isTablet}
                onBack={() => navigation.goBack()}
            />

            <CallingSection 
                latestNumber={latestNumber}
                calledCount={calledNumbers.length}
                remainingCount={90 - calledNumbers.length}
                isPaused={game?.settings?.isPaused}
                isAutoMode={game?.settings?.callingMode === 'auto'}
                isHost={game?.host_id === user?.id}
                isPlayerClaiming={isPlayerClaiming}
                isTablet={isTablet}
                onTogglePause={handleTogglePause}
            />

            <FlatList
                data={tickets}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingHorizontal: isTablet ? 40 : 20, paddingTop: 20, paddingBottom: 60 }}
                renderItem={({ item }) => (
                    <TicketItem 
                        ticket={item}
                        game={game}
                        markedNumbers={markedTickets[item.id] || []}
                        isTablet={isTablet}
                        isClaimLoading={isClaimLoading}
                        onToggleMark={(num) => toggleMark(item.id, num, game?.status === 'ended')}
                        onClaimPress={async () => {
                            try {
                                setIsClaimLoading(true);
                                await refetchGame();
                                openPrizesModal(item.id);
                            } finally {
                                setIsClaimLoading(false);
                            }
                        }}
                        deniedClaims={deniedClaims[item.id]}
                    />
                )}
                ListFooterComponent={() => (
                    <RewardPoolTracker 
                        prizes={game?.prizes}
                        winners={game?.winners}
                        calledNumbersCount={calledNumbers.length}
                        getParticipantName={getParticipantName}
                        isTablet={isTablet}
                    />
                )}
                showsVerticalScrollIndicator={false}
            />

            <ClaimPrizeModal 
                visible={prizesModalVisible}
                onClose={closePrizesModal}
                game={game}
                claimingTicketId={claimingTicketId}
                deniedClaims={deniedClaims}
                claimCountdown={claimCountdown}
                isTablet={isTablet}
                onClaimSelect={openClaimConfirm}
                confirmVisible={claimConfirmVisible}
                pendingPrizeId={pendingClaimPrizeId}
                onConfirm={handleConfirmClaim}
                onCancelConfirm={closeClaimConfirm}
            />

            {activeNotification && (
                <HousieWinNotification 
                    visible={!!activeNotification} 
                    type={activeNotification.type} 
                    playerName={activeNotification.playerName} 
                    avatarUrl={activeNotification.avatarUrl} 
                    prizeName={activeNotification.prizeName} 
                    onComplete={() => setActiveNotification(null)} 
                />
            )}
        </SafeAreaView>
    );
};

export default HousieTicketScreen;
