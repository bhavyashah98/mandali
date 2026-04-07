import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeHub from '@/src/screens/home/HomeHub';
import MemoriesModule from '@/src/screens/memories/MemoriesModule';
import GroupSettings from '@/src/screens/group/GroupSettings';
import TambolaScreen from '@/src/screens/TambolaScreen';
import MoreScreen from '@/src/screens/MoreScreen';

const Tab = createBottomTabNavigator();

export const TabNavigator = () => {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: '#b30069',
                tabBarInactiveTintColor: '#594048',
                tabBarStyle: {
                    backgroundColor: '#fdf9f3',
                    borderTopWidth: 0,
                    elevation: 0,
                    height: 60,
                    paddingBottom: 8,
                },
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: any;
                    if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
                    else if (route.name === 'Memories') iconName = focused ? 'images' : 'images-outline';
                    else if (route.name === 'Group') iconName = focused ? 'people' : 'people-outline';
                    else if (route.name === 'Tambola') iconName = focused ? 'game-controller' : 'game-controller-outline';
                    else if (route.name === 'More') iconName = focused ? 'apps' : 'apps-outline';
                    
                    return <Ionicons name={iconName} size={size} color={color} />;
                },
            })}
        >
            <Tab.Screen name="Home" component={HomeHub} />
            <Tab.Screen name="Memories" component={MemoriesModule} />
            <Tab.Screen name="Group" component={GroupSettings} />
            <Tab.Screen name="Tambola" component={TambolaScreen} />
            <Tab.Screen name="More" component={MoreScreen} />
        </Tab.Navigator>
    );
};
