import React from 'react';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import HisaabHomeScreen from '../screens/hisaab/HisaabHomeScreen';
import GroupHisaabScreen from '../screens/hisaab/GroupHisaabScreen';
import AddExpenseScreen from '../screens/hisaab/AddExpenseScreen';
import SettleBalanceScreen from '../screens/hisaab/SettleBalanceScreen';
import ExpenseDetailScreen from '../screens/hisaab/ExpenseDetailScreen';

const Stack = createStackNavigator();

export const HisaabNavigator = () => {
    return (
        <Stack.Navigator 
            screenOptions={{ 
                headerShown: false,
                ...TransitionPresets.SlideFromRightIOS
            }}
        >
            <Stack.Screen name="HisaabHome" component={HisaabHomeScreen} />
            <Stack.Screen name="GroupHisaab" component={GroupHisaabScreen} />
            <Stack.Screen name="AddExpense" component={AddExpenseScreen} />
            <Stack.Screen name="SettleBalance" component={SettleBalanceScreen} />
            <Stack.Screen name="ExpenseDetail" component={ExpenseDetailScreen} />
        </Stack.Navigator>
    );
};

