import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

// Hooks
import { useIsTablet } from '../../hooks/useIsTablet';
import { useQuery } from '@tanstack/react-query';
import { fetchGroupDetail } from '../../lib/api';
import { useHousieGameEngine } from '../../hooks/housie/useHousieGameEngine';
import { useHousieClaimManager } from '../../hooks/housie/useHousieClaimManager';

// Components
import MandaliCoin from '../../components/MandaliCoin';
import HousieWinNotification from '../../components/housie/HousieWinNotification';
import { MainBoardGrid } from '../../components/housie/MainBoardGrid';
import { LiveCallerCard } from '../../components/housie/LiveCallerCard';
import { ClaimVerificationModal } from '../../components/housie/ClaimVerificationModal';

const HousieGameScreen = () => {
    const isTablet = useIsTablet();
    const route = useRoute();
    const navigation = useNavigation<any>();

    const params = route.params as { gameCode: string; groupId: string };
    const gameCode = params?.gameCode?.trim().toUpperCase() || '';
    const groupId = params?.groupId;

    const {
        game,
        isLoading,
        secondsSinceLastCall,
        isPlayerClaiming,
        callNumber,
        isCallingNumber,
        endGame,
        isEndingGame
    } = useHousieGameEngine(gameCode, groupId);

    const {
        claimsQueue,
        activeClaim,
        pendingCount,
        verifyClaim,
        activeNotification,
        clearNotification
    } = useHousieClaimManager(gameCode, game);

    const [verifyingTicket, setVerifyingTicket] = useState<any>(null);

    const { data: groupData } = useQuery({
        queryKey: ['groupDetail', groupId],
        queryFn: () => fetchGroupDetail(groupId!),
        enabled: !!groupId,
    });

    useEffect(() => {
        if (activeClaim?.ticket) {
            setVerifyingTicket(activeClaim.ticket);
        } else {
            setVerifyingTicket(null);
        }
    }, [activeClaim?.ticketId]);

    const getParticipantName = (userId: string) => {
        const participant = game?.participants?.find((p: any) => p.id === userId);
        return participant?.name || 'Player';
    };

    const handleEndGamePress = () => {
        Alert.alert('End Game?', 'Are you sure you want to finish this session?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Finish Game', style: 'destructive', onPress: () => endGame() }
        ]);
    };

    if (isLoading) return <ActivityIndicator size="large" className="flex-1" color="#b30069" />;

    const calledNumbers = game?.called_numbers || [];
    const currentNumber = calledNumbers[calledNumbers.length - 1] || '--';
    const recentNumbers = [...calledNumbers].reverse().slice(1, 4);

    const prizesArr = (game?.prizes || []).map((p: any) => {
        const winnerList = game?.winners?.[p.id];
        const winners = Array.isArray(winnerList) ? winnerList : (winnerList ? [winnerList] : []);
        const isClaimed = winners.length > 0;
        const individualAmount = isClaimed ? (p.amount / winners.length).toFixed(0) : p.amount;

        return { ...p, status: isClaimed ? 'CLAIMED' : 'OPEN', winners, individualAmount };
    });

    return (
        <SafeAreaView className="flex-1 bg-[#FDF9F3]" edges={['top']}>
            {/* Header */}
            <View className={`px-6 flex-row items-center justify-between ${isTablet ? 'py-6 px-12' : 'py-3 px-6'}`}>
                <View style={{ width: isTablet ? 120 : 80 }}>
                    <TouchableOpacity 
                        onPress={() => navigation.goBack()} 
                        style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}
                        className={`items-center justify-center rounded-full bg-white border border-stone-100 ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}
                    >
                        <MaterialIcons name="arrow-back-ios" size={isTablet ? 28 : 18} color="#594048" style={{ marginLeft: isTablet ? 8 : 5 }} />
                    </TouchableOpacity>
                </View>
                <View className="flex-1 items-center">
                    <Text className={`text-[#a09d96] font-body-bold uppercase tracking-widest text-center ${isTablet ? 'text-lg' : 'text-[9px]'}`} numberOfLines={1}>
                        {groupData?.group?.name || 'MANDALI'}
                    </Text>
                    <Text className={`text-[#594048] font-headline-bold ${isTablet ? 'text-4xl mt-1' : 'text-base'}`}>{gameCode}</Text>
                </View>
                <View style={{ width: isTablet ? 120 : 80, alignItems: 'flex-end' }}>
                    <TouchableOpacity onPress={handleEndGamePress} disabled={isEndingGame} className="bg-red-50 px-2 py-1.5 rounded-xl border border-red-100 flex-row items-center justify-center">
                        <MaterialIcons name="power-settings-new" size={isTablet ? 24 : 14} color="#dc2626" />
                        <Text className={`text-[#dc2626] font-headline-bold ml-1.5 ${isTablet ? 'text-xl' : 'text-[10px] uppercase tracking-tighter'}`}>
                            {isEndingGame ? '...' : 'Finish'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: isTablet ? 60 : 20, paddingBottom: 60, paddingTop: 5 }}>
                <LiveCallerCard
                    currentNumber={currentNumber}
                    recentNumbers={recentNumbers}
                    secondsSinceLastCall={secondsSinceLastCall}
                    isPlayerClaiming={isPlayerClaiming || pendingCount > 0}
                    isCallingNumber={isCallingNumber}
                    isEndingGame={isEndingGame}
                    onCallNumber={callNumber}
                    isTablet={isTablet}
                    gameStatus={game?.status}
                />

                <MainBoardGrid calledNumbers={calledNumbers} isTablet={isTablet} />

                {/* Rewards */}
                <View className="mt-12 px-2">
                    <Text className={`text-[#594048] font-headline-bold mb-6 ${isTablet ? 'text-4xl' : 'text-xl'}`}>Rewards</Text>
                    <View className="gap-4 pb-10">
                        {prizesArr.map((prize: any, idx: number) => (
                            <View key={idx} 
                                style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}
                                className={`bg-white rounded-[24px] border border-stone-100 mb-1 ${isTablet ? 'p-8' : 'p-4'}`}
                            >
                                <View className="flex-row items-center justify-between">
                                    <View className="flex-row items-center flex-1 min-w-0 mr-3">
                                        <View className={`rounded-2xl bg-stone-50 items-center justify-center mr-3 flex-shrink-0 ${isTablet ? 'w-20 h-20' : 'w-9 h-9'}`}>
                                            <MaterialIcons name={prize.icon as any || 'stars'} size={isTablet ? 40 : 18} color="#b30069" />
                                        </View>
                                        <View className="flex-1 min-w-0">
                                            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} className={`text-[#594048] font-headline-bold ${isTablet ? 'text-3xl' : 'text-[15px]'}`}>{prize.name}</Text>
                                            <View className={`flex-row items-center ${isTablet ? 'mt-1' : ''}`}>
                                                <Text className={`text-[#b30069] font-body-bold ${isTablet ? 'text-xl' : 'text-[11px]'}`}>
                                                    {prize.winners?.length > 1 ? `Split: ${prize.individualAmount} each ` : `${prize.amount} `}
                                                </Text>
                                                <MandaliCoin size={isTablet ? 20 : 12} />
                                            </View>
                                        </View>
                                    </View>
                                    <View className={`rounded-full flex-shrink-0 ${prize.status === 'CLAIMED' ? 'bg-green-100' : 'bg-stone-50'} ${isTablet ? 'px-8 py-4' : 'px-2.5 py-1'}`} style={{ maxWidth: isTablet ? 300 : 130 }}>
                                        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} className={`font-body-bold tracking-widest uppercase text-center ${isTablet ? 'text-lg' : 'text-[8px]'} ${prize.status === 'CLAIMED' ? 'text-green-700' : 'text-stone-400'}`}>
                                            {prize.winners?.length > 1 ? `${prize.winners.length} WINNERS` : prize.winners?.length === 1 ? `✓ ${getParticipantName(prize.winners[0].userId)}` : prize.status}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Winners Breakdown */}
                <View className="mt-8 px-2">
                    <Text className={`text-stone-400 font-body-bold uppercase tracking-[2px] mb-6 ${isTablet ? 'text-2xl' : 'text-[10px]'}`}>Winners List</Text>
                    <View className="gap-3 pb-10">
                        {prizesArr.filter((p: any) => p.winners?.length > 0).map((prize: any, idx: number) => (
                            <View key={idx} 
                                style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}
                                className={`bg-white rounded-[24px] border border-stone-100 ${isTablet ? 'p-10' : 'p-4'}`}
                            >
                                <View className="flex-row items-center justify-between">
                                    <View className="flex-row items-center flex-1 min-w-0 mr-2">
                                        <MaterialIcons name={prize.icon || 'stars'} size={isTablet ? 36 : 16} color="#b30069" />
                                        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} className={`text-[#594048] font-headline-bold ml-3 flex-1 ${isTablet ? 'text-2xl' : 'text-[13px]'}`}>{prize.name}</Text>
                                    </View>
                                    <View className={`bg-green-100 rounded-md flex-shrink-0 ${isTablet ? 'px-4 py-2' : 'px-2 py-0.5'}`}>
                                        <Text className={`text-green-700 font-body-bold ${isTablet ? 'text-xl' : 'text-[10px]'}`}>{prize.winners.length} collected</Text>
                                    </View>
                                </View>
                                <Text numberOfLines={2} className={`text-stone-400 font-body-medium mt-3 ${isTablet ? 'text-xl' : 'text-[11px]'}`}>
                                    {prize.winners.map((w: any) => getParticipantName(w.userId)).join(', ')}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>

            <ClaimVerificationModal
                visible={!!activeClaim && game?.status !== 'ended'}
                activeClaim={activeClaim}
                verifyingTicket={verifyingTicket}
                pendingCount={pendingCount}
                calledNumbers={calledNumbers}
                onResolve={verifyClaim}
                isTablet={isTablet}
                renderBoard={() => <MainBoardGrid calledNumbers={calledNumbers} isTablet={isTablet} minimal />}
                prizeName={prizesArr.find((p: any) => p.id === activeClaim?.prizeId)?.name || ''}
            />

            {activeNotification && (
                <HousieWinNotification
                    visible={!!activeNotification}
                    type={activeNotification.type}
                    playerName={activeNotification.playerName}
                    avatarUrl={activeNotification.avatarUrl}
                    prizeName={activeNotification.prizeName}
                    onComplete={clearNotification}
                />
            )}
        </SafeAreaView>
    );
};

export default HousieGameScreen;
