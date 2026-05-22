import React from 'react';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';

import PlansHomeScreen from '../screens/plans/PlansHomeScreen';
import CreatePlanScreen from '../screens/plans/CreatePlanScreen';

const Stack = createStackNavigator();

export const PlansNavigator = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                ...TransitionPresets.SlideFromRightIOS,
            }}
        >
            <Stack.Screen name="PlansHome" component={PlansHomeScreen} />
            <Stack.Screen name="CreatePlan" component={CreatePlanScreen} />
        </Stack.Navigator>
    );
};
