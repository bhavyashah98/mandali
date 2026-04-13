import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import axios from 'axios';
import { API_URL, getAuthHeaders } from './api';

// Configures how the app handles notifications while foregrounded
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export const registerForPushNotificationsAsync = async () => {
    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#b30069',
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        
        if (finalStatus !== 'granted') {
            console.log('[Push] Failed to get push token for push notification!');
            return;
        }

        try {
            // Get the Expo Push Token mapping cleanly to Expo's routing hardware
            const tokenResult = await Notifications.getExpoPushTokenAsync({
                projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
            });
            token = tokenResult.data;

            // Sync token to backend Database seamlessly
            const headers = await getAuthHeaders();
            if (headers.Authorization) {
                await axios.post(`${API_URL}/auth/push-token`, { push_token: token }, { headers });
                console.log('[Push] Successfully registered exponent token with backend');
            }
        } catch (e) {
            console.error('[Push] Token Registration Error:', e);
        }
    } else {
        console.log('[Push] Must use physical device for Push Notifications');
    }

    return token;
};
