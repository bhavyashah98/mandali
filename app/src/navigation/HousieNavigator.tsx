import React from 'react';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';

import HousieSelectGroupScreen from '../screens/housie/HousieSelectGroupScreen';
import HousieLobbyScreen from '../screens/housie/HousieLobbyScreen';
import HousieCreateGameScreen from '../screens/housie/HousieCreateGameScreen';
import HousieJoinGameScreen from '../screens/housie/HousieJoinGameScreen';
import HousieDefineBountyScreen from '../screens/housie/HousieDefineBountyScreen';
import HousieWaitingRoomScreen from '../screens/housie/HousieWaitingRoomScreen';
import HousieGameScreen from '../screens/housie/HousieGameScreen';
import HousieTicketScreen from '../screens/housie/HousieTicketScreen';
import HousieResultsScreen from '../screens/housie/HousieResultsScreen';
import HousieLeaderboardScreen from '../screens/housie/HousieLeaderboardScreen';
import HousieSpectatorScreen from '../screens/housie/HousieSpectatorScreen';

const Stack = createStackNavigator();

export const HousieNavigator = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                ...TransitionPresets.SlideFromRightIOS,
            }}
        >
            <Stack.Screen name="HousieSelectGroup" component={HousieSelectGroupScreen} />
            <Stack.Screen name="HousieLobby" component={HousieLobbyScreen} />
            <Stack.Screen name="HousieCreateGame" component={HousieCreateGameScreen} />
            <Stack.Screen name="HousieJoinGame" component={HousieJoinGameScreen} />
            <Stack.Screen name="HousieDefineBounty" component={HousieDefineBountyScreen} />
            <Stack.Screen name="HousieWaitingRoom" component={HousieWaitingRoomScreen} />
            <Stack.Screen name="HousieGame" component={HousieGameScreen} />
            <Stack.Screen name="HousieTicket" component={HousieTicketScreen} />
            <Stack.Screen name="HousieResults" component={HousieResultsScreen} />
            <Stack.Screen name="HousieLeaderboard" component={HousieLeaderboardScreen} />
            <Stack.Screen name="HousieSpectator" component={HousieSpectatorScreen} />
        </Stack.Navigator>
    );
};
