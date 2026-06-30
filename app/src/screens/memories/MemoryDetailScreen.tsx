import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

//component
import InstagramPostCard from '../../components/memories/InstagramPostCard';
import CommentsModal from '../../components/memories/CommentsModal';
import ReactionsModal from '../../components/memories/ReactionsModal';
import ReportModal from '../../components/memories/ReportModal';

import { useAuthStore } from '../../stores/authStore';
import { useIsTablet } from '../../hooks/useIsTablet';
import {
    fetchMemories,
    deleteMemory,
} from '../../lib/api';

const MemoryDetailScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const queryClient = useQueryClient();
    const insets = useSafeAreaInsets();
    const { width, height } = useWindowDimensions();
    const isTablet = useIsTablet();
    const { user } = useAuthStore();

    // Read navigation params
    const { groupId, planId, readOnly, initialMemoryId, initialPhotoUrl, groupName } = route.params as {
        groupId: string;
        planId?: string;
        readOnly?: boolean;
        initialMemoryId: string;
        initialPhotoUrl?: string;
        groupName: string;
    };

    // States for comment and reaction details modals
    const [activeCommentMemoryId, setActiveCommentMemoryId] = useState<string | null>(null);
    const [activeReactionsMemoryId, setActiveReactionsMemoryId] = useState<string | null>(null);
    const [reportModalVisible, setReportModalVisible] = useState(false);
    const [reportingTarget, setReportingTarget] = useState<{ 
        id: string; 
        groupId: string; 
        contentType?: string; 
        contentOwnerId?: string;
    } | null>(null);

    const scrollRef = useRef<FlashListRef<any>>(null);

    // Infinite Query synchronized with MemoriesScreen
    const {
        data: infiniteData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useInfiniteQuery({
        queryKey: ['memories', groupId, planId],
        queryFn: ({ pageParam = 0 }) => fetchMemories(groupId!, pageParam, 10, planId),
        getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
        enabled: !!groupId,
        initialPageParam: 0
    });

    const allMemories = useMemo(() => {
        const memories = infiniteData?.pages.flatMap((page) => page.memories) || [];
        const seen = new Set();
        return memories.filter((m) => {
            if (!m || !m.id) return false;
            if (seen.has(m.id)) return false;
            seen.add(m.id);
            return true;
        });
    }, [infiniteData]);

    const tappedIndex = allMemories.findIndex((m) => m.id === initialMemoryId);

    // Handle Delete Memory
    const handleDeleteMemory = useCallback(
        (memoryId: string) => {
            Alert.alert(
                'Delete Memory',
                'Are you sure you want to permanently remove this moment?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                await deleteMemory(memoryId);
                                queryClient.invalidateQueries({ queryKey: ['memories'] });
                            } catch {
                                Alert.alert('Error', 'Could not delete memory.');
                            }
                        }
                    }
                ]
            );
        },
        [queryClient]
    );

    // Submit report API call
    const handleReportMemory = useCallback((memoryId: string, gId: string, contentType: string, contentOwnerId: string) => {
        setReportingTarget({ id: memoryId, groupId: gId, contentType, contentOwnerId });
        setReportModalVisible(true);
    }, []);

    const renderCard = useCallback(({ item }: { item: any }) => {
        return (
            <InstagramPostCard
                id={item.id}
                memory={item}
                scrollRef={scrollRef}
                currentUser={user}
                isTablet={isTablet}
                initialPhotoUrl={item.id === initialMemoryId ? initialPhotoUrl : undefined}
                onOpenComments={(id) => setActiveCommentMemoryId(id)}
                onOpenReactions={(id) => setActiveReactionsMemoryId(id)}
                onDelete={handleDeleteMemory}
                onReport={handleReportMemory}
                readOnly={readOnly}
            />
        );
    }, [handleDeleteMemory, handleReportMemory, user, isTablet, initialMemoryId, initialPhotoUrl, readOnly]);

    const keyExtractor = useCallback((item: any) => item.id.toString(), []);

    return (
        <View className="flex-1 bg-white">
            {/* Header */}
            <SafeAreaView edges={['top']} className="bg-white border-b border-stone-100 z-10">
                <View className={`flex-row items-center px-4 ${isTablet ? 'py-5' : 'py-3'}`}>
                    <TouchableOpacity onPress={() => navigation.goBack()} className="p-1">
                        <Ionicons name="chevron-back" size={24} color="#b30069" />
                    </TouchableOpacity>
                    <View className="flex-1 items-center mr-6">
                        <Text className="font-headline-bold text-stone-900 text-base">Memories</Text>
                        <Text className="font-body-medium text-stone-400 text-xs mt-0.5">{groupName}</Text>
                    </View>
                </View>
            </SafeAreaView>

            {/* Posts Feed */}
            <View className="flex-1">
                <FlashList
                    ref={scrollRef}
                    data={allMemories}
                    renderItem={renderCard}
                    keyExtractor={keyExtractor}
                    initialScrollIndex={tappedIndex >= 0 ? tappedIndex : undefined}
                    estimatedItemSize={width + 180}
                    scrollEventThrottle={16}
                    showsVerticalScrollIndicator={false}
                    ListFooterComponent={
                        isFetchingNextPage ? (
                            <View className="py-8 justify-center items-center">
                                <ActivityIndicator size="small" color="#b30069" />
                            </View>
                        ) : (
                            <View className="h-20" />
                        )
                    }
                    overrideItemLayout={
                        (layout, item, index) => {
                            layout.size = width + 180;
                        }
                    }
                />
            </View>

            {/* Comments Modal */}
            <CommentsModal
                memoryId={activeCommentMemoryId}
                groupId={groupId!}
                onClose={() => setActiveCommentMemoryId(null)}
            />

            {/* Reactions List Modal */}
            <ReactionsModal
                memoryId={activeReactionsMemoryId}
                onClose={() => setActiveReactionsMemoryId(null)}
            />

            {/* Premium Report Reason Modal */}
            <ReportModal
                visible={reportModalVisible}
                reportingTarget={reportingTarget}
                onClose={() => setReportModalVisible(false)}
                onSuccess={() => {
                    if (reportingTarget && (!reportingTarget.contentType || reportingTarget.contentType === 'memory')) {
                        const reportedId = reportingTarget.id;
                        // Optimistically remove the reported memory from the query cache
                        queryClient.setQueriesData({ queryKey: ['memories'] }, (oldData: any) => {
                            if (!oldData) return oldData;
                            return {
                                ...oldData,
                                pages: oldData.pages.map((page: any) => ({
                                    ...page,
                                    memories: page.memories.filter((m: any) => m.id !== reportedId)
                                }))
                            };
                        });
                    }
                }}
            />
        </View>
    );
};

export default MemoryDetailScreen;
