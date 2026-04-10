import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { fetchGroups } from '../../lib/api';

const MemoriesSelectGroupScreen = () => {
    const navigation = useNavigation<any>();
    const { data: groups, isLoading, isRefetching, refetch } = useQuery({
        queryKey: ['groups'],
        queryFn: fetchGroups
    });

    const renderContextCards = () => (
        <View className="gap-3 mt-4 flex-1 w-full pb-8">
            <View className="h-[1px] bg-stone-200/80 w-full mb-4 mt-2" />
            <View className="bg-primary/5 rounded-[24px] p-5">
                <MaterialIcons name="photo-album" size={24} color="#b30069" className="mb-2" />
                <Text className="font-headline-bold text-[#1c1c18] text-[15px] mb-1">Shared Albums</Text>
                <Text className="font-body-medium text-stone-500 text-[13px] leading-5">
                    Drop photos directly into the stream and let everyone in your Mandali circle relive the moments together.
                </Text>
            </View>
            <View className="bg-primary/5 rounded-[24px] p-5">
                <MaterialIcons name="calendar-month" size={24} color="#b30069" className="mb-2" />
                <Text className="font-headline-bold text-[#1c1c18] text-[15px] mb-1">Timeless Timeline</Text>
                <Text className="font-body-medium text-stone-500 text-[13px] leading-5">
                    Your photos are intelligently grouped by month and year so you never lose track of a precious memory.
                </Text>
            </View>
            <View className="bg-primary/5 rounded-[24px] p-5">
                <MaterialIcons name="cloud-upload" size={24} color="#b30069" className="mb-2" />
                <Text className="font-headline-bold text-[#1c1c18] text-[15px] mb-1">Permanent Storage</Text>
                <Text className="font-body-medium text-stone-500 text-[13px] leading-5">
                    No compression and no expiry. Preserve your full-quality memories indefinitely across all your devices.
                </Text>
            </View>
        </View>
    );

    const renderEmptyState = () => (
        <View className="items-center w-full mb-6 mt-16 px-4">
            <View className="w-20 h-20 rounded-full bg-primary/5 items-center justify-center mb-4">
                <MaterialIcons name="photo-library" size={40} color="#b30069" />
            </View>
            <Text className="text-2xl font-headline-bold text-on-surface text-center mb-2">No Mandali Found!</Text>
            <Text className="text-on-surface-variant text-center font-body-medium leading-5 mb-8">
                Memories are better when shared with friends and family. Create or join a Mandali to start capturing your moments!
            </Text>

            <View className="w-full gap-4">
                <TouchableOpacity
                    onPress={() => navigation.navigate('Groups', { screen: 'CreateGroup' })}
                    className="h-16 rounded-[28px] bg-[#b30069] flex-row items-center justify-center px-6 shadow-xl shadow-primary/20"
                >
                    <Ionicons name="add-circle" size={24} color="white" />
                    <Text 
                        className="text-white font-headline-bold ml-2"
                        style={{ fontSize: 20 }}
                        adjustsFontSizeToFit
                        numberOfLines={1}
                    >Create New Mandali</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => navigation.navigate('Groups', { screen: 'JoinGroup' })}
                    className="h-16 rounded-[28px] bg-[#fcecf2] flex-row items-center justify-center px-6 border border-[#b30069]/10"
                >
                    <Ionicons name="enter" size={24} color="#b30069" />
                    <Text 
                        className="text-[#b30069] font-headline-bold ml-2"
                        style={{ fontSize: 20 }}
                        adjustsFontSizeToFit
                        numberOfLines={1}
                    >Join Existing Mandali</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderGroupItem = ({ item }: { item: any }) => {
        return (
            <TouchableOpacity
                onPress={() => navigation.navigate('MemoriesHome', { groupId: item.id })}
                activeOpacity={0.7}
                className="bg-white rounded-[24px] px-4 py-4 flex-row items-center border border-stone-100 shadow-sm mb-3"
                style={{ elevation: 2 }}
            >
                {/* Group Avatar */}
                <View className="w-16 h-16 rounded-2xl overflow-hidden bg-stone-50 border border-stone-100">
                    {item.cover_photo_url ? (
                        <Image
                            source={{ uri: item.cover_photo_url }}
                            className="w-full h-full"
                            resizeMode="cover"
                        />
                    ) : (
                        <View className="w-full h-full items-center justify-center bg-primary/5">
                            <Text className="font-headline-bold text-xl text-primary opacity-30">
                                {item.name.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Group Details */}
                <View className="flex-1 ml-4 justify-center">
                    <Text className="text-lg font-headline-bold text-[#1c1c18] mb-0.5" numberOfLines={1}>
                        {item.name}
                    </Text>
                    <View className="flex-row items-center">
                        <View className="w-1.5 h-1.5 rounded-full bg-primary/40 mr-2" />
                        <Text className="text-[13px] font-body-bold text-[#594048] opacity-60">
                            {item.is_admin ? 'Admin • ' : ''}{item.memberCount || 0} Members
                        </Text>
                    </View>
                </View>

                {/* Navigation Icon */}
                <MaterialIcons name="chevron-right" size={24} color="#b3006969" />
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top']}>
            <View className="px-6 py-4 flex-row items-center justify-between">
                <View>
                    <Text className="text-stone-400 font-body-bold text-[10px] uppercase tracking-[3px] mb-1">Memories Gallery</Text>
                    <Text className="text-2xl font-headline-bold text-primary">Pick a Mandali</Text>
                </View>
            </View>

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator color="#b30069" size="large" />
                </View>
            ) : (
                <FlatList
                    data={groups}
                    renderItem={renderGroupItem}
                    keyExtractor={(item) => item.id}
                    ListEmptyComponent={renderEmptyState}
                    ListFooterComponent={renderContextCards}
                    contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 }}
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

export default MemoriesSelectGroupScreen;
