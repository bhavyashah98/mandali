import React, { useEffect, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useHisaabStore } from '../../stores/hisaabStore';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useQuery } from '@tanstack/react-query';
import { fetchGroups } from '../../lib/api';

const HisaabHomeScreen = () => {
    const navigation = useNavigation<StackNavigationProp<any>>();
    const { groupBalances, loading: balancesLoading, fetchGroupBalances } = useHisaabStore();

    // 1. Fetch all groups user belongs to
    const { data: groups, isLoading: groupsLoading, refetch: refetchGroups } = useQuery({
        queryKey: ['groups'],
        queryFn: fetchGroups
    });

    useEffect(() => {
        fetchGroupBalances();
    }, []);

    const onRefresh = async () => {
        await Promise.all([fetchGroupBalances(), refetchGroups()]);
    };

    // 2. Merge groups with balances
    const displayData = useMemo(() => {
        if (!groups) return [];
        return groups.map((group: any) => {
            const balanceEntry = groupBalances.find(b => b.groupId === group.id);
            return {
                id: group.id,
                name: group.name,
                coverPhotoUrl: group.cover_photo_url,
                netBalance: balanceEntry?.netBalance || 0,
                lastActivity: balanceEntry?.lastActivity
            };
        });
    }, [groups, groupBalances]);

    const renderGroupItem = ({ item }: { item: any }) => {
        const isOwed = item.netBalance > 0;
        const isBorrowing = item.netBalance < 0;
        const isSettled = item.netBalance === 0;

        return (
            <TouchableOpacity 
                onPress={() => navigation.navigate('GroupHisaab', { groupId: item.id, groupName: item.name })}
                className="bg-white rounded-[32px] p-4 mb-4 flex-row items-center border border-stone-100 shadow-sm"
            >
                <View className="w-16 h-16 rounded-2xl overflow-hidden bg-stone-50 mr-4 border border-stone-100">
                    {item.coverPhotoUrl ? (
                        <Image source={{ uri: item.coverPhotoUrl }} className="w-full h-full" resizeMode="cover" />
                    ) : (
                        <View className="w-full h-full items-center justify-center bg-primary/5">
                            <Text className="font-headline-bold text-primary opacity-30 text-2xl">
                                {item.name.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                    )}
                </View>
                
                <View className="flex-1">
                    <Text className="font-headline-bold text-on-surface text-lg" numberOfLines={1}>{item.name}</Text>
                    <Text className="font-body-medium text-stone-400 text-xs mt-1">
                        {item.lastActivity ? `Last entry: ${new Date(item.lastActivity).toLocaleDateString()}` : 'No recent activity'}
                    </Text>
                </View>

                <View className="items-end mr-2">
                    <Text className={`font-headline-bold text-lg ${isOwed ? 'text-success' : isBorrowing ? 'text-error' : 'text-stone-300'}`}>
                        {isSettled ? '₹0' : `₹${Math.abs(item.netBalance).toLocaleString()}`}
                    </Text>
                    {!isSettled && (
                        <Text className={`font-body-bold text-[9px] uppercase tracking-widest ${isOwed ? 'text-success/60' : 'text-error/60'}`}>
                            {isOwed ? 'OWED' : 'YOU OWE'}
                        </Text>
                    )}
                </View>

                <MaterialIcons name="chevron-right" size={24} color="#b3006969" />
            </TouchableOpacity>
        );
    };

    const totalBalance = groupBalances.reduce((acc, curr) => acc + curr.netBalance, 0);
    const isLoading = groupsLoading || (balancesLoading && groupBalances.length === 0);

    return (
        <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top']}>
            {/* Header Area */}
            <View className="px-6 py-6 items-center">
                <Text className="font-headline-bold text-5xl text-on-surface text-center tracking-tight">Hisaab</Text>
                <View className="bg-[#b30069]/10 px-4 py-1 rounded-full mt-2">
                    <Text className="text-[#b30069] font-body-bold text-[10px] uppercase tracking-[3px]">Split & Settle</Text>
                </View>
            </View>

            {/* Global Summary Card - Only show if not loading and has data */}
            {!isLoading && displayData.length > 0 && (
                <View className="px-6 mb-8">
                    <View 
                        className="bg-primary rounded-[40px] p-8 flex-row items-center justify-between overflow-hidden"
                        style={{ elevation: 12, shadowColor: '#b30069', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20 }}
                    >
                        <View className="z-10">
                            <Text className="text-white/60 font-body-bold text-[10px] uppercase tracking-widest mb-2">Total Net Balance</Text>
                            <View className="flex-row items-baseline">
                                <Text className="text-white font-headline-bold text-4xl">₹{Math.abs(totalBalance).toLocaleString()}</Text>
                            </View>
                            <Text className="text-white/90 font-body-medium mt-2 text-sm italic">
                                {totalBalance > 0 ? 'You are owed overall' : totalBalance < 0 ? 'Overall you owe others' : 'All accounts settled!'}
                            </Text>
                        </View>
                        <View className="bg-white/20 p-4 rounded-full z-10">
                            <Ionicons 
                                name={totalBalance >= 0 ? "arrow-up" : "arrow-down"} 
                                size={36} 
                                color="white" 
                            />
                        </View>
                        {/* Decorative element */}
                        <View className="absolute -right-12 -bottom-12 w-48 h-48 bg-white/5 rounded-full" />
                    </View>
                </View>
            )}

            {isLoading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#b30069" />
                </View>
            ) : (
                <FlatList
                    data={displayData}
                    renderItem={renderGroupItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 60 }}
                    ListEmptyComponent={
                        <View className="flex-1 items-center justify-center py-20 px-10">
                            <View className="w-24 h-24 bg-stone-100 rounded-full items-center justify-center mb-6">
                                <MaterialIcons name="receipt-long" size={48} color="#b3006933" />
                            </View>
                            <Text className="font-headline-bold text-2xl text-on-surface text-center">No Mandali Found</Text>
                            <Text className="font-body-medium text-stone-400 text-center mt-3 leading-6">
                                You haven't joined any Mandali yet. Create one to start tracking common expenses!
                            </Text>
                        </View>
                    }
                    refreshControl={
                        <RefreshControl refreshing={balancesLoading} onRefresh={onRefresh} tintColor="#b30069" />
                    }
                />
            )}
        </SafeAreaView>
    );
};

export default HisaabHomeScreen;
