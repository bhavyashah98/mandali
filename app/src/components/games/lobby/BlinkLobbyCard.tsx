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

    let buttonLabel = 'Join Room';
    let buttonIcon = 'sign-in-alt';

    if (game.status === 'waiting' || game.status === 'scheduled') {
        buttonLabel = 'Join Room';
        buttonIcon = 'sign-in-alt';
    } else if (isLive || isStarting) {
        buttonLabel = !isParticipant ? 'Spectate' : 'Play Now';
        buttonIcon = !isParticipant ? 'eye' : 'gamepad';
    }

    return (
        <BaseLobbyCard
            title={game.title || 'Blink Room'}
            hostName={game.hostName}
            status={game.status}
            memberCount={memberCount}
            participantCount={game.participantCount || 0}
            activeColor={activeColor}
            onPress={() => onPress(game)}
            buttonLabel={buttonLabel}
            buttonIcon={buttonIcon}
        />
    );
};
