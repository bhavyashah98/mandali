export const INACTIVITY_LIMITS_MINS: Record<string, number> = {
    waiting: 15,
    starting: 5,
    active: 30,
};

export const getInactiveMinutes = (game: {
    status: string;
    last_number_called_at?: string | null;
    last_activity_at?: string | null;
    created_at: string;
}): number => {
    const refTime = game.status === 'active'
        ? (game.last_number_called_at || game.last_activity_at || game.created_at)
        : (game.last_activity_at || game.created_at);

    return (Date.now() - new Date(refTime).getTime()) / 1000 / 60;
};
