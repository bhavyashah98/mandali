import React from 'react';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';

import MemoriesScreen from '../screens/memories/MemoriesScreen';
import CreateMemoryScreen from '../screens/memories/CreateMemoryScreen';

const Stack = createStackNavigator();

export const MemoriesNavigator = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                ...TransitionPresets.SlideFromRightIOS,
            }}
        >
            <Stack.Screen name="MemoriesHome" component={MemoriesScreen} />
            <Stack.Screen name="CreateMemory" component={CreateMemoryScreen} />
        </Stack.Navigator>
    );
};
