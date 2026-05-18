import React from 'react';
import { View } from 'react-native';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';

import GameSelectGroupScreen from '../screens/games/GameSelectGroupScreen';
import GameSelectionScreen from '../screens/games/GameSelectionScreen';
import GameLobbyScreen from '../screens/games/GameLobbyScreen';
import HousieJoinGameScreen from '../screens/housie/HousieJoinGameScreen';
import HousieDefineBountyScreen from '../screens/housie/HousieDefineBountyScreen';
import HousieWaitingRoomScreen from '../screens/housie/HousieWaitingRoomScreen';
import HousieGameScreen from '../screens/housie/HousieGameScreen';
import HousieStartingScreen from '../screens/housie/HousieStartingScreen';
import HousieTicketScreen from '../screens/housie/HousieTicketScreen';
import HousieResultsScreen from '../screens/housie/HousieResultsScreen';
import HousieLeaderboardScreen from '../screens/housie/HousieLeaderboardScreen';
import HousieSpectatorScreen from '../screens/housie/HousieSpectatorScreen';
import HousieHostSettingsScreen from '../screens/housie/HousieHostSettingsScreen';
import BlinkHostSettingsScreen from '../screens/blink/BlinkHostSettingsScreen';
import BlinkWaitingRoomScreen from '../screens/blink/BlinkWaitingRoomScreen';
import BlinkGameScreen from '../screens/blink/BlinkGameScreen';
import BlinkStartingScreen from '../screens/blink/BlinkStartingScreen';
import BlinkLeaderboardScreen from '../screens/blink/BlinkLeaderboardScreen';
import BlinkResultsScreen from '../screens/blink/BlinkResultsScreen';
import BlinkJoinScreen from '../screens/blink/BlinkJoinScreen';

const Stack = createStackNavigator();

export const GamesNavigator = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                ...TransitionPresets.SlideFromRightIOS,
            }}
        >
            <Stack.Screen name="GameSelectGroup" component={GameSelectGroupScreen} />
            <Stack.Screen name="GameSelection" component={GameSelectionScreen} />
            <Stack.Screen name="GameLobby" component={GameLobbyScreen} />
            
            {/* Housie Flow */}
            <Stack.Screen name="HousieLobby" component={GameLobbyScreen} initialParams={{ gameType: 'housie' }} />
            <Stack.Screen name="HousieHostSettings" component={HousieHostSettingsScreen} />
            <Stack.Screen name="HousieJoinGame" component={HousieJoinGameScreen} />
            <Stack.Screen name="HousieDefineBounty" component={HousieDefineBountyScreen} />
            <Stack.Screen name="HousieWaitingRoom" component={HousieWaitingRoomScreen} />
            <Stack.Screen name="HousieStarting" component={HousieStartingScreen} />
            <Stack.Screen name="HousieGame" component={HousieGameScreen} />
            <Stack.Screen name="HousieTicket" component={HousieTicketScreen} />
            <Stack.Screen name="HousieResults" component={HousieResultsScreen} />
            <Stack.Screen name="HousieLeaderboard" component={HousieLeaderboardScreen} />
            <Stack.Screen name="HousieSpectator" component={HousieSpectatorScreen} />

            {/* Blink Flow */}
            <Stack.Screen name="BlinkLobby" component={GameLobbyScreen} initialParams={{ gameType: 'blink' }} />
            <Stack.Screen name="BlinkJoin" component={BlinkJoinScreen} />
            <Stack.Screen name="BlinkWaitingRoom" component={BlinkWaitingRoomScreen} />
            <Stack.Screen name="BlinkStarting" component={BlinkStartingScreen} />
            <Stack.Screen name="BlinkGame" component={BlinkGameScreen} />
            <Stack.Screen name="BlinkHostSettings" component={BlinkHostSettingsScreen} />
            <Stack.Screen name="BlinkLeaderboard" component={BlinkLeaderboardScreen} />
            <Stack.Screen name="BlinkResults" component={BlinkResultsScreen} />
        </Stack.Navigator>
    );
};
