import { useQuery } from '@tanstack/react-query';
import { fetchBlinkGame } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

export const useBlinkGameData = (gameCode: string | undefined) => {
    const { user } = useAuthStore();

    const { data: gameData, isLoading, refetch } = useQuery({
        queryKey: ['blinkGame', gameCode],
        queryFn: () => fetchBlinkGame(gameCode!),
        enabled: !!gameCode,
    });

    const game = gameData?.game;
    const isHost = user?.id === game?.host_id;

    // Hand and center card will be managed via socket/state in the screen
    // but we can pull initial state from the game object if needed.

    return {
        game,
        isHost,
        isLoading,
        refetch,
        userId: user?.id
    };
};
