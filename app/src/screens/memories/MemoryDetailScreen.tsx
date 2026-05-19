import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    useWindowDimensions,
    ActivityIndicator,
    Alert,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    StyleSheet
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import { useAuthStore } from '../../stores/authStore';
import { useIsTablet } from '../../hooks/useIsTablet';
import {
    fetchMemories,
    deleteMemory,
    reportContent,
    fetchMemoryComments,
    createMemoryComment,
    deleteMemoryComment,
    fetchMemoryReactions,
    getOptimizedImageUrl
} from '../../lib/api';
import { InstagramPostCard } from '../../components/memories/InstagramPostCard';

const formatCommentTime = (dateStr: string) => {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffSecs < 60) return 'now';
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays < 7) return `${diffDays}d`;
        
        return date.toLocaleDateString([], {
            day: 'numeric',
            month: 'short'
        });
    } catch {
        return '';
    }
};

const MemoryDetailScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const queryClient = useQueryClient();
    const insets = useSafeAreaInsets();
    const { width, height } = useWindowDimensions();
    const isTablet = useIsTablet();
    const { user } = useAuthStore();

    // Read navigation params
    const { groupId, initialMemoryId, initialPhotoUrl, groupName } = route.params as {
        groupId: string;
        initialMemoryId: string;
        initialPhotoUrl?: string;
        groupName: string;
    };

    // States for comment and reaction details modals
    const [activeCommentMemoryId, setActiveCommentMemoryId] = useState<string | null>(null);
    const [activeReactionsMemoryId, setActiveReactionsMemoryId] = useState<string | null>(null);
    const [reportModalVisible, setReportModalVisible] = useState(false);
    const [reportingTarget, setReportingTarget] = useState<{ id: string; groupId: string } | null>(null);
    const [newCommentText, setNewCommentText] = useState('');

    const scrollRef = useRef<FlatList>(null);
    const hasScrolledRef = useRef(false);

    // Infinite Query synchronized with MemoriesScreen
    const {
        data: infiniteData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useInfiniteQuery({
        queryKey: ['memories', groupId],
        queryFn: ({ pageParam = 0 }) => fetchMemories(groupId!, pageParam, 10),
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

    // Virtualized / sliding window range to only render the clicked item + 10 items before and 10 items after
    const tappedIndex = useMemo(() => {
        return allMemories.findIndex((m) => m.id === initialMemoryId);
    }, [allMemories, initialMemoryId]);

    const [windowIndices, setWindowIndices] = useState<{ start: number; end: number } | null>(null);

    // Initialize the window range once when allMemories is loaded and tappedIndex is found
    useEffect(() => {
        if (allMemories.length > 0 && tappedIndex >= 0 && !windowIndices) {
            const start = Math.max(0, tappedIndex - 10);
            const end = Math.min(allMemories.length, tappedIndex + 11);
            setWindowIndices({ start, end });
        }
    }, [allMemories, tappedIndex, windowIndices]);

    // Compute the currently visible sub-array of memories
    const visibleMemories = useMemo(() => {
        if (!windowIndices) return [];
        return allMemories.slice(windowIndices.start, windowIndices.end);
    }, [allMemories, windowIndices]);

    // Calculate the scroll index relative to the sliced list
    const relativeInitialIndex = useMemo(() => {
        if (!windowIndices || tappedIndex < 0) return 0;
        return tappedIndex - windowIndices.start;
    }, [windowIndices, tappedIndex]);

    // Scroll to the clicked memory when the list loaded
    useEffect(() => {
        if (visibleMemories.length > 0 && !hasScrolledRef.current && relativeInitialIndex >= 0) {
            hasScrolledRef.current = true;
            setTimeout(() => {
                scrollRef.current?.scrollToIndex({ index: relativeInitialIndex, animated: false });
            }, 100);
        }
    }, [visibleMemories, relativeInitialIndex]);

    // Handle scroll down: extend window or load next page
    const handleEndReached = () => {
        if (!windowIndices) return;
        if (windowIndices.end < allMemories.length) {
            setWindowIndices((prev) => {
                if (!prev) return null;
                return {
                    start: prev.start,
                    end: Math.min(allMemories.length, prev.end + 10)
                };
            });
        } else if (hasNextPage) {
            fetchNextPage();
        }
    };

    // Handle scroll up: extend window backwards
    const handleScroll = (event: any) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        if (offsetY < 200 && windowIndices && windowIndices.start > 0) {
            setWindowIndices((prev) => {
                if (!prev) return null;
                const extension = Math.min(prev.start, 10);
                return {
                    start: prev.start - extension,
                    end: prev.end
                };
            });
        }
    };

    // Query for Comments Modal
    const { data: activeComments = [], isLoading: isActiveCommentsLoading } = useQuery({
        queryKey: ['memoryComments', activeCommentMemoryId],
        queryFn: () => fetchMemoryComments(activeCommentMemoryId!),
        enabled: !!activeCommentMemoryId
    });

    // Query for Reactions Modal
    const { data: activeReactionsData, isLoading: isActiveReactionsLoading } = useQuery({
        queryKey: ['memoryReactions', activeReactionsMemoryId],
        queryFn: () => fetchMemoryReactions(activeReactionsMemoryId!),
        enabled: !!activeReactionsMemoryId
    });

    // Add Comment Mutation
    const addCommentMutation = useMutation({
        mutationFn: (text: string) => createMemoryComment(activeCommentMemoryId!, text),
        onSuccess: () => {
            setNewCommentText('');
            queryClient.invalidateQueries({ queryKey: ['memoryComments', activeCommentMemoryId] });
        },
        onError: () => {
            Alert.alert('Error', 'Failed to post comment.');
        }
    });

    // Delete Comment Mutation
    const deleteCommentMutation = useMutation({
        mutationFn: (commentId: string) => deleteMemoryComment(commentId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['memoryComments', activeCommentMemoryId] });
        },
        onError: () => {
            Alert.alert('Error', 'Could not delete comment.');
        }
    });

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
    const handleReportMemory = useCallback((memoryId: string, gId: string) => {
        setReportingTarget({ id: memoryId, groupId: gId });
        setReportModalVisible(true);
    }, []);

    const submitReport = async (reason: string) => {
        if (!reportingTarget) return;
        try {
            await reportContent({
                contentId: reportingTarget.id,
                groupId: reportingTarget.groupId,
                reason
            });
            setReportModalVisible(false);
            Alert.alert('Report Submitted', "We'll review this content and take appropriate actions.");
        } catch {
            Alert.alert('Error', 'Could not submit report.');
        }
    };

    const handleSendComment = () => {
        if (!newCommentText.trim()) return;
        addCommentMutation.mutate(newCommentText);
    };

    const handleDeleteComment = (commentId: string) => {
        Alert.alert('Delete Comment', 'Delete this comment permanently?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => deleteCommentMutation.mutate(commentId)
            }
        ]);
    };

    const reportReasons = [
        { label: 'Spam', icon: 'mail-outline' },
        { label: 'Harassment', icon: 'hand-left-outline' },
        { label: 'Inappropriate Photo', icon: 'image-outline' },
        { label: 'Others', icon: 'ellipsis-horizontal-outline' }
    ];

    const renderCard = ({ item }: { item: any }) => {
        return (
            <InstagramPostCard
                memory={item}
                scrollRef={scrollRef}
                currentUser={user}
                isTablet={isTablet}
                initialPhotoUrl={item.id === initialMemoryId ? initialPhotoUrl : undefined}
                onOpenComments={(id) => setActiveCommentMemoryId(id)}
                onOpenReactions={(id) => setActiveReactionsMemoryId(id)}
                onDelete={handleDeleteMemory}
                onReport={handleReportMemory}
            />
        );
    };

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
            <FlatList
                ref={scrollRef}
                data={visibleMemories}
                renderItem={renderCard}
                keyExtractor={(item) => item.id}
                onEndReached={handleEndReached}
                onEndReachedThreshold={0.5}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                maintainVisibleContentPosition={{
                    minIndexForVisible: 0,
                    autoscrollToTopThreshold: 0
                }}
                getItemLayout={(data, index) => ({
                    length: width + 230,
                    offset: (width + 230) * index,
                    index
                })}
                onScrollToIndexFailed={(info) => {
                    setTimeout(() => {
                        scrollRef.current?.scrollToIndex({ index: info.index, animated: false });
                    }, 50);
                }}
                ListFooterComponent={
                    isFetchingNextPage ? (
                        <View className="py-8 justify-center items-center">
                            <ActivityIndicator size="small" color="#b30069" />
                        </View>
                    ) : (
                        <View className="h-20" />
                    )
                }
            />

            {/* Comments Modal BottomSheet */}
            <Modal
                visible={!!activeCommentMemoryId}
                animationType="slide"
                transparent
                onRequestClose={() => setActiveCommentMemoryId(null)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    className="flex-1 bg-black/5 justify-end"
                >
                    <TouchableOpacity
                        style={StyleSheet.absoluteFillObject}
                        activeOpacity={1}
                        onPress={() => setActiveCommentMemoryId(null)}
                    />
                    <View
                        className="bg-white border-t border-stone-200 rounded-t-[30px] px-5 pt-4"
                        style={{
                            height: height * 0.5,
                            paddingBottom: Math.max(insets.bottom, 16)
                        }}
                    >
                        <View className="w-12 h-1 bg-stone-200 rounded-full self-center mb-4" />
                        <View className="flex-row items-center justify-between pb-3.5 border-b border-stone-100">
                            <Text className="text-stone-900 font-headline-bold text-xl">Comments</Text>
                            <TouchableOpacity
                                onPress={() => setActiveCommentMemoryId(null)}
                                className="w-9 h-9 rounded-full bg-stone-100 items-center justify-center"
                            >
                                <Ionicons name="close" size={22} color="#b30069" />
                            </TouchableOpacity>
                        </View>

                        {isActiveCommentsLoading ? (
                            <View className="py-20 justify-center items-center">
                                <ActivityIndicator size="medium" color="#b30069" />
                            </View>
                        ) : (
                            <FlatList
                                data={activeComments}
                                keyExtractor={(item, index) => item.id || index.toString()}
                                style={{ flex: 1 }}
                                contentContainerStyle={{ paddingVertical: 12 }}
                                renderItem={({ item }) => {
                                    const isCommentOwner = user?.id === item.user_id;
                                    return (
                                        <View className="flex-row items-start py-2.5">
                                            <View className="w-9 h-9 rounded-full border border-stone-200 overflow-hidden mt-1">
                                                {item.user?.avatar_url ? (
                                                    <Image
                                                        source={{ uri: getOptimizedImageUrl(item.user.avatar_url, 'w_80,h_80,c_fill,q_auto') }}
                                                        style={{ width: '100%', height: '100%' }}
                                                    />
                                                ) : (
                                                    <View className="w-full h-full bg-stone-50 items-center justify-center">
                                                        <Ionicons name="person" size={14} color="#b30069" />
                                                    </View>
                                                )}
                                            </View>
                                            <View className="flex-1 bg-stone-50 rounded-[20px] px-4 py-3 ml-3 border border-stone-100">
                                                <View className="flex-row items-center justify-between">
                                                    <View className="flex-row items-center flex-1">
                                                        <Text className="text-stone-900 font-headline-bold text-sm">{item.user?.name || 'User'}</Text>
                                                        {item.created_at && (
                                                            <Text className="text-stone-400 font-body-medium text-[11px] ml-2">
                                                                • {formatCommentTime(item.created_at)}
                                                            </Text>
                                                        )}
                                                    </View>
                                                    {isCommentOwner && (
                                                        <TouchableOpacity
                                                            onPress={() => handleDeleteComment(item.id)}
                                                            className="p-1"
                                                        >
                                                            <Ionicons name="trash-outline" size={14} color="#ef4444" />
                                                        </TouchableOpacity>
                                                    )}
                                                </View>
                                                <Text className="text-stone-700 font-body-medium text-sm mt-0.5 leading-normal">{item.comment}</Text>
                                            </View>
                                        </View>
                                    );
                                }}
                                ListEmptyComponent={
                                    <View className="py-16 items-center justify-center">
                                        <Ionicons name="chatbubbles-outline" size={44} color="#e8c4d8" />
                                        <Text className="text-stone-400 font-headline-bold text-sm mt-3">No comments yet</Text>
                                    </View>
                                }
                            />
                        )}

                        {/* Input bar */}
                        <View className="flex-row items-center border-t border-stone-100 pt-2.5 bg-white">
                            <View className="flex-1 bg-stone-50 border border-stone-200 rounded-[20px] px-4 py-1 mr-2.5 flex-row items-center">
                                <TextInput
                                    placeholder="Add a comment..."
                                    placeholderTextColor="#a09d96"
                                    value={newCommentText}
                                    onChangeText={setNewCommentText}
                                    className="flex-1 text-stone-900 font-body-medium text-[14px] py-1 max-h-[80px]"
                                    maxLength={500}
                                    selectionColor="#b30069"
                                    multiline
                                />
                            </View>
                            <TouchableOpacity
                                onPress={handleSendComment}
                                disabled={!newCommentText.trim() || addCommentMutation.isPending}
                                className={`w-9 h-9 rounded-full items-center justify-center ${
                                    newCommentText.trim() && !addCommentMutation.isPending ? 'bg-[#b30069]' : 'bg-stone-100'
                                }`}
                            >
                                {addCommentMutation.isPending ? (
                                    <ActivityIndicator size="small" color={newCommentText.trim() ? "white" : "#a09d96"} />
                                ) : (
                                    <Ionicons
                                        name="arrow-up"
                                        size={18}
                                        color={newCommentText.trim() && !addCommentMutation.isPending ? 'white' : '#a09d96'}
                                    />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Reactions List Modal */}
            <Modal
                visible={!!activeReactionsMemoryId}
                transparent
                animationType="fade"
                onRequestClose={() => setActiveReactionsMemoryId(null)}
            >
                <View className="flex-1 bg-black/60 items-center justify-center px-6">
                    <View className="w-full max-w-sm bg-white border border-stone-100 rounded-3xl p-5 shadow-2xl">
                        <View className="flex-row items-center justify-between border-b border-stone-100 pb-3 mb-3">
                            <Text className="text-stone-900 text-base font-headline-bold">Reactions</Text>
                            <TouchableOpacity
                                onPress={() => setActiveReactionsMemoryId(null)}
                                className="w-8 h-8 rounded-full bg-stone-100 items-center justify-center"
                            >
                                <Ionicons name="close" size={18} color="#594048" />
                            </TouchableOpacity>
                        </View>

                        {isActiveReactionsLoading ? (
                            <View className="py-8 justify-center items-center">
                                <ActivityIndicator size="small" color="#b30069" />
                            </View>
                        ) : (
                            <FlatList
                                data={activeReactionsData?.reactions || []}
                                keyExtractor={(item, index) => item.id || index.toString()}
                                style={{ maxHeight: 250 }}
                                renderItem={({ item }) => (
                                    <View className="flex-row items-center justify-between py-3 border-b border-stone-50">
                                        <View className="flex-row items-center">
                                            <View className="w-8 h-8 rounded-full border border-stone-200 overflow-hidden mr-3">
                                                {item.user?.avatar_url ? (
                                                    <Image
                                                        source={{ uri: getOptimizedImageUrl(item.user.avatar_url, 'w_80,h_80,c_fill,q_auto') }}
                                                        style={{ width: '100%', height: '100%' }}
                                                    />
                                                ) : (
                                                    <View className="w-full h-full bg-stone-50 items-center justify-center">
                                                        <Ionicons name="person" size={12} color="#b30069" />
                                                    </View>
                                                )}
                                            </View>
                                            <Text className="text-stone-900 font-body-bold text-sm">{item.user?.name || 'User'}</Text>
                                        </View>
                                        <Text style={{ fontSize: 16 }}>{item.reaction}</Text>
                                    </View>
                                )}
                                ListEmptyComponent={
                                    <Text className="text-stone-400 text-center py-6">No reactions yet</Text>
                                }
                            />
                        )}
                    </View>
                </View>
            </Modal>

            {/* Premium Report Reason Modal */}
            <Modal
                visible={reportModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setReportModalVisible(false)}
            >
                <View className="flex-1 justify-end bg-black/60">
                    <TouchableOpacity
                        style={{ flex: 1 }}
                        activeOpacity={1}
                        onPress={() => setReportModalVisible(false)}
                    />
                    <View className="bg-white border-t border-stone-200 rounded-t-[30px] px-8 pt-8 pb-12">
                        <View className="w-12 h-1 bg-stone-200 rounded-full self-center mb-8" />

                        <View className="mb-8">
                            <Text className="text-stone-900 text-xl font-headline-bold mb-2">Report Content</Text>
                            <Text className="text-stone-500 font-body-medium text-xs leading-normal">
                                Why are you reporting this photo? We'll review it within 24 hours.
                            </Text>
                        </View>

                        <View className="gap-3">
                            {reportReasons.map((reason) => (
                                <TouchableOpacity
                                    key={reason.label}
                                    onPress={() => submitReport(reason.label)}
                                    className="flex-row items-center bg-stone-50 border border-stone-200 p-4 rounded-2xl active:bg-stone-100"
                                >
                                    <View className="w-10 h-10 rounded-full bg-[#b30069]/10 items-center justify-center mr-4">
                                        <Ionicons name={reason.icon as any} size={20} color="#b30069" />
                                    </View>
                                    <Text className="text-stone-800 text-sm font-body-bold">{reason.label}</Text>
                                    <View className="flex-1" />
                                    <Ionicons name="chevron-forward" size={16} color="#594048" opacity={0.3} />
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity
                            onPress={() => setReportModalVisible(false)}
                            className="mt-8 p-2 items-center"
                        >
                            <Text className="text-stone-400 font-body-bold">Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default MemoryDetailScreen;
