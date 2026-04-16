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
import * as Notifications from 'expo-notifications';
import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';

const Stack = createStackNavigator();

export const RootNavigator = () => {
    const { isAuthenticated, setAuthenticated, setUser, user } = useAuthStore();
    const [isAppReady, setIsAppReady] = useState(false);
    const navigationRef = useRef<NavigationContainerRef<any>>(null);

    // Global Deep Link Handler
    const handleDeepLink = async (url: string | null) => {
        if (!url) return;
        const parsed = Linking.parse(url);
        
        // mandali://join/CODE
        if (parsed.path?.startsWith('join/')) {
            const inviteCode = parsed.path.split('/')[1];
            if (inviteCode) await AsyncStorage.setItem('pending_invite_code', inviteCode);
        }
        
        // mandali://housie/CODE
        if (parsed.path?.startsWith('housie/')) {
            const gameCode = parsed.path.split('/')[1];
            if (gameCode) await AsyncStorage.setItem('pending_housie_code', gameCode);
        }

        // mandali://memories/GROUP_ID
        if (parsed.path?.startsWith('memories/')) {
            const groupId = parsed.path.split('/')[1];
            if (groupId) await AsyncStorage.setItem('pending_memories_group_id', groupId);
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
        const unsubscribe = onAuthStateChanged(getAuth(), async (firebaseUser) => {
            try {
                if (firebaseUser) {
                    // Try to restore Mandali user data from storage
                    const userData = await AsyncStorage.getItem('mandali_user');
                    if (userData) {
                        setUser(JSON.parse(userData));
                        setAuthenticated(true);
                        registerForPushNotificationsAsync();
                    } else {
                        // Firebase session exists but local data is missing
                        // This might happen on a new install or if storage was cleared
                        // We set authenticated to true to let logic flow to SetupProfile if needed
                        setAuthenticated(true);
                    }
                } else {
                    // No firebase user, force logout state
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

    const isProfileIncomplete = isAuthenticated && (!user?.name || user?.name.trim() === '');

    // Handle Push Notification Clicks
    useEffect(() => {
        const subscription = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response.notification.request.content.data;
            if (data?.url) handleDeepLink(String(data.url));
        });
        return () => subscription.remove();
    }, []);

    // Execute Join/Game/Memory Navigation whenever App completes state
    useEffect(() => {
        const processPendingActions = async () => {
            if (isAppReady && isAuthenticated && !isProfileIncomplete) {
                // 1. Check for Group Invites
                const pendingCode = await AsyncStorage.getItem('pending_invite_code');
                if (pendingCode) {
                    await AsyncStorage.removeItem('pending_invite_code');
                    setTimeout(() => {
                        navigationRef.current?.navigate('Main', {
                            screen: 'Groups',
                            params: { screen: 'JoinGroup', params: { inviteCode: pendingCode } }
                        });
                    }, 500);
                    return;
                }

                // 2. Check for Housie Games
                const pendingHousie = await AsyncStorage.getItem('pending_housie_code');
                if (pendingHousie) {
                    await AsyncStorage.removeItem('pending_housie_code');
                    setTimeout(() => {
                        navigationRef.current?.navigate('Main', {
                            screen: 'Groups',
                            params: { screen: 'HousieGame', params: { gameCode: pendingHousie } }
                        });
                    }, 500);
                    return;
                }

                // 3. Check for Group Memories
                const pendingMemories = await AsyncStorage.getItem('pending_memories_group_id');
                if (pendingMemories) {
                    await AsyncStorage.removeItem('pending_memories_group_id');
                    setTimeout(() => {
                        navigationRef.current?.navigate('Main', {
                            screen: 'Groups',
                            params: { screen: 'GroupDetail', params: { groupId: pendingMemories } }
                        });
                    }, 500);
                    return;
                }
            }
        };
        processPendingActions();
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
