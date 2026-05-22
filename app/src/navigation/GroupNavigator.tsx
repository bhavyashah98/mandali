import React from 'react';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';

import GroupListScreen from '../screens/group/GroupListScreen';
import CreateGroupScreen from '../screens/group/CreateGroupScreen';
import JoinGroupScreen from '../screens/group/JoinGroupScreen';
import GroupDetailScreen from '../screens/group/GroupDetailScreen';
import GroupHisaabScreen from '../screens/hisaab/GroupHisaabScreen';
import AddExpenseScreen from '../screens/hisaab/AddExpenseScreen';
import SettleBalanceScreen from '../screens/hisaab/SettleBalanceScreen';
import ExpenseDetailScreen from '../screens/hisaab/ExpenseDetailScreen';

const Stack = createStackNavigator();

export const GroupNavigator = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                ...TransitionPresets.SlideFromRightIOS,
            }}
        >
            <Stack.Screen name="GroupList" component={GroupListScreen} />
            <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
            <Stack.Screen name="JoinGroup" component={JoinGroupScreen} />
            <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
            <Stack.Screen name="GroupHisaab" component={GroupHisaabScreen} />
            <Stack.Screen name="AddExpense" component={AddExpenseScreen} />
            <Stack.Screen name="SettleBalance" component={SettleBalanceScreen} />
            <Stack.Screen name="ExpenseDetail" component={ExpenseDetailScreen} />
        </Stack.Navigator>
    );
};
