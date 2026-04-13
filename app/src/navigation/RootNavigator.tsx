import React, { useEffect, useState, useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthNavigator } from './AuthNavigator';
import { TabNavigator } from './TabNavigator';
import { useAuthStore } from '../stores/authStore';
import SetupProfileScreen from '../screens/auth/SetupProfileScreen';
import { registerForPushNotificationsAsync } from '../lib/pushNotifications';

const Stack = createStackNavigator();

export const RootNavigator = () => {
    const { isAuthenticated, setAuthenticated, setUser, user } = useAuthStore();
    const [isAppReady, setIsAppReady] = useState(false);
    const navigationRef = useRef<NavigationContainerRef<any>>(null);

    // Global Deep Link Handler
    const handleDeepLink = async (url: string | null) => {
        if (!url) return;
        const parsed = Linking.parse(url);
        // e.g. mandali://join/XYZA1234
        if (parsed.path?.startsWith('join/')) {
            const inviteCode = parsed.path.split('/')[1];
            if (inviteCode) {
                // Store temporarily across app lifecycle
                await AsyncStorage.setItem('pending_invite_code', inviteCode);
            }
        }
    };

    useEffect(() => {
        // Detect initial URL
        Linking.getInitialURL().then(handleDeepLink);
        // Detect live foreground URL changes
        const subscription = Linking.addEventListener('url', (e) => handleDeepLink(e.url));
        return () => subscription.remove();
    }, []);

    useEffect(() => {
        const loadSession = async () => {
            try {
                const token = await AsyncStorage.getItem('mandali_token');
                const userData = await AsyncStorage.getItem('mandali_user');

                if (token && userData) {
                    setAuthenticated(true);
                    setUser(JSON.parse(userData));
                    registerForPushNotificationsAsync();
                }
            } catch (err) {
                console.error('[Session] Load error:', err);
            } finally {
                setIsAppReady(true);
            }
        };

        loadSession();
    }, []);

    const isProfileIncomplete = isAuthenticated && (!user?.name || user?.name.trim() === '');

    // Execute Join Navigation whenever App completes state
    useEffect(() => {
        const processPendingInvite = async () => {
            if (isAppReady && isAuthenticated && !isProfileIncomplete) {
                const pendingCode = await AsyncStorage.getItem('pending_invite_code');
                if (pendingCode) {
                    await AsyncStorage.removeItem('pending_invite_code');
                    // Give a slight delay to let Stack render
                    setTimeout(() => {
                        navigationRef.current?.navigate('Main', {
                            screen: 'Groups',
                            params: {
                                screen: 'JoinGroup',
                                params: { inviteCode: pendingCode }
                            }
                        });
                    }, 500);
                }
            }
        };
        processPendingInvite();
    }, [isAppReady, isAuthenticated, isProfileIncomplete]);

    if (!isAppReady) return null;

    return (
        <NavigationContainer ref={navigationRef}>
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
