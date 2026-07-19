import React from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useGroupTimeline } from '../../hooks/useGroupTimeline';
import { TimelineItemCard } from '../../components/timeline/TimelineItemCard';
import { TimelineHeader } from '../../components/timeline/TimelineHeader';
import { TimelineEmptyState } from '../../components/timeline/TimelineEmptyState';

const GroupTimelineScreen = () => {
    const navigation = useNavigation<any>();
    const {
        items,
        isLoading,
        isRefetching,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
        refetch,
        onShareMilestone,
        groupName,
        isTablet,
    } = useGroupTimeline();

    return (
        <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top']}>
            <View className={`flex-row items-center px-6 ${isTablet ? 'py-8' : 'py-4'}`}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className={`items-center justify-center bg-white shadow-sm border border-stone-100 rounded-full ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}
                >
                    <MaterialIcons name="arrow-back" size={isTablet ? 32 : 24} color="#594048" />
                </TouchableOpacity>
                <View className="ml-4 flex-1">
                    <Text className={`font-body-bold text-[#b30069] uppercase tracking-widest ${isTablet ? 'text-lg' : 'text-[10px]'}`}>
                        Group Timeline
                    </Text>
                    <Text className={`font-headline-bold text-[#1c1c18] ${isTablet ? 'text-4xl' : 'text-xl'}`} numberOfLines={1}>
                        {groupName || 'Mandali'}
                    </Text>
                </View>
            </View>

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#b30069" />
                </View>
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}
                    refreshControl={
                        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#b30069" colors={['#b30069']} />
                    }
                    ListHeaderComponent={<TimelineHeader isTablet={isTablet} />}
                    renderItem={({ item }) => (
                        <TimelineItemCard item={item} isTablet={isTablet} onShareMilestone={onShareMilestone} />
                    )}
                    onEndReached={() => {
                        if (hasNextPage && !isFetchingNextPage) fetchNextPage();
                    }}
                    onEndReachedThreshold={0.45}
                    ListFooterComponent={
                        isFetchingNextPage ? (
                            <ActivityIndicator color="#b30069" style={{ marginVertical: 24 }} />
                        ) : null
                    }
                    ListEmptyComponent={<TimelineEmptyState isTablet={isTablet} />}
                />
            )}
        </SafeAreaView>
    );
};

export default GroupTimelineScreen;
