import React from 'react';
import { View, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useHisaabHomeData } from '../../hooks/hisaab/useHisaabHomeData';

// Components
import HisaabHeader from '../../components/hisaab/HisaabHeader';
import HisaabBalanceCard from '../../components/hisaab/HisaabBalanceCard';
import HisaabGroupItem from '../../components/hisaab/HisaabGroupItem';
import HisaabContextCards from '../../components/hisaab/HisaabContextCards';
import HisaabEmptyState from '../../components/hisaab/HisaabEmptyState';

const HisaabHomeScreen = () => {
    const navigation = useNavigation<any>();

    const {
        totalBalance,
        processedGroups,
        isLoading,
        isRefreshing,
        onRefresh
    } = useHisaabHomeData();

    const handleGroupPress = (groupId: string, name: string) => {
        navigation.navigate('GroupHisaab', { groupId, groupName: name });
    };

    return (
        <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top']}>
            <HisaabHeader />
            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator color="#b30069" size="large" />
                </View>
            ) : (
                <FlatList
                    data={processedGroups}
                    renderItem={({ item }) => (
                        <HisaabGroupItem item={item} onPress={handleGroupPress} />
                    )}
                    keyExtractor={(item) => item.groupId}
                    ListHeaderComponent={<HisaabBalanceCard totalBalance={totalBalance} />}
                    ListEmptyComponent={<HisaabEmptyState />}
                    ListFooterComponent={<HisaabContextCards />}
                    contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
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
