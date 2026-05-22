import React, { createContext, useContext } from 'react';
import { Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { fetchAppConfig } from '../lib/api';

interface GameConfigItem {
    id: string;
    title: string;
    subtitle: string;
    icon: string;
    iconType: string;
}

interface AppConfig {
    plans: {
        android: boolean;
        ios: boolean;
    };
    hisaab: {
        android: boolean;
        ios: boolean;
    };
    minimumSupportedVersion: {
        android: string;
        ios: string;
    };
    games: GameConfigItem[];
}

interface ConfigContextType {
    config: AppConfig | undefined;
    isLoading: boolean;
    isError: boolean;
    isHisaabEnabled: boolean;
    isPlansEnabled: boolean;
    availableGames: GameConfigItem[];
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { data: config, isLoading, isError } = useQuery<AppConfig>({
        queryKey: ['appConfig'],
        queryFn: fetchAppConfig,
        staleTime: 1000 * 60 * 10, // 10 minutes
    });

    const isHisaabEnabled = React.useMemo(() => {
        if (!config) return false;
        return Platform.OS === 'android' ? config.hisaab.android : config.hisaab.ios;
    }, [config]);

    const isPlansEnabled = React.useMemo(() => {
        if (!config) return false;
        return Platform.OS === 'android' ? config.plans.android : config.plans.ios;
    }, [config]);

    const availableGames = React.useMemo(() => {
        return config?.games || [];
    }, [config]);

    return (
        <ConfigContext.Provider
            value={{
                config,
                isLoading,
                isError,
                isHisaabEnabled,
                isPlansEnabled,
                availableGames,
            }}
        >
            {children}
        </ConfigContext.Provider>
    );
};

export const useConfig = () => {
    const context = useContext(ConfigContext);
    if (context === undefined) {
        throw new Error('useConfig must be used within a ConfigProvider');
    }
    return context;
};
