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
import { fetchCurrentUser } from '../lib/api';
import * as Notifications from 'expo-notifications';
import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';

const Stack = createStackNavigator();

export const RootNavigator = () => {
    const { isAuthenticated, setAuthenticated, setUser, user } = useAuthStore();
    const [isAppReady, setIsAppReady] = useState(false);
    const navigationRef = useRef<NavigationContainerRef<any>>(null);
    const isProfileIncomplete = isAuthenticated && (!user?.name || user?.name.trim() === '');

    const navigateToFeature = (feature: string, data: string) => {
        if (!navigationRef.current) return;

        switch (feature) {
            case 'join':
                navigationRef.current.navigate('Main', {
                    screen: 'Groups',
                    params: { screen: 'JoinGroup', params: { inviteCode: data } }
                });
                break;
            case 'housie':
                navigationRef.current.navigate('Main', {
                    screen: 'Housie',
                    params: { screen: 'HousieJoinGame', params: { gameCode: data } }
                });
                break;
            case 'memories':
                navigationRef.current.navigate('Main', {
                    screen: 'Memories',
                    params: { screen: 'MemoriesHome', params: { groupId: data } }
                });
                break;
        }
    };

    // Global Deep Link Handler
    const handleDeepLink = async (url: string | null) => {
        if (!url) return;
        const parsed = Linking.parse(url);

        const feature = parsed.hostname;
        const data = parsed.path?.includes('/') ? parsed.path.split('/')[1] : parsed.path;

        if (feature && data) {
            console.log(`[DeepLink] Processing: ${feature} -> ${data}`);

            // Check current readiness state
            if (isAppReady && isAuthenticated && !isProfileIncomplete) {
                navigateToFeature(feature, data);
            } else {
                // Not ready yet (e.g. cold boot) -> Store for later
                await AsyncStorage.setItem('pending_deeplink', JSON.stringify({ feature, data }));
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
                        registerForPushNotificationsAsync();
                    } else if (token) {
                        try {
                            const profile = await fetchCurrentUser();
                            if (profile) {
                                await AsyncStorage.setItem('mandali_user', JSON.stringify(profile));
                                setUser(profile);
                            }
                            setAuthenticated(true);
                        } catch (err) {
                            console.log('[Root Navigator] Profile fetch failed');
                            setAuthenticated(true);
                        }
                    }
                } else {
                    setAuthenticated(false);
                    setUser(null);
                }
            } catch (err) {
                console.error('[Auth Listener] Error:', err);
            } finally {
                setIsAppReady(true);
            }
        });

        return unsubscribe;
    }, []);

    // Handle Push Notification Clicks
    useEffect(() => {
        const subscription = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response.notification.request.content.data;
            if (data?.url) handleDeepLink(String(data.url));
        });
        return () => subscription.remove();
    }, [isAppReady, isAuthenticated, isProfileIncomplete]);

    // Cold Boot Navigation Catch
    useEffect(() => {
        const processPendingLink = async () => {
            if (isAppReady && isAuthenticated && !isProfileIncomplete) {
                const pending = await AsyncStorage.getItem('pending_deeplink');
                if (pending) {
                    await AsyncStorage.removeItem('pending_deeplink');
                    const { feature, data } = JSON.parse(pending);
                    // Slight delay to ensure stack is definitely rendered
                    setTimeout(() => navigateToFeature(feature, data), 500);
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
