import React from 'react';
import { View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
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
    const isHost = user?.id === game.host_id;
    const isParticipant = game.blink_players?.some((p: any) => p.user_id === user?.id) || isHost;
    const participantCount = game.blink_players?.length || 0;

    let buttonLabel = 'Join Room';
    let buttonIcon = 'sign-in-alt';

    if (game.status === 'waiting' || game.status === 'scheduled') {
        if (isParticipant) {
            buttonLabel = 'Enter Lobby';
            buttonIcon = 'door-open';
        } else {
            buttonLabel = 'Join Room';
            buttonIcon = 'sign-in-alt';
        }
    } else if (isStarting) {
        if (isParticipant) {
            buttonLabel = 'Starting...';
            buttonIcon = 'hourglass-half';
        } else {
            buttonLabel = 'Spectate';
            buttonIcon = 'eye';
        }
    } else if (isLive) {
        if (isParticipant) {
            buttonLabel = 'Play Now';
            buttonIcon = 'gamepad';
        } else {
            buttonLabel = 'Spectate';
            buttonIcon = 'eye';
        }
    }

    const headerBadge = isParticipant ? (
        <View className="ml-2 bg-green-50 p-1 rounded-full">
            <MaterialIcons name="check-circle" size={14} color="#16a34a" />
        </View>
    ) : null;

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
            headerBadge={headerBadge}
        />
    );
};
