import React from 'react';
import { useIsTablet } from '../hooks/useIsTablet';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useConfig } from '../context/ConfigContext';
import { useQuery } from '@tanstack/react-query';
import { fetchGroups } from '../lib/api';

import { GroupNavigator } from './GroupNavigator';
import { GamesNavigator } from './GamesNavigator';
import { MemoriesNavigator } from './MemoriesNavigator';
import { ProfileNavigator } from './ProfileNavigator';
import { PlansNavigator } from './PlansNavigator';

const Tab = createBottomTabNavigator();

const resetTabTo = (tabName: string, screenName: string) => ({ navigation }: any) => ({
    tabPress: (event: any) => {
        event.preventDefault();
        navigation.navigate(tabName, { screen: screenName, params: undefined });
    },
});

export const TabNavigator = () => {
    const insets = useSafeAreaInsets();
    const isTablet = useIsTablet();
    const { isPlansEnabled } = useConfig();

    const { data: groups } = useQuery({
        queryKey: ['groups'],
        queryFn: fetchGroups,
    });
    const totalUnseen = (groups || []).reduce((sum: number, g: any) => sum + (g.unseenCount || 0), 0);

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: '#b30069',
                tabBarInactiveTintColor: '#594048',
                tabBarLabelPosition: 'below-icon',
                tabBarLabelStyle: {
                    fontFamily: 'BeVietnamPro_600SemiBold',
                    fontSize: isTablet ? 16 : 11,
                    marginBottom: isTablet ? 12 : 0,
                },
                tabBarIconStyle: {
                    width: isTablet ? 50 : 28,
                    height: isTablet ? 50 : 28,
                },
                tabBarItemStyle: {
                    paddingVertical: isTablet ? 10 : 5,
                },
                tabBarStyle: {
                    backgroundColor: '#fdf9f3',
                    borderTopWidth: 0,
                    elevation: 10,
                    shadowColor: '#b30069',
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.05,
                    shadowRadius: 10,
                    height: (isTablet ? 110 : 64) + Math.max(insets.bottom, 8),
                    paddingBottom: Math.max(insets.bottom, 8),
                    paddingTop: isTablet ? 12 : 8,
                },
                tabBarIcon: ({ focused, color }) => {
                    let iconName: any;
                    if (route.name === 'Groups') iconName = focused ? 'people' : 'people-outline';
                    else if (route.name === 'Games') iconName = focused ? 'game-controller' : 'game-controller-outline';
                    else if (route.name === 'Memories') iconName = focused ? 'images' : 'images-outline';
                    else if (route.name === 'Plans') iconName = focused ? 'calendar' : 'calendar-outline';
                    else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';

                    return <Ionicons name={iconName} size={isTablet ? 44 : 26} color={color} />;
                },
            })}
        >
            <Tab.Screen name="Groups" component={GroupNavigator} listeners={resetTabTo('Groups', 'GroupList')} />
            {
                isPlansEnabled && (
                    <Tab.Screen name="Plans" component={PlansNavigator} />
                )
            }
            <Tab.Screen name="Games" component={GamesNavigator} listeners={resetTabTo('Games', 'GameSelectGroup')} />
            <Tab.Screen
                name="Memories"
                component={MemoriesNavigator}
                listeners={resetTabTo('Memories', 'MemoriesSelectGroup')}
                options={totalUnseen > 0 ? { tabBarBadge: totalUnseen, tabBarBadgeStyle: { backgroundColor: '#b30069', fontSize: 10, minWidth: 18, height: 18 } } : {}}
            />
            <Tab.Screen name="Profile" component={ProfileNavigator} />
        </Tab.Navigator>
    );
};
