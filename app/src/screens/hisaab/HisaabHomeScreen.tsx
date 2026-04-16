import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useHisaabStore, GroupBalance } from '../../stores/hisaabStore';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

const HisaabHomeScreen = () => {
    const navigation = useNavigation<StackNavigationProp<any>>();
    const { groupBalances, loading, fetchGroupBalances } = useHisaabStore();

    useEffect(() => {
        fetchGroupBalances();
    }, []);

    const renderGroupItem = ({ item }: { item: GroupBalance }) => {
        const isOwed = item.netBalance > 0;
        const isBorrowing = item.netBalance < 0;
        const isSettled = item.netBalance === 0;

        return (
            <TouchableOpacity 
                onPress={() => navigation.navigate('GroupHisaab', { groupId: item.groupId, groupName: item.groupName })}
                className="bg-white rounded-[24px] p-5 mb-4 flex-row items-center border border-on-surface/5"
                style={{
                    elevation: 4,
                    shadowColor: '#b30069',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.05,
                    shadowRadius: 10
                }}
            >
                <View className="w-12 h-12 rounded-full bg-surface-container-high items-center justify-center mr-4">
                    <Ionicons name="people" size={24} color="#b30069" />
                </View>
                
                <View className="flex-1">
                    <Text className="font-headline-bold text-on-surface text-lg">{item.groupName}</Text>
                    <Text className="font-body-regular text-on-surface-variant text-xs">{item.lastActivity || 'No activity'}</Text>
                </View>

                <View className="items-end">
                    <Text className={`font-headline-bold text-base ${isOwed ? 'text-success' : isBorrowing ? 'text-error' : 'text-on-surface-variant'}`}>
                        {isSettled ? 'Settled' : `₹${Math.abs(item.netBalance).toFixed(2)}`}
                    </Text>
                    {!isSettled && (
                        <Text className="font-body-medium text-[10px] uppercase tracking-tighter opacity-60">
                            {isOwed ? 'You get' : 'You owe'}
                        </Text>
                    )}
                </View>

                <MaterialIcons name="chevron-right" size={20} color="#594048" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
        );
    };

    const totalBalance = groupBalances.reduce((acc, curr) => acc + curr.netBalance, 0);

    return (
        <SafeAreaView className="flex-1 bg-background">
            {/* Header */}
            <View className="px-6 py-4 flex-row justify-between items-center">
                <View>
                    <Text className="font-headline-bold text-3xl text-on-surface">Hisaab</Text>
                    <Text className="font-body-regular text-on-surface-variant">Balances across groups</Text>
                </View>
                <TouchableOpacity className="w-10 h-10 rounded-full bg-surface-container-high items-center justify-center">
                    <MaterialIcons name="filter-list" size={24} color="#b30069" />
                </TouchableOpacity>
            </View>

            {/* Global Summary Card */}
            <View className="px-6 mb-6">
                <View 
                    className="bg-primary rounded-[32px] p-6 flex-row items-center justify-between overflow-hidden"
                    style={{
                        elevation: 12,
                        shadowColor: '#b30069',
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.3,
                        shadowRadius: 15
                    }}
                >
                    <View className="z-10">
                        <Text className="text-white/80 font-body-bold text-xs uppercase tracking-widest mb-1">Total Net Balance</Text>
                        <Text className="text-white font-headline-bold text-3xl">₹{Math.abs(totalBalance).toFixed(2)}</Text>
                        <Text className="text-white/90 font-body-medium mt-1">
                            {totalBalance > 0 ? 'You are overall owed' : totalBalance < 0 ? 'Overall you owe' : 'You are all settled!'}
                        </Text>
                    </View>
                    <View className="bg-white/10 p-3 rounded-full z-10">
                        <Ionicons 
                            name={totalBalance >= 0 ? "arrow-up" : "arrow-down"} 
                            size={32} 
                            color="white" 
                        />
                    </View>
                    {/* Decorative element */}
                    <View className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full" />
                </View>
            </View>

            {/* Group List */}
            {loading && groupBalances.length === 0 ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#b30069" />
                </View>
            ) : (
                <FlatList
                    data={groupBalances}
                    renderItem={renderGroupItem}
                    keyExtractor={(item) => item.groupId}
                    contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
                    ListEmptyComponent={
                        <View className="flex-1 items-center justify-center py-20">
                            <View className="w-20 h-20 bg-surface-container rounded-full items-center justify-center mb-4">
                                <MaterialIcons name="receipt-long" size={40} color="#594048" />
                            </View>
                            <Text className="font-headline-bold text-lg text-on-surface">No group expenses yet</Text>
                            <Text className="font-body-regular text-on-surface-variant text-center px-10 mt-2">
                                When you add expenses in your groups, they will appear here.
                            </Text>
                        </View>
                    }
                    refreshControl={
                        <RefreshControl refreshing={loading} onRefresh={fetchGroupBalances} tintColor="#b30069" />
                    }
                />
            )}
        </SafeAreaView>
    );
};

export default HisaabHomeScreen;
