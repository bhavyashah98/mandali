import { useQuery } from '@tanstack/react-query';
import { fetchHousieGame, fetchHousieTickets } from '../../lib/api';

export const useHousieTicketData = (gameCode: string) => {
    // 1. Fetch Game State
    const { data: game, isLoading: isGameLoading, refetch: refetchGame } = useQuery({
        queryKey: ['housieGame', gameCode],
        queryFn: () => fetchHousieGame(gameCode),
        enabled: !!gameCode && gameCode.length >= 6,
        staleTime: 30_000,
        refetchOnMount: 'always',
        refetchOnWindowFocus: false,
    });

    // 2. Fetch User's Tickets
    const { data: ticketData, isLoading: isLoadingTickets, refetch: refetchTickets } = useQuery({
        queryKey: ['housieTickets', gameCode],
        queryFn: () => fetchHousieTickets(gameCode),
        enabled: !!gameCode && gameCode.length >= 6,
        staleTime: 5_000
    });

    const tickets = ticketData?.tickets || [];
    const isJoined = tickets.length > 0;
    const calledNumbers = game?.called_numbers || [];
    const latestNumber = calledNumbers[calledNumbers.length - 1];

    return {
        game,
        tickets,
        isJoined,
        calledNumbers,
        latestNumber,
        isLoading: isGameLoading || isLoadingTickets,
        refetchGame,
        refetchTickets
    };
};
