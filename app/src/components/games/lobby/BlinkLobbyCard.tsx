import React from 'react';
import { useAuthStore } from '../../../stores/authStore';
import { BaseLobbyCard } from './BaseLobbyCard';

interface BlinkLobbyCardProps {
    game: any;
    memberCount: number;
    onPress: (game: any) => void;
    activeColor?: string;
}

export const BlinkLobbyCard = ({ game, memberCount, onPress, activeColor = '#b30069' }: BlinkLobbyCardProps) => {
    const { user } = useAuthStore();
    const isLive = game.status === 'active';
    const isStarting = game.status === 'starting';
    const isParticipant = game.blink_players?.some((p: any) => p.user_id === user?.id);
    const participantCount = game.blink_players?.length || 0;

    let buttonLabel = 'Join Room';
    let buttonIcon = 'sign-in-alt';

    if (game.status === 'waiting' || game.status === 'scheduled') {
        buttonLabel = 'Join Room';
        buttonIcon = 'sign-in-alt';
    } else if (isLive || isStarting) {
        buttonLabel = !isParticipant ? 'Spectate' : 'Resume';
        buttonIcon = !isParticipant ? 'eye' : 'play';
    }

    return (
        <BaseLobbyCard
            title={game.title || 'Blink Room'}
            hostName={game.hostName || game.host?.name || 'Host'}
            status={game.status}
            memberCount={memberCount}
            participantCount={participantCount}
            activeColor={activeColor}
            onPress={() => onPress(game)}
            buttonLabel={buttonLabel}
            buttonIcon={buttonIcon}
        />
    );
};
