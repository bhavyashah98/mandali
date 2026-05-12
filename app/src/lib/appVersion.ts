import { Platform } from 'react-native';
import Constants from 'expo-constants';

export const getAppBuildNumber = () => {
    if (Platform.OS === 'android') {
        return String(Constants.expoConfig?.android?.versionCode || 0);
    }

    if (Platform.OS === 'ios') {
        return String(Constants.expoConfig?.ios?.buildNumber || 0);
    }

    return '0';
};

export const getAppVersion = () => Constants.expoConfig?.version || '0.0.0';

export const getAppVersionHeaders = () => ({
    'X-Mandali-Platform': Platform.OS,
    'X-Mandali-Version': getAppVersion(),
    'X-Mandali-Build': getAppBuildNumber(),
});
