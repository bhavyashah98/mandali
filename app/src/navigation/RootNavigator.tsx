import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthNavigator } from './AuthNavigator';
import { TabNavigator } from './TabNavigator';
import { useAuthStore } from '../stores/authStore';
import SetupProfileScreen from '../screens/auth/SetupProfileScreen';

const Stack = createStackNavigator();

export const RootNavigator = () => {
    const { isAuthenticated, setAuthenticated, setUser, user } = useAuthStore();
    const [isAppReady, setIsAppReady] = React.useState(false);

    React.useEffect(() => {
        const loadSession = async () => {
            try {
                const token = await AsyncStorage.getItem('mandali_token');
                const userData = await AsyncStorage.getItem('mandali_user');
                
                if (token && userData) {
                    setAuthenticated(true);
                    setUser(JSON.parse(userData));
                }
            } catch (err) {
                console.error('[Session] Load error:', err);
            } finally {
                setIsAppReady(true);
            }
        };

        loadSession();
    }, []);

    if (!isAppReady) return null;

    // Logic: If authenticated but name is missing, force profile setup
    const isProfileIncomplete = isAuthenticated && (!user?.name || user?.name.trim() === '');

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {!isAuthenticated ? (
                    <Stack.Screen name="Auth" component={AuthNavigator} />
                ) : isProfileIncomplete ? (
                    <Stack.Screen name="SetupProfile" component={SetupProfileScreen} />
                ) : (
                    <Stack.Screen name="Main" component={TabNavigator} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};
