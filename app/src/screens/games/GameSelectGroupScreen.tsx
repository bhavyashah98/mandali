import React, { useCallback } from 'react';
import { View, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useSocket } from '../../hooks/useSocket';
import { useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { fetchGroups } from '../../lib/api';
import {
    Header,
    TotalGloryCard,
    EmptyState,
    GroupItem,
    ContextCardsContainer
} from '../../components/games/select-group';

const GameSelectGroupScreen = () => {
    const socket = useSocket();
    const queryClient = useQueryClient();
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

    return (
        <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top']}>
            <Header />

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator color="#b30069" size="large" />
                </View>
            ) : (
                <FlatList
                    data={groups ? [...groups].sort((a, b) => (b.totalWinnings || 0) - (a.totalWinnings || 0)) : []}
                    renderItem={({ item }) => <GroupItem item={item} />}
                    keyExtractor={(item) => item.id}
                    ListHeaderComponent={() => (
                        <TotalGloryCard 
                            totalGlory={totalGlory} 
                            hasGroups={!!(groups && groups.length > 0)} 
                        />
                    )}
                    ListEmptyComponent={EmptyState}
                    ListFooterComponent={ContextCardsContainer}
                    contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
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

