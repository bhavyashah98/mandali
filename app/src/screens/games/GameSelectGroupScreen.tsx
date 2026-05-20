import React, { useCallback, useState, useMemo } from 'react';
import { View, FlatList, ActivityIndicator, RefreshControl, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useSocket } from '../../hooks/useSocket';
import { useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { fetchGroups } from '../../lib/api';
import { SearchBar } from '../../components/common/SearchBar';
import { MandaliCard } from '../../components/common/MandaliCard';
import MandaliCoin from '../../components/MandaliCoin';
import { useIsTablet } from '../../hooks/useIsTablet';
import { useNavigation } from '@react-navigation/native';
import {
    Header,
    TotalGloryCard,
    EmptyState,
    ContextCardsContainer
} from '../../components/games/select-group';

const GameSelectGroupScreen = () => {
    const socket = useSocket();
    const queryClient = useQueryClient();
    const navigation = useNavigation<any>();
    const isTablet = useIsTablet();
    const [searchQuery, setSearchQuery] = useState('');

    const { data: groups, isLoading, isRefetching, refetch } = useQuery({
        queryKey: ['groups'],
        queryFn: fetchGroups
    });

    useFocusEffect(
        useCallback(() => {
            refetch();

            if (!socket) {
                return;
            }

            const handleGroupUpdate = (event: any) => {
                queryClient.invalidateQueries({ queryKey: ['groups'] });
            };

            socket.on('group_event', handleGroupUpdate);

            return () => {
                socket.off('group_event', handleGroupUpdate);
            };
        }, [socket, queryClient, refetch])
    );

    const totalGlory = groups?.reduce((acc: number, g: any) => acc + (g.totalWinnings || 0), 0) || 0;

    const filteredGroups = useMemo(() => {
        if (!groups) return [];
        const sorted = [...groups].sort((a, b) => (b.totalWinnings || 0) - (a.totalWinnings || 0));
        if (!searchQuery.trim()) return sorted;
        return sorted.filter((g: any) =>
            g.name?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [groups, searchQuery]);

    return (
        <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top']}>
            <Header />

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
                    renderItem={({ item }) => (
                        <MandaliCard
                            item={item}
                            onPress={(id) => navigation.navigate('GameSelection', { groupId: id })}
                            customSubtitle={null}
                            customBottomNode={
                                item.totalWinnings !== undefined && item.totalWinnings > 0 ? (
                                    <View className="flex-row items-center mt-1">
                                        <Text className={`font-headline-bold text-[#d97706] ${isTablet ? 'text-2xl' : 'text-[14px]'}`}>
                                            {item.totalWinnings.toLocaleString()}
                                        </Text>
                                        <MandaliCoin size={isTablet ? 24 : 14} style={{ marginLeft: 4 }} />
                                        <Text className={`font-body-bold text-[#d97706] ${isTablet ? 'text-2xl' : 'text-[14px]'}`} style={{ marginLeft: 4 }}>Won</Text>
                                    </View>
                                ) : null
                            }
                        />
                    )}
                    keyExtractor={(item) => item.id}
                    ListHeaderComponent={() => (
                        <TotalGloryCard
                            totalGlory={totalGlory}
                            hasGroups={!!(groups && groups.length > 0)}
                        />
                    )}
                    ListEmptyComponent={EmptyState}
                    ListFooterComponent={ContextCardsContainer}
                    contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40, gap: isTablet ? 16 : 12 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefetching}
                            onRefresh={refetch}
                            tintColor="#b30069"
                            colors={['#b30069']}
                        />
                    }
                />
            )}
        </SafeAreaView>
    );
};

export default GameSelectGroupScreen;

