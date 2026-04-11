import React from 'react';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import ProfileMenuScreen from '../screens/auth/ProfileMenuScreen';
import SetupProfileScreen from '../screens/auth/SetupProfileScreen';

const Stack = createStackNavigator();

export const ProfileNavigator = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                ...TransitionPresets.SlideFromRightIOS,
            }}
        >
            <Stack.Screen name="ProfileMenu" component={ProfileMenuScreen} />
            <Stack.Screen name="UpdateProfile" component={SetupProfileScreen} />
        </Stack.Navigator>
    );
};
