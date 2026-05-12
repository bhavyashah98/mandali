import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Image, Linking, Platform, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { fetchAppVersionStatus, AppVersionStatus } from '../lib/api';
import { useIsTablet } from '../hooks/useIsTablet';
import { getAppBuildNumber, getAppVersion } from '../lib/appVersion';

export const AppUpdateGate = ({ children }: { children: React.ReactNode }) => {
    const [status, setStatus] = useState<AppVersionStatus | null>(null);
    const [isChecking, setIsChecking] = useState(true);
    const isTablet = useIsTablet();
    const { width, height } = useWindowDimensions();

    const isCompactHeight = height < 700;
    const logoSize = isTablet ? 148 : isCompactHeight ? 92 : 112;
    const headlineSize = isTablet ? 42 : 28;
    const bodySize = isTablet ? 20 : 15;
    const buttonHeight = isTablet ? 64 : 54;
    const horizontalPadding = isTablet ? 56 : 28;
    const contentWidth = Math.min(width - horizontalPadding * 2, isTablet ? 560 : 420);
    const storeName = Platform.OS === 'android' ? 'Play Store' : 'App Store';

    const checkVersion = useCallback(async () => {
        try {
            const versionStatus = await fetchAppVersionStatus({
                platform: Platform.OS,
                version: getAppVersion(),
                buildNumber: getAppBuildNumber(),
            });

            setStatus(versionStatus);
        } catch (error) {
            console.warn('[AppUpdateGate] Failed to verify app version:', error);
            setStatus(null);
        } finally {
            setIsChecking(false);
        }
    }, []);

    useEffect(() => {
        checkVersion();

        const subscription = AppState.addEventListener('change', (state) => {
            if (state === 'active') {
                checkVersion();
            }
        });

        return () => subscription.remove();
    }, [checkVersion]);

    const openStore = async () => {
        if (!status?.storeUrl) return;

        try {
            await Linking.openURL(status.storeUrl);
        } catch (error) {
            console.warn('[AppUpdateGate] Failed to open store URL:', error);
        }
    };

    if (isChecking) {
        return (
            <SafeAreaView className="flex-1 bg-[#FDF9F3] items-center justify-center">
                <StatusBar style="dark" />
                <ActivityIndicator color="#b30069" size="large" />
                <Text className="text-[#594048]/60 font-body-bold mt-5" style={{ fontSize: isTablet ? 16 : 12 }}>
                    Checking Mandali version
                </Text>
            </SafeAreaView>
        );
    }

    if (!status?.forceUpdate) {
        return <>{children}</>;
    }

    return (
        <SafeAreaView className="flex-1 bg-[#FDF9F3]" edges={['top', 'bottom', 'left', 'right']}>
            <StatusBar style="dark" />
            <View
                className="flex-1 items-center justify-center"
                style={{
                    paddingHorizontal: horizontalPadding,
                }}
            >
                <View className="items-center w-full" style={{ maxWidth: contentWidth }}>
                    <View
                        className="bg-white items-center justify-center shadow-lg"
                        style={{
                            width: logoSize,
                            height: logoSize,
                            borderRadius: logoSize / 2,
                            borderWidth: isTablet ? 6 : 5,
                            borderColor: '#b30069',
                            shadowColor: '#b30069',
                            shadowOffset: { width: 0, height: 14 },
                            shadowOpacity: 0.18,
                            shadowRadius: 22,
                            elevation: 8,
                            marginBottom: isCompactHeight ? 28 : 40,
                            overflow: 'hidden',
                        }}
                    >
                        <Image
                            source={require('../../assets/icon.png')}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                        />
                    </View>

                    <View
                        className="bg-[#b30069]/10 rounded-full flex-row items-center px-4 py-2 mb-5"
                        style={{ minHeight: isTablet ? 42 : 34 }}
                    >
                        <MaterialIcons name="verified" size={isTablet ? 20 : 16} color="#b30069" />
                        <Text className="text-[#b30069] font-body-bold ml-2 uppercase" style={{ fontSize: isTablet ? 13 : 10, letterSpacing: 1.5 }}>
                            New version available
                        </Text>
                    </View>

                    <Text className="text-[#1c1c18] font-headline-bold text-center mb-4" style={{ fontSize: headlineSize, lineHeight: headlineSize * 1.18 }}>
                        Update Required
                    </Text>

                    <Text className="text-[#594048] font-body-medium text-center mb-8" style={{ fontSize: bodySize, lineHeight: bodySize * 1.55, maxWidth: isTablet ? 500 : 340 }}>
                        {status.message || 'A new Mandali update is required to continue.'}
                    </Text>

                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={openStore}
                        className="bg-[#b30069] rounded-full flex-row items-center justify-center px-8 shadow-md"
                        style={{
                            height: buttonHeight,
                            width: '100%',
                            maxWidth: isTablet ? 360 : 300,
                            shadowColor: '#b30069',
                            shadowOffset: { width: 0, height: 10 },
                            shadowOpacity: 0.22,
                            shadowRadius: 16,
                            elevation: 5,
                        }}
                    >
                        <MaterialIcons name="system-update" size={isTablet ? 28 : 22} color="#ffffff" />
                        <Text className="text-white font-body-bold ml-3" style={{ fontSize: isTablet ? 18 : 15 }} numberOfLines={1}>
                            Update from {storeName}
                        </Text>
                    </TouchableOpacity>

                </View>
            </View>
        </SafeAreaView>
    );
};
