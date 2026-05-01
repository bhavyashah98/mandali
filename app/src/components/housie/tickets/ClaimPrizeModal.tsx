import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import MandaliCoin from '../../MandaliCoin';

interface ClaimPrizeModalProps {
    visible: boolean;
    onClose: () => void;
    game: any;
    claimingTicketId: string | null;
    deniedClaims: Record<string, string[]>;
    claimCountdown: number;
    isTablet: boolean;
    onClaimSelect: (prizeId: string) => void;
}

const ClaimPrizeModal: React.FC<ClaimPrizeModalProps> = ({
    visible,
    onClose,
    game,
    claimingTicketId,
    deniedClaims,
    claimCountdown,
    isTablet,
    onClaimSelect
}) => {
    if (!game) return null;

    const sortedPrizes = [...(game.prizes || [])].sort((a: any, b: any) => {
        const currentCalledCount = game.called_numbers?.length || 0;
        const aWinList = game.winners?.[a.id];
        const aWinners = Array.isArray(aWinList) ? aWinList : (aWinList ? [aWinList] : []);
        const aClosed = aWinners.length > 0 && aWinners[0].claimedOnIndex < currentCalledCount;

        const bWinList = game.winners?.[b.id];
        const bWinners = Array.isArray(bWinList) ? bWinList : (bWinList ? [bWinList] : []);
        const bClosed = bWinners.length > 0 && bWinners[0].claimedOnIndex < currentCalledCount;

        if (aClosed !== bClosed) return aClosed ? 1 : -1;
        return parseInt(b.amount || '0') - parseInt(a.amount || '0');
    });

    return (
        <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
            <View
                style={{ backgroundColor: 'rgba(89, 64, 72, 0.9)' }}
                className={`flex-1 justify-center ${isTablet ? 'px-24 py-24' : 'px-4 py-8'}`}
            >
                <View
                    style={{ elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, borderColor: 'rgba(255, 255, 255, 0.2)' }}
                    className={`bg-[#FDF9F3] rounded-[40px] border max-h-[100%] ${isTablet ? 'p-12' : 'p-6'}`}
                >
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View className="flex-row items-center justify-between mb-2">
                            <Text className={`font-headline-bold text-[#594048] ${isTablet ? 'text-5xl' : 'text-2xl'}`}>Claim Reward</Text>
                            <View className="flex-row items-center">
                                <View
                                    style={{ backgroundColor: 'rgba(179, 0, 105, 0.1)', borderColor: 'rgba(179, 0, 105, 0.2)' }}
                                    className="px-3 py-1 rounded-full mr-3 border flex-row items-center"
                                >
                                    <MaterialIcons name="timer" size={14} color="#b30069" />
                                    <Text className="text-primary font-body-bold ml-1">{claimCountdown}s</Text>
                                </View>
                                <TouchableOpacity onPress={onClose}
                                    className={`items-center justify-center rounded-full bg-stone-100 ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}>
                                    <MaterialIcons name="close" size={isTablet ? 32 : 24} color="#594048" />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <Text className="text-stone-400 font-body-medium mb-6 text-sm">Please select a prize to claim before the timer ends.</Text>

                        <View className="gap-4">
                            {sortedPrizes.map((prize: any) => {
                                const winners = Array.isArray(game.winners?.[prize.id]) ? game.winners[prize.id] : (game.winners?.[prize.id] ? [game.winners[prize.id]] : []);
                                const currentCalledCount = game.called_numbers?.length || 0;
                                const isGlobalClosed = winners.length > 0 && winners[0].claimedOnIndex < currentCalledCount;

                                let standardWinsOnTicket = 0, fullHouseWinsOnTicket = 0;
                                (game.prizes || []).forEach((p: any) => {
                                    const tWinners = Array.isArray(game.winners?.[p.id]) ? game.winners[p.id] : (game.winners?.[p.id] ? [game.winners[p.id]] : []);
                                    if (tWinners.some((w: any) => w.ticketId === claimingTicketId)) {
                                        if (p.name.toLowerCase().includes('full house')) fullHouseWinsOnTicket++;
                                        else standardWinsOnTicket++;
                                    }
                                });

                                const isMyWin = winners.some((w: any) => w.ticketId === claimingTicketId);
                                const dbDeniedPrizeIds = game.winners?.['__denied']?.[claimingTicketId as string] || [];
                                const isLocalDenied = claimingTicketId ? (deniedClaims[claimingTicketId]?.includes(prize.id) || dbDeniedPrizeIds.includes(prize.id)) : false;
                                const isLimitReached = !isMyWin && ((prize.name.toLowerCase().includes('full house') && fullHouseWinsOnTicket >= 1) || (!prize.name.toLowerCase().includes('full house') && standardWinsOnTicket >= 1));

                                let status = 'Claim', statusColor = 'text-white', bgColor = 'bg-[#b30069]';
                                if (isMyWin) { status = 'Success'; bgColor = 'bg-stone-100'; statusColor = 'text-green-600'; }
                                else if (isGlobalClosed) { status = winners.length > 1 ? `${winners.length} Wins` : 'Closed'; bgColor = 'bg-stone-50'; statusColor = 'text-stone-300'; }
                                else if (isLocalDenied) { status = 'Denied'; bgColor = 'bg-red-50'; statusColor = 'text-red-400'; }
                                else if (isLimitReached) { status = 'Limited'; bgColor = 'bg-stone-100'; statusColor = 'text-stone-400'; }
                                else if (winners.length > 0) { status = 'Join Share'; bgColor = 'bg-orange-500'; statusColor = 'text-white'; }

                                const disableButton = isGlobalClosed || isMyWin || isLocalDenied || isLimitReached;

                                return (
                                    <TouchableOpacity
                                        key={prize.id}
                                        onPress={() => !disableButton && onClaimSelect(prize.id)}
                                        disabled={disableButton}
                                        style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}
                                        className={`bg-white rounded-[28px] flex-row items-center border border-stone-100 mb-2 ${isTablet ? 'p-8' : 'p-4'} ${disableButton && !isMyWin ? 'opacity-50' : ''}`}
                                    >
                                        <View className={`${isTablet ? 'w-20 h-20' : 'w-12 h-12'} rounded-full ${(winners.length > 0 && !isGlobalClosed && !isLimitReached) ? 'bg-orange-50' : 'bg-stone-50'} items-center justify-center mr-4`}>
                                            <MaterialIcons name={prize.icon || 'stars'} size={isTablet ? 36 : 24} color={(winners.length > 0 && !isGlobalClosed && !isLimitReached) ? '#f97316' : '#b30069'} />
                                        </View>
                                        <View className="flex-1">
                                            <Text className={`text-[#31302d] font-headline-bold ${isTablet ? 'text-3xl' : 'text-base'}`}>{prize.name}</Text>
                                            <View className="flex-row items-center mt-1">
                                                <Text className={`text-stone-400 font-body-medium ${isTablet ? 'text-lg' : 'text-xs'}`}>Value: {winners.length > 1 && !isLimitReached ? (prize.amount / winners.length).toFixed(0) : prize.amount}</Text>
                                                <MandaliCoin size={isTablet ? 18 : 12} style={{ marginLeft: 4 }} />
                                            </View>
                                        </View>
                                        <View style={{ height: isTablet ? 60 : 40, minWidth: isTablet ? 140 : 80 }} className={`px-6 items-center justify-center rounded-full ${bgColor}`}>
                                            <Text className={`font-headline-bold uppercase tracking-tight ${statusColor} ${isTablet ? 'text-xl' : 'text-[11px]'}`}>{status}</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

export default React.memo(ClaimPrizeModal);
