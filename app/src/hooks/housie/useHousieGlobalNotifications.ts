import { useEffect, useRef } from 'react';
import { useSocket } from '../useSocket';
import { fetchGroups } from '../../lib/api';
import { useHousieNotifications } from '../../contexts/HousieNotificationContext';
import { useAuthStore } from '../../stores/authStore';
import { useNavigation } from '@react-navigation/native';

export const useHousieGlobalNotifications = () => {
    const socket = useSocket();
    const { addNotification } = useHousieNotifications();
    const { isAuthenticated } = useAuthStore();
    const navigation = useNavigation<any>();

    // Track games we've already notified about in this session to prevent spam
    const notifiedGames = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (!socket || !isAuthenticated) return;

        // 1. Join rooms for all groups the user is in
        const joinGroupRooms = async () => {
            try {
                const groups = await fetchGroups();
                if (groups && Array.isArray(groups)) {
                    groups.forEach((group: any) => {
                        socket.emit('join_group', group.id);
                    });
                }
            } catch (err) {
                console.error('[GlobalNotifications] Failed to fetch groups for socket join:', err);
            }
        };

        const onConnect = () => {
            joinGroupRooms();
        };

        if (socket.connected) {
            onConnect();
        }
        socket.on('connect', onConnect);

        const shouldNotify = (gameCode: string) => {
            if (!gameCode) return false;

            // 1. Don't notify if we already did
            if (notifiedGames.current.has(gameCode)) return false;

            // 2. Don't notify if the user is already in a screen for this specific game
            const currentRoute = navigation.getCurrentRoute();
            const routeParams = currentRoute?.params as any;
            const currentRouteName = currentRoute?.name;

            // If user is already on a screen related to THIS game, don't notify
            if (routeParams?.gameCode === gameCode) {
                return false;
            }

            // List of screens where we should NEVER show a starting notification banner
            // because the user is already occupied with a game flow
            const activeGameScreens = ['HousieWaitingRoom', 'HousieStarting', 'HousieGame', 'HousieTicket'];
            if (currentRouteName && activeGameScreens.includes(currentRouteName)) {
                return false;
            }

            return true;
        };

        // 2. Listen for game_opened event (from scheduled games)
        const onGameOpened = (data: any) => {
            const gameCode = data.gameCode;
            if (!shouldNotify(gameCode)) return;

            console.log('[GlobalNotifications] Game opened:', data);
            notifiedGames.current.add(gameCode);
            addNotification({
                gameCode: gameCode,
                groupId: data.groupId || data.group_id,
                title: data.title || 'New Housie Game Starting!'
            });
        };

        // 3. Listen for game_starting event (general start)
        const onGameStarting = (data: any) => {
            const gameCode = data.gameCode;
            if (data.status !== 'starting' || !shouldNotify(gameCode)) return;

            console.log('[GlobalNotifications] Game starting:', data);
            notifiedGames.current.add(gameCode);
            addNotification({
                gameCode: gameCode,
                groupId: data.groupId || data.group_id || data.game?.group_id,
                title: data.game?.title || data.title || 'Housie Game Starting!'
            });
        };

        socket.on('game_opened', onGameOpened);
        socket.on('game_starting', onGameStarting);

        return () => {
            socket.off('connect', onConnect);
            socket.off('game_opened', onGameOpened);
            socket.off('game_starting', onGameStarting);
        };
    }, [socket, isAuthenticated, navigation]);
};
