import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { fetchGroups } from '../../lib/api';

const HousieSelectGroupScreen = () => {
    const navigation = useNavigation<any>();
    const { width } = useWindowDimensions();
    const isTablet = width > 500;
    const { data: groups, isLoading, isRefetching, refetch } = useQuery({
        queryKey: ['groups'],
        queryFn: fetchGroups
    });

    const renderContextCards = () => (
        <View className={`gap-4 flex-1 w-full pb-12 ${isTablet ? 'mt-12' : 'mt-4'}`}>
            <View className={`h-[1px] bg-stone-200/80 w-full mb-${isTablet ? '12' : '4'} mt-2`} />
            <View className={`bg-primary/5 rounded-[32px] ${isTablet ? 'p-12' : 'p-5'}`}>
                <MaterialIcons name="confirmation-num" size={isTablet ? 48 : 24} color="#b30069" className="mb-4" />
                <Text className={`font-headline-bold text-[#1c1c18] mb-2 ${isTablet ? 'text-3xl' : 'text-[15px]'}`}>Classic Gameplay</Text>
                <Text className={`font-body-medium text-stone-500 leading-relaxed ${isTablet ? 'text-2xl' : 'text-[13px]'}`}>
                    Generate automated digital tickets instantly and play live with anyone in your Mandali circle.
                </Text>
            </View>
            <View className={`bg-primary/5 rounded-[32px] ${isTablet ? 'p-12' : 'p-5'}`}>
                <MaterialIcons name="emoji-events" size={isTablet ? 48 : 24} color="#b30069" className="mb-4" />
                <Text className={`font-headline-bold text-[#1c1c18] mb-2 ${isTablet ? 'text-3xl' : 'text-[15px]'}`}>Live Bounties</Text>
                <Text className={`font-body-medium text-stone-500 leading-relaxed ${isTablet ? 'text-2xl' : 'text-[13px]'}`}>
                    Fastest five, first row, full house... sprint to claim digital rewards against your friends.
                </Text>
            </View>
            <View className={`bg-primary/5 rounded-[32px] ${isTablet ? 'p-12' : 'p-5'}`}>
                <MaterialIcons name="notifications-active" size={isTablet ? 48 : 24} color="#b30069" className="mb-4" />
                <Text className={`font-headline-bold text-[#1c1c18] mb-2 ${isTablet ? 'text-3xl' : 'text-[15px]'}`}>Instant Invites</Text>
                <Text className={`font-body-medium text-stone-500 leading-relaxed ${isTablet ? 'text-2xl' : 'text-[13px]'}`}>
                    When a game is launched, all members of your chosen Mandali are notified instantly to join the lobby.
                </Text>
            </View>
            <View className={`bg-primary/5 rounded-[32px] ${isTablet ? 'p-12' : 'p-5'}`}>
                <MaterialIcons name="leaderboard" size={isTablet ? 48 : 24} color="#b30069" className="mb-4" />
                <Text className={`font-headline-bold text-[#1c1c18] mb-2 ${isTablet ? 'text-3xl' : 'text-[15px]'}`}>Mandali Leaderboards</Text>
                <Text className={`font-body-medium text-stone-500 leading-relaxed ${isTablet ? 'text-2xl' : 'text-[13px]'}`}>
                    Track all-time winners across your group and see exactly who claims the highest bounties securely.
                </Text>
            </View>
        </View>
    );

    const renderEmptyState = () => (
        <View className="items-center w-full mb-12 mt-16 px-6">
            <View className={`rounded-full bg-primary/5 items-center justify-center mb-8 ${isTablet ? 'w-40 h-40' : 'w-20 h-20'}`}>
                <MaterialIcons name="local-activity" size={isTablet ? 80 : 40} color="#b30069" />
            </View>
            <Text className={`font-headline-bold text-on-surface text-center mb-4 ${isTablet ? 'text-5xl' : 'text-2xl'}`}>No Mandali Found!</Text>
            <Text className={`text-on-surface-variant text-center font-body-medium leading-relaxed mb-12 ${isTablet ? 'text-2xl px-20' : 'text-[15px]'}`}>
                Housie is better with friends and family. Create or join a Mandali to start your first session!
            </Text>

            <View className="w-full gap-6">
                <TouchableOpacity
                    onPress={() => navigation.navigate('Groups', { screen: 'CreateGroup' })}
                    style={{ height: isTablet ? 110 : 64 }}
                    className="rounded-[32px] bg-[#b30069] flex-row items-center justify-center px-8 shadow-xl shadow-primary/20"
                >
                    <Ionicons name="add-circle" size={isTablet ? 36 : 24} color="white" />
                    <Text
                        className="text-white font-headline-bold ml-4"
                        style={{ fontSize: isTablet ? 32 : 20 }}
                    >Create New Mandali</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => navigation.navigate('Groups', { screen: 'JoinGroup' })}
                    style={{ height: isTablet ? 110 : 64 }}
                    className="rounded-[32px] bg-[#fcecf2] flex-row items-center justify-center px-8 border border-[#b30069]/10"
                >
                    <Ionicons name="enter" size={isTablet ? 36 : 24} color="#b30069" />
                    <Text
                        className="text-[#b30069] font-headline-bold ml-4"
                        style={{ fontSize: isTablet ? 32 : 20 }}
                    >Join Existing Mandali</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderGroupItem = ({ item }: { item: any }) => {
        return (
            <TouchableOpacity
                onPress={() => navigation.navigate('HousieLobby', { groupId: item.id })}
                activeOpacity={0.7}
                className={`bg-white rounded-[32px] flex-row items-center border border-stone-100 shadow-sm mb-4 ${isTablet ? 'px-10 py-8' : 'px-4 py-4'}`}
                style={{ elevation: 2 }}
            >
                {/* Group Avatar */}
                <View className={`rounded-2xl overflow-hidden bg-stone-50 border border-stone-100 ${isTablet ? 'w-24 h-24' : 'w-16 h-16'}`}>
                    {item.cover_photo_url ? (
                        <Image
                            source={{ uri: item.cover_photo_url }}
                            className="w-full h-full"
                            resizeMode="cover"
                        />
                    ) : (
                        <View className="w-full h-full items-center justify-center bg-primary/5">
                            <Text
                                className="font-headline-bold text-primary opacity-30"
                                style={{ fontSize: isTablet ? 42 : 24 }}
                            >
                                {item.name.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Group Details */}
                <View className="flex-1 ml-6 justify-center">
                    <Text
                        className="font-headline-bold text-[#1c1c18] mb-1.5"
                        style={{ fontSize: isTablet ? 36 : 18 }}
                        numberOfLines={1}
                    >
                        {item.name}
                    </Text>
                    <View className="flex-row items-center">
                        <View className={`rounded-full bg-primary/40 mr-3 ${isTablet ? 'w-2.5 h-2.5' : 'w-1.5 h-1.5'}`} />
                        <Text className={`font-body-bold text-[#594048] opacity-60 ${isTablet ? 'text-2xl' : 'text-[13px]'}`}>
                            {item.is_admin ? 'Admin • ' : ''}{item.memberCount || 0} Members
                        </Text>
                    </View>
                </View>

                {/* Navigation Icon */}
                <MaterialIcons name="chevron-right" size={isTablet ? 42 : 24} color="#b3006969" />
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top']}>
            <View className="px-6 py-4 flex-row items-center justify-between">
                {/* Centered Header Section */}
                <View
                    className="items-center w-full"
                    style={{
                        marginTop: isTablet ? 60 : 20,
                        marginBottom: isTablet ? 40 : 20
                    }}
                >
                    <Text
                        className="font-headline-bold text-on-surface text-center tracking-tight text-[#1c1c18]"
                        style={{ fontSize: isTablet ? 72 : 38 }}
                        adjustsFontSizeToFit
                        numberOfLines={1}
                    >
                        Pick a Mandali
                    </Text>
                    <Text
                        className="font-body-medium text-on-surface-variant text-center leading-relaxed opacity-60"
                        style={{
                            fontSize: isTablet ? 22 : 15,
                            marginTop: isTablet ? 20 : 12,
                            paddingHorizontal: isTablet ? 80 : 32
                        }}
                    >
                        Choose the circle you want to gather with for a game of Housie
                    </Text>
                    <View
                        className="bg-primary/20 rounded-full"
                        style={{
                            height: 4,
                            width: isTablet ? 120 : 40,
                            marginTop: isTablet ? 36 : 20
                        }}
                    />
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

export default HousieSelectGroupScreen;
