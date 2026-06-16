import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useIsTablet } from '../../hooks/useIsTablet';
import { fetchNotifications, markNotificationsAsRead } from '../../lib/api';
import { formatDistanceToNow } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const NotificationScreen = () => {
    const navigation = useNavigation<any>();
    const isTablet = useIsTablet();
    const queryClient = useQueryClient();

    const {
        data,
        isLoading,
        isRefetching,
        refetch,
    } = useQuery({
        queryKey: ['notifications'],
        queryFn: () => fetchNotifications(0, 50),
        staleTime: 30_000,
    });

    const notifications: any[] = data?.notifications || [];

    // Mark all unread as read whenever this screen loads fresh data
    useEffect(() => {
        if (!notifications.length) return;
        const unreadIds = notifications
            .filter((n) => !n.is_read)
            .map((n) => n.id);
        if (unreadIds.length > 0) {
            markNotificationsAsRead(unreadIds).then(() => {
                // Invalidate the unread count badge on the list screen
                queryClient.invalidateQueries({ queryKey: ['unreadNotificationsCount'] });
            });
        }
    }, [notifications.length]);

    const getIconDetails = (type: string) => {
        switch (type) {
            case 'pulse_increased':
                return { bg: '#fff0f5', icon: <FontAwesome5 name="heartbeat" size={isTablet ? 26 : 18} color="#b30069" /> };
            case 'plan_created':
            case 'plan_updated':
            case 'plan_rsvp':
            case 'plan_cancelled':
                return { bg: '#f3e8ff', icon: <Ionicons name="calendar" size={isTablet ? 28 : 20} color="#7c3aed" /> };
            case 'memory_added':
            case 'memory_comment':
            case 'memory_reaction':
                return { bg: '#fff0f5', icon: <Ionicons name="image" size={isTablet ? 28 : 20} color="#b30069" /> };
            case 'streak_updated':
                return { bg: '#fff7ed', icon: <Ionicons name="flame" size={isTablet ? 28 : 20} color="#ea580c" /> };
            case 'hisaab_added':
            case 'hisaab_settled':
                return { bg: '#ecfdf5', icon: <MaterialIcons name="account-balance-wallet" size={isTablet ? 28 : 20} color="#059669" /> };
            case 'housie_created':
            case 'blink_created':
                return { bg: '#eff6ff', icon: <Ionicons name="game-controller" size={isTablet ? 28 : 20} color="#2563eb" /> };
            default:
                return { bg: '#f3f4f6', icon: <Ionicons name="notifications" size={isTablet ? 28 : 20} color="#6b7280" /> };
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-[#FDF9F3]" edges={['top']}>
            {/* Header — simple back + title, no filter button */}
            <View className={`flex-row items-center px-6 ${isTablet ? 'py-8' : 'py-4'}`}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className={`items-center justify-center bg-white shadow-sm border border-stone-100 rounded-full ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}
                >
                    <MaterialIcons name="arrow-back" size={isTablet ? 32 : 24} color="#594048" />
                </TouchableOpacity>

                <Text className={`font-headline-bold text-[#b30069] ml-4 ${isTablet ? 'text-4xl' : 'text-xl'}`}>
                    Notifications
                </Text>
            </View>

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 10, paddingBottom: 40 }}
                refreshControl={
                    <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#b30069" />
                }
            >
                {/* Notifications Stack */}
                <View style={{ gap: isTablet ? 20 : 12 }}>
                    {isLoading ? (
                        <ActivityIndicator size="large" color="#b30069" style={{ marginTop: 40 }} />
                    ) : notifications.length === 0 ? (
                        <View className="items-center mt-20" style={{ gap: 12 }}>
                            <View className="w-16 h-16 bg-stone-100 rounded-full items-center justify-center">
                                <Ionicons name="notifications-off-outline" size={28} color="#b3006980" />
                            </View>
                            <Text className={`font-headline-bold text-[#594048]/60 ${isTablet ? 'text-2xl' : 'text-base'}`}>
                                No notifications yet
                            </Text>
                            <Text className={`font-body-medium text-[#594048]/40 text-center ${isTablet ? 'text-lg' : 'text-xs'}`}>
                                Activity from your Mandalis{'\n'}will show up here
                            </Text>
                        </View>
                    ) : notifications.map((item) => {
                        const { bg, icon } = getIconDetails(item.notification_type);
                        const timeAgo = formatDistanceToNow(new Date(item.created_at), { addSuffix: true });
                        const thumbnails: string[] = item.metadata?.thumbnails || [];
                        const groupName: string | undefined = item.group?.name;
                        const isUnread = !item.is_read;

                        return (
                            <View
                                key={item.id}
                                className={`bg-white rounded-[24px] border shadow-sm flex-row ${isTablet ? 'p-6' : 'p-4'} ${isUnread ? 'border-[#b30069]/20' : 'border-stone-100'}`}
                                style={{ elevation: isUnread ? 3 : 2 }}
                            >
                                {/* Unread indicator bar */}
                                {isUnread && (
                                    <View
                                        className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full bg-[#b30069]"
                                    />
                                )}

                                {/* Left Side Icon Circle */}
                                <View
                                    style={{ backgroundColor: bg }}
                                    className={`rounded-full items-center justify-center mr-4 flex-shrink-0 ${isTablet ? 'w-16 h-16' : 'w-12 h-12'}`}
                                >
                                    {icon}
                                </View>

                                {/* Center/Right Content */}
                                <View className="flex-1">
                                    {/* Title row + timestamp */}
                                    <View className="flex-row items-start justify-between">
                                        <Text
                                            className={`font-headline-bold text-[#1c1c18] flex-1 leading-snug ${isTablet ? 'text-2xl' : 'text-[14px]'}`}
                                        >
                                            {item.title}
                                        </Text>
                                        <Text
                                            className={`font-body-medium text-[#594048]/50 ml-2 flex-shrink-0 ${isTablet ? 'text-lg' : 'text-[10px]'}`}
                                        >
                                            {timeAgo}
                                        </Text>
                                    </View>

                                    {/* Body */}
                                    <Text
                                        className={`font-body-medium text-[#594048]/70 leading-relaxed mt-0.5 ${isTablet ? 'text-xl' : 'text-[12px]'}`}
                                    >
                                        {item.body}
                                    </Text>

                                    {/* Group pill — always shown when group_id exists */}
                                    {groupName && (
                                        <View className="flex-row items-center mt-2" style={{ gap: 4 }}>
                                            <Ionicons name="people" size={isTablet ? 16 : 11} color="#b30069" />
                                            <Text
                                                className={`font-body-bold text-[#b30069] ${isTablet ? 'text-base' : 'text-[11px]'}`}
                                                numberOfLines={1}
                                            >
                                                {groupName}
                                            </Text>
                                        </View>
                                    )}

                                    {/* Inline Thumbnails for Memory additions */}
                                    {thumbnails.length > 0 && (
                                        <View className={`flex-row mt-3 ${isTablet ? 'gap-4' : 'gap-2'}`}>
                                            {thumbnails.map((url: string, index: number) => (
                                                <View
                                                    key={index}
                                                    className={`rounded-[14px] overflow-hidden bg-stone-100 ${isTablet ? 'w-20 h-20' : 'w-[52px] h-[52px]'}`}
                                                >
                                                    <Image
                                                        source={{ uri: url }}
                                                        style={{ width: '100%', height: '100%' }}
                                                        contentFit="cover"
                                                    />
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            </View>
                        );
                    })}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default NotificationScreen;
