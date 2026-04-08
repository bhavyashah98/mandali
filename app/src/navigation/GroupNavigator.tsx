import React from 'react';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';

import GroupListScreen from '../screens/group/GroupListScreen';
import CreateGroupScreen from '../screens/group/CreateGroupScreen';
import JoinGroupScreen from '../screens/group/JoinGroupScreen';
import GroupDetailScreen from '../screens/group/GroupDetailScreen';

const Stack = createStackNavigator();

export const GroupNavigator = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                ...TransitionPresets.SlideFromRightIOS,
            }}
        >
            <Stack.Screen name="GroupList" component={GroupListScreen} />
            <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
            <Stack.Screen name="JoinGroup" component={JoinGroupScreen} />
            <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
        </Stack.Navigator>
    );
};
