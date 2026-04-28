import React, { useEffect, useState, useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthNavigator } from './AuthNavigator';
import { TabNavigator } from './TabNavigator';
import { useAuthStore } from '../stores/authStore';
import SetupProfileScreen from '../screens/auth/SetupProfileScreen';
import { registerForPushNotificationsAsync } from '../lib/pushNotifications';
import { fetchCurrentUser } from '../lib/api';
import { initializeSocket, disconnectSocket } from '../lib/socketService';
import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';

const Stack = createStackNavigator();

export const RootNavigator = () => {
    const { isAuthenticated, setAuthenticated, setUser, user } = useAuthStore();
    const [isAppReady, setIsAppReady] = useState(false);
    const navigationRef = useRef<NavigationContainerRef<any>>(null);
    const isProfileIncomplete = isAuthenticated && (!user?.name || user?.name.trim() === '');

    const navigateToFeature = (feature: string, params: any) => {
        if (!navigationRef.current || !navigationRef.current.isReady()) {
            setTimeout(() => navigateToFeature(feature, params), 500);
            return;
        }

        switch (feature) {
            case 'join':
                navigationRef.current.navigate('Main', {
                    screen: 'Groups',
                    params: { screen: 'JoinGroup', params: { inviteCode: params.id } }
                });
                break;
            case 'housie':
                navigationRef.current.navigate('Main', {
                    screen: 'Housie',
                    params: {
                        screen: 'HousieJoinGame',
                        params: {
                            gameCode: params.gameCode,
                            groupId: params.groupId
                        }
                    }
                });
                break;
            case 'memories':
                navigationRef.current.navigate('Main', {
                    screen: 'Memories',
                    params: { screen: 'MemoriesHome', params: { groupId: params.id } }
                });
                break;
        }
    };

    // Global Deep Link Handler
    const handleDeepLink = async (url: string | null) => {
        if (!url) return;

        const cleanUrl = url.replace('mandali://', '').replace('https://api.mandaliapp.com/', '').split('?')[0];
        const parts = cleanUrl.split('/').filter(Boolean);

        const feature = parts[0];
        const segments = parts.slice(1);

        if (feature && segments.length > 0) {
            let params: any = {};

            if (feature === 'housie') {
                params.gameCode = segments[0];
                if (segments.length > 1) params.groupId = segments[1];
            } else {
                params.id = segments[0];
            }

            if (isAppReady && isAuthenticated && !isProfileIncomplete) {
                navigateToFeature(feature, params);
            } else {
                await AsyncStorage.setItem('pending_deeplink', JSON.stringify({ feature, params }));
            }
        }
    };

    useEffect(() => {
        // Detect initial URL (Cold Boot)
        Linking.getInitialURL().then(handleDeepLink);

        // Detect live foreground URL changes
        const subscription = Linking.addEventListener('url', (e) => handleDeepLink(e.url));
        return () => subscription.remove();
    }, [isAppReady, isAuthenticated, isProfileIncomplete]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(getAuth(), async (firebaseUser) => {
            try {
                if (firebaseUser) {
                    const [userData, token] = await Promise.all([
                        AsyncStorage.getItem('mandali_user'),
                        AsyncStorage.getItem('mandali_token')
                    ]);

                    if (userData && token) {
                        setUser(JSON.parse(userData));
                        setAuthenticated(true);
                        initializeSocket(token);
                        registerForPushNotificationsAsync();
                    } else if (token) {
                        try {
                            const profile = await fetchCurrentUser();
                            if (profile) {
                                await AsyncStorage.setItem('mandali_user', JSON.stringify(profile));
                                setUser(profile);
                            }
                            setAuthenticated(true);
                            initializeSocket(token);
                        } catch (err) {
                            setAuthenticated(true);
                            initializeSocket(token);
                        }
                    }
                } else {
                    setAuthenticated(false);
                    setUser(null);
                    disconnectSocket();
                }
            } catch (err) {
                console.error('[Auth Listener] Error:', err);
            } finally {
                setIsAppReady(true);
            }
        });

        return unsubscribe;
    }, []);

    // Handle Push Notification Clicks (Foreground & Background)
    useEffect(() => {
        if (isAuthenticated && !isProfileIncomplete) {
            registerForPushNotificationsAsync();
        }

        // Handle clicks while app is already open
        const subscription = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response.notification.request.content.data;
            if (data?.url) handleDeepLink(String(data.url));
        });

        // Handle cold boot (app was closed)
        const checkInitialNotification = async () => {
            try {
                const response = await Notifications.getLastNotificationResponseAsync();
                if (response) {
                    const data = response.notification.request.content.data;
                    if (data?.url) handleDeepLink(String(data.url));
                }
            } catch (err) {
                console.error('[Push] Failed to check initial notification:', err);
            }
        };

        checkInitialNotification();

        return () => subscription.remove();
    }, [isAppReady, isAuthenticated, isProfileIncomplete]);

    // Cold Boot Navigation Catch
    useEffect(() => {
        const processPendingLink = async () => {
            if (isAppReady && isAuthenticated && !isProfileIncomplete) {
                const pending = await AsyncStorage.getItem('pending_deeplink');
                if (pending) {
                    await AsyncStorage.removeItem('pending_deeplink');
                    const { feature, params } = JSON.parse(pending);
                    // Slight delay to ensure stack is definitely rendered
                    setTimeout(() => navigateToFeature(feature, params), 500);
                }
            }
        };
        processPendingLink();
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
