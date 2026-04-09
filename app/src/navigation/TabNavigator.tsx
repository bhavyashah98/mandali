import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { GroupNavigator } from './GroupNavigator';
import { HousieNavigator } from './HousieNavigator';
import { MemoriesNavigator } from './MemoriesNavigator';
import SetupProfileScreen from '@/src/screens/auth/SetupProfileScreen';

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
            <Tab.Screen name="Profile" component={SetupProfileScreen} />
        </Tab.Navigator>
    );
};
