import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GroupNavigator } from './GroupNavigator';
import { HousieNavigator } from './HousieNavigator';
import { MemoriesNavigator } from './MemoriesNavigator';
import { ProfileNavigator } from './ProfileNavigator';

const Tab = createBottomTabNavigator();

export const TabNavigator = () => {
    const insets = useSafeAreaInsets();
    
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: '#b30069',
                tabBarInactiveTintColor: '#594048',
                tabBarStyle: {
                    backgroundColor: '#fdf9f3',
                    borderTopWidth: 0,
                    elevation: 10,
                    shadowColor: '#b30069',
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.05,
                    shadowRadius: 10,
                    height: 60 + Math.max(insets.bottom, 8),
                    paddingBottom: Math.max(insets.bottom, 8),
                    paddingTop: 8,
                },
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: any;
                    if (route.name === 'Groups') iconName = focused ? 'people' : 'people-outline';
                    else if (route.name === 'Housie') iconName = focused ? 'game-controller' : 'game-controller-outline';
                    else if (route.name === 'Memories') iconName = focused ? 'images' : 'images-outline';
                    else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
                    
                    return <Ionicons name={iconName} size={size} color={color} />;
                },
            })}
        >
            <Tab.Screen name="Groups" component={GroupNavigator} />
            <Tab.Screen name="Housie" component={HousieNavigator} />
            <Tab.Screen name="Memories" component={MemoriesNavigator} />
            <Tab.Screen name="Profile" component={ProfileNavigator} />
        </Tab.Navigator>
    );
};
