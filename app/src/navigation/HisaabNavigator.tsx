import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HisaabHomeScreen from '../screens/hisaab/HisaabHomeScreen';
import GroupHisaabScreen from '../screens/hisaab/GroupHisaabScreen';
import AddExpenseScreen from '../screens/hisaab/AddExpenseScreen';
import SettleBalanceScreen from '../screens/hisaab/SettleBalanceScreen';

const Stack = createStackNavigator();

export const HisaabNavigator = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="HisaabHome" component={HisaabHomeScreen} />
            <Stack.Screen name="GroupHisaab" component={GroupHisaabScreen} />
            <Stack.Screen 
                name="AddExpense" 
                component={AddExpenseScreen} 
                options={{ presentation: 'modal' }}
            />
            <Stack.Screen 
                name="SettleBalance" 
                component={SettleBalanceScreen} 
                options={{ presentation: 'modal' }}
            />
        </Stack.Navigator>
    );
};
