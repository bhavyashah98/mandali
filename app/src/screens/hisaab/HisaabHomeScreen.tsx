import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useHisaabHomeData } from '../../hooks/hisaab/useHisaabHomeData';
import { SearchBar } from '../../components/common/SearchBar';
import { MandaliCard } from '../../components/common/MandaliCard';
import { useIsTablet } from '../../hooks/useIsTablet';

// Components
import HisaabHeader from '../../components/hisaab/HisaabHeader';
import HisaabBalanceCard from '../../components/hisaab/HisaabBalanceCard';
import HisaabContextCards from '../../components/hisaab/HisaabContextCards';
import HisaabEmptyState from '../../components/hisaab/HisaabEmptyState';

const HisaabHomeScreen = () => {
    const navigation = useNavigation<any>();
    const isTablet = useIsTablet();
    const [searchQuery, setSearchQuery] = useState('');

    const {
        totalBalance,
        processedGroups,
        isLoading,
        isRefreshing,
        onRefresh
    } = useHisaabHomeData();

    const filteredGroups = useMemo(() => {
        if (!processedGroups) return [];
        if (!searchQuery.trim()) return processedGroups;
        return processedGroups.filter((group: any) =>
            group.name?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [processedGroups, searchQuery]);

    const handleGroupPress = (groupId: string, name: string) => {
        navigation.navigate('GroupHisaab', { groupId, groupName: name });
    };

    return (
        <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top']}>
            <HisaabHeader />
            <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search Mandalis..."
            />
            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator color="#b30069" size="large" />
                </View>
            ) : (
                <FlatList
                    data={filteredGroups}
                    renderItem={({ item }) => {
                        const isSettled = item.netBalance === 0;
                        const isOwed = item.netBalance > 0;

                        return (
                            <MandaliCard
                                item={item}
                                onPress={handleGroupPress}
                                customSubtitle={
                                    <View className="flex-row items-center">
                                        <View
                                            style={{ backgroundColor: isSettled ? 'rgba(168, 162, 158, 0.4)' : isOwed ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)' }}
                                            className={`rounded-full mr-3 ${isTablet ? 'w-2.5 h-2.5' : 'w-1.5 h-1.5'}`}
                                        />
                                        <Text className={`font-body-bold text-[#594048] opacity-60 ${isTablet ? 'text-2xl' : 'text-[13px]'}`}>
                                            {isSettled ? 'Settled Up' : isOwed ? `₹${item.netBalance.toLocaleString()} Owed` : `₹${Math.abs(item.netBalance).toLocaleString()} You Owe`}
                                        </Text>
                                    </View>
                                }
                            />
                        );
                    }}
                    keyExtractor={(item) => item.groupId}
                    ListHeaderComponent={<HisaabBalanceCard totalBalance={totalBalance} />}
                    ListEmptyComponent={<HisaabEmptyState />}
                    ListFooterComponent={<HisaabContextCards />}
                    contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40, gap: isTablet ? 16 : 12 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={onRefresh}
                            tintColor="#b30069"
                            colors={['#b30069']}
                        />
                    }
                />
            )}
        </SafeAreaView>
    );
};

export default HisaabHomeScreen;
