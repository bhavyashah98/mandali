import React from 'react';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';

import PlansHomeScreen from '../screens/plans/PlansHomeScreen';
import CreatePlanScreen from '../screens/plans/CreatePlanScreen';
import PlanDetailsScreen from '../screens/plans/PlanDetailsScreen';

const Stack = createStackNavigator();

export const PlansNavigator = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                ...TransitionPresets.SlideFromRightIOS,
            }}
        >
            <Stack.Screen name="PlanHomeScreen" component={PlansHomeScreen} />
            <Stack.Screen name="CreatePlan" component={CreatePlanScreen} />
            <Stack.Screen name="PlanDetails" component={PlanDetailsScreen} />
        </Stack.Navigator>
    );
};
