import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Pressable,
    FlatList,
    useWindowDimensions,
    ActivityIndicator,
    Alert,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import { useAuthStore } from '../../stores/authStore';
import {
    fetchMemoryComments,
    createMemoryComment,
    deleteMemoryComment,
    getOptimizedImageUrl
} from '../../lib/api';
import { formatCommentTime } from '../../utils/formatCommentTime';
import ReportModal from './ReportModal';

interface CommentsModalProps {
    memoryId: string | null;
    groupId: string;
    onClose: () => void;
}

const CommentsModal: React.FC<CommentsModalProps> = ({ memoryId, groupId, onClose }) => {
    const insets = useSafeAreaInsets();
    const { height } = useWindowDimensions();
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const [newCommentText, setNewCommentText] = useState('');
    const [reportModalVisible, setReportModalVisible] = useState(false);
    const [reportingTarget, setReportingTarget] = useState<{ id: string; groupId: string; contentType: string; contentOwnerId: string } | null>(null);

    const handleReportComment = useCallback((commentId: string, commentOwnerId: string) => {
        setReportingTarget({ id: commentId, groupId, contentType: 'comment', contentOwnerId: commentOwnerId });
        setReportModalVisible(true);
    }, [groupId]);

    const { data: activeComments = [], isLoading: isActiveCommentsLoading } = useQuery({
        queryKey: ['memoryComments', memoryId],
        queryFn: () => fetchMemoryComments(memoryId!),
        enabled: !!memoryId
    });

    const addCommentMutation = useMutation({
        mutationFn: (text: string) => createMemoryComment(memoryId!, text),
        onSuccess: () => {
            setNewCommentText('');
            queryClient.invalidateQueries({ queryKey: ['memoryComments', memoryId] });
        },
        onError: () => {
            Alert.alert('Error', 'Failed to post comment.');
        }
    });

    const deleteCommentMutation = useMutation({
        mutationFn: (commentId: string) => deleteMemoryComment(commentId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['memoryComments', memoryId] });
        },
        onError: () => {
            Alert.alert('Error', 'Could not delete comment.');
        }
    });

    const handleSendComment = useCallback(() => {
        if (!newCommentText.trim()) return;

        const { containsObjectionableContent } = require('../../utils/moderationFilter');
        if (containsObjectionableContent(newCommentText)) {
            Alert.alert(
                'Community Guidelines',
                'Your content appears to violate our Community Guidelines. Please edit and try again.'
            );
            return;
        }

        addCommentMutation.mutate(newCommentText);
    }, [addCommentMutation, newCommentText]);

    const handleDeleteComment = useCallback((commentId: string) => {
        Alert.alert('Delete Comment', 'Delete this comment permanently?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => deleteCommentMutation.mutate(commentId)
            }
        ]);
    }, [deleteCommentMutation]);

    return (
        <>
            <Modal
                visible={!!memoryId}
                animationType="slide"
                transparent
                onRequestClose={onClose}
            >
            <View className="flex-1 bg-black/5 justify-end">
                <Pressable
                    onPress={onClose}
                    className="absolute inset-0"
                />
                <KeyboardAvoidingView
                    behavior="padding"
                    className="w-full justify-end"
                >
                    <View
                        className="bg-white border-t border-stone-200 rounded-t-[30px] px-5 pt-4"
                        style={{
                            height: height * 0.5,
                            paddingBottom: Math.max(insets?.bottom || 0, 16)
                        }}
                    >
                        <View className="w-12 h-1 bg-stone-200 rounded-full self-center mb-4" />
                        <View className="flex-row items-center justify-between pb-3.5 border-b border-stone-100">
                            <Text className="text-stone-900 font-headline-bold text-xl">Comments</Text>
                            <TouchableOpacity
                                onPress={onClose}
                                className="w-9 h-9 rounded-full bg-stone-100 items-center justify-center"
                            >
                                <Ionicons name="close" size={22} color="#b30069" />
                            </TouchableOpacity>
                        </View>

                        {isActiveCommentsLoading ? (
                            <View className="flex-1 justify-center items-center">
                                <ActivityIndicator size="large" color="#b30069" />
                            </View>
                        ) : (
                            <FlatList
                                data={activeComments}
                                keyExtractor={(item, index) => item.id || index.toString()}
                                style={{ flex: 1 }}
                                contentContainerStyle={{ paddingVertical: 12 }}
                                keyboardShouldPersistTaps="handled"
                                nestedScrollEnabled
                                showsVerticalScrollIndicator
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
                                                    {isCommentOwner ? (
                                                        <TouchableOpacity
                                                            onPress={() => handleDeleteComment(item.id)}
                                                            className="p-1"
                                                        >
                                                            <Ionicons name="trash-outline" size={14} color="#ef4444" />
                                                        </TouchableOpacity>
                                                    ) : (
                                                        <TouchableOpacity
                                                            onPress={() => handleReportComment(item.id, item.user_id)}
                                                            className="p-1"
                                                        >
                                                            <Ionicons name="flag-outline" size={14} color="#b30069" opacity={0.6} />
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
                                className={`w-9 h-9 rounded-full items-center justify-center ${newCommentText.trim() && !addCommentMutation.isPending ? 'bg-[#b30069]' : 'bg-stone-100'
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
            </View>
            </Modal>

            {/* Report Comment Modal — must be outside parent Modal to render correctly on iOS */}
            <ReportModal
                visible={reportModalVisible}
                reportingTarget={reportingTarget}
                onClose={() => setReportModalVisible(false)}
                onSuccess={() => {
                    if (reportingTarget && reportingTarget.contentType === 'comment') {
                        const reportedCommentId = reportingTarget.id;
                        // Optimistically remove the reported comment from the query cache
                        queryClient.setQueryData(['memoryComments', memoryId], (oldData: any) => {
                            if (!oldData) return oldData;
                            return oldData.filter((c: any) => c.id !== reportedCommentId);
                        });
                    }
                }}
            />
        </>
    );
};

export default CommentsModal;
