import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import SplashScreen from '@/src/screens/auth/SplashScreen';
import LoginScreen from '@/src/screens/auth/LoginScreen';

const Stack = createStackNavigator();

export const AuthNavigator = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
        </Stack.Navigator>
    );
};
