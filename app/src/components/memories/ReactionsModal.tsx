import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Modal,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import { fetchMemoryReactions, getOptimizedImageUrl } from '../../lib/api';

interface ReactionsModalProps {
    memoryId: string | null;
    onClose: () => void;
}

const ReactionsModal: React.FC<ReactionsModalProps> = ({ memoryId, onClose }) => {
    const { data: activeReactionsData, isLoading: isActiveReactionsLoading } = useQuery({
        queryKey: ['memoryReactions', memoryId],
        queryFn: () => fetchMemoryReactions(memoryId!),
        enabled: !!memoryId
    });

    return (
        <Modal
            visible={!!memoryId}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-black/60 items-center justify-center px-6">
                <View className="w-full max-w-sm bg-white border border-stone-100 rounded-3xl p-5 shadow-2xl">
                    <View className="flex-row items-center justify-between border-b border-stone-100 pb-3 mb-3">
                        <Text className="text-stone-900 text-base font-headline-bold">Reactions</Text>
                        <TouchableOpacity
                            onPress={onClose}
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
    );
};

export default ReactionsModal;
