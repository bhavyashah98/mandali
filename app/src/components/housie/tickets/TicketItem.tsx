import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { Ticket } from '../Ticket';

interface TicketItemProps {
    ticket: any;
    game: any;
    markedNumbers: number[];
    isTablet: boolean;
    isClaimLoading: boolean;
    onToggleMark: (num: number) => void;
    onClaimPress: () => void;
    deniedClaims: string[];
}

const TicketItem: React.FC<TicketItemProps> = ({
    ticket,
    game,
    markedNumbers,
    isTablet,
    isClaimLoading,
    onToggleMark,
    onClaimPress,
    deniedClaims
}) => {
    const dbDeniedList = game?.winners?.['__denied']?.[ticket.id] || [];
    const isBoggy = (deniedClaims?.length || 0) > 0 || dbDeniedList.length > 0;

    const ticketWins: string[] = [];
    let isFullHouseWin = false;

    Object.keys(game?.winners || {}).forEach(prizeId => {
        if (prizeId === '__pending' || prizeId === '__denied') return;
        const winners = game.winners[prizeId];
        const winnerArray = Array.isArray(winners) ? winners : (winners ? [winners] : []);
        const myWinOnThisTicket = winnerArray.find((w: any) => w.ticketId === ticket.id);
        if (myWinOnThisTicket) {
            const prize = game.prizes.find((p: any) => p.id === prizeId);
            const prizeName = prize?.name || 'Prize';
            if (prizeName.toLowerCase().includes('full house')) isFullHouseWin = true;
            else ticketWins.push(prizeName);
        }
    });

    return (
        <View className={`mb-12 w-full ${isBoggy ? 'opacity-90' : ''} ${isTablet ? 'px-12' : ''}`}>
            <View className="flex-row items-center justify-between mb-4 px-2">
                <View className="flex-1">
                    <Text className={`text-stone-400 font-body-bold uppercase tracking-[3px] ${isTablet ? 'text-xl' : 'text-[10px]'}`}>
                        TICKET #{ticket.id.slice(-4).toUpperCase()}
                    </Text>
                    {ticketWins.length > 0 && (
                        <View className="flex-row flex-wrap mt-2">
                            {ticketWins.map((win, idx) => (
                                <View key={idx} className="bg-green-100 px-3 py-1 rounded-full border border-green-200 mr-2 mb-1">
                                    <Text className={`text-green-700 font-headline-bold uppercase tracking-tight ${isTablet ? 'text-lg' : 'text-[9px]'}`}>
                                        Won {win}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                <TouchableOpacity
                    onPress={onClaimPress}
                    disabled={isBoggy || isFullHouseWin || isClaimLoading}
                    style={{ height: isTablet ? 60 : 36 }}
                    className={`flex-row items-center ${isTablet ? 'px-8' : 'px-4'} rounded-full ${isBoggy ? 'bg-stone-200' : isFullHouseWin ? 'bg-green-50' : 'bg-white border border-stone-100'}`}
                >
                    {isClaimLoading ? (
                        <ActivityIndicator size="small" color="#b30069" />
                    ) : (
                        <>
                            <FontAwesome5 name="trophy" size={isTablet ? 18 : 12} color={isBoggy ? '#a8a29e' : isFullHouseWin ? '#16a34a' : '#b30069'} />
                            <Text className={`font-headline-bold ml-3 uppercase tracking-tight ${isBoggy ? 'text-stone-400' : isFullHouseWin ? 'text-green-600' : 'text-primary'} ${isTablet ? 'text-xl' : 'text-[11px]'}`}>
                                {isBoggy ? 'Disqualified' : isFullHouseWin ? 'Winner!' : 'Claim Reward'}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            <Ticket
                ticketData={ticket.ticket_data}
                markedNumbers={markedNumbers}
                onNumberPress={onToggleMark}
                isTablet={isTablet}
                isBoggy={isBoggy}
                isFullHouseWin={isFullHouseWin}
            />
        </View>
    );
};

export default React.memo(TicketItem);
