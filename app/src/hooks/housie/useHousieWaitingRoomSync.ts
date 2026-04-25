import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';

interface UseHousieWaitingRoomSyncProps {
    game: any;
    stats: any;
    user: any;
    gameCode: string;
    groupId: string;
    isHost: boolean;
}

export const useHousieWaitingRoomSync = ({
    game,
    stats,
    user,
    gameCode,
    groupId,
    isHost
}: UseHousieWaitingRoomSyncProps) => {
    const navigation = useNavigation<any>();
    const queryClient = useQueryClient();

    const hasBoughtTickets = !!stats?.participants?.some((p: any) => p.id === user?.id && p.ticketCount > 0);

    useFocusEffect(
        React.useCallback(() => {
            if (gameCode) {
                queryClient.invalidateQueries({ queryKey: ['housieGame', gameCode] });
                queryClient.invalidateQueries({ queryKey: ['housieParticipants', gameCode] });
            }
        }, [gameCode, queryClient])
    );

    useEffect(() => {
        if (!game) return;

        switch (game.status) {
            case 'starting':
                navigation.replace('HousieStarting', { gameCode, groupId });
                break;

            case 'active':
                if (isHost) {
                    navigation.replace('HousieGame', { gameCode, groupId });
                } else {
                    navigation.replace('HousieTicket', { gameCode, groupId });
                }
                break;

            case 'ended':
                Alert.alert('Game Over', 'This game has already ended.');
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'HousieLobby', params: { groupId } }],
                });
                break;

            default:
                break;
        }
    }, [game?.status, isHost, hasBoughtTickets, navigation, gameCode, groupId]);

    return {
        hasBoughtTickets
    };
};
