import React from 'react';
import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../../stores/authStore';
import { BaseLobbyCard } from './BaseLobbyCard';

interface HousieLobbyCardProps {
    game: any;
    memberCount: number;
    onPress: (game: any) => void;
    activeColor?: string;
}

export const HousieLobbyCard = ({ game, memberCount, onPress, activeColor = '#b30069' }: HousieLobbyCardProps) => {
    const { user } = useAuthStore();
    const isLive = game.status === 'active';
    const isStarting = game.status === 'starting';
    const isHost = user?.id === game.host_id;
    const hasTicket = game.myTicketCount > 0;
    const isManual = game.settings?.callingMode === 'manual';

    let buttonLabel = 'Get Tickets';
    let buttonIcon = 'ticket-alt';

    if (game.status === 'waiting') {
        buttonLabel = hasTicket ? 'Enter Lobby' : 'Get Tickets';
        buttonIcon = 'ticket-alt';
    } else if (isLive || isStarting) {
        if (isHost) {
            if (hasTicket) {
                buttonLabel = 'Play Now';
                buttonIcon = 'gamepad';
            } else if (isManual) {
                buttonLabel = 'Resume Host';
                buttonIcon = 'play-circle';
            } else {
                buttonLabel = 'Spectate';
                buttonIcon = 'eye';
            }
        } else {
            buttonLabel = hasTicket ? 'Play Now' : 'Spectate';
            buttonIcon = hasTicket ? 'gamepad' : 'eye';
        }
    }

    const headerBadge = hasTicket ? (
        <View className="ml-2 bg-green-50 p-1 rounded-full">
            <MaterialIcons name="check-circle" size={14} color="#16a34a" />
        </View>
    ) : null;

    const additionalStats = hasTicket ? (
        <Text className="text-green-600 font-body-bold text-xs">
            {game.myTicketCount} ticket{game.myTicketCount > 1 ? 's' : ''}
        </Text>
    ) : null;

    return (
        <BaseLobbyCard
            title={game.title || 'Housie Room'}
            hostName={game.hostName}
            status={game.status}
            memberCount={memberCount}
            participantCount={game.participantCount || 0}
            activeColor={activeColor}
            onPress={() => onPress(game)}
            buttonLabel={buttonLabel}
            buttonIcon={buttonIcon}
            headerBadge={headerBadge}
            additionalStats={additionalStats}
        />
    );
};
