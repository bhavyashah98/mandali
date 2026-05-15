import { HousieLobbyScreen } from '../screens/housie/HousieLobbyScreen';
import { BlinkLobbyScreen } from '../screens/blink/BlinkLobbyScreen';

export interface GameConfig {
    id: string;
    title: string;
    icon: string;
    primaryColor: string;
    leaderboardScreen: string;
    Component: any;
}

export const GAME_REGISTRY: Record<string, GameConfig> = {
    housie: {
        id: 'housie',
        title: 'Housie',
        icon: 'dice',
        primaryColor: '#b30069',
        leaderboardScreen: 'HousieLeaderboard',
        Component: HousieLobbyScreen
    },
    blink: {
        id: 'blink',
        title: 'Blink',
        icon: 'bolt',
        primaryColor: '#b30069',
        leaderboardScreen: 'BlinkLeaderboard',
        Component: BlinkLobbyScreen
    }
};
