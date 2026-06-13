import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useIsTablet } from '../../hooks/useIsTablet';
import { fetchNotifications, markNotificationsAsRead } from '../../lib/api';
import { formatDistanceToNow } from 'date-fns';

interface NotificationItem {
    id: string;
    type: 'pulse' | 'plan' | 'memories' | 'streak' | 'members';
    title: string;
    description: string;
    time: string;
    thumbnails?: string[];
}

const NotificationScreen = () => {
    const navigation = useNavigation<any>();
    const isTablet = useIsTablet();

    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadNotifications();
    }, []);

    const loadNotifications = async () => {
        try {
            setLoading(true);
            const data = await fetchNotifications(0, 50);
            setNotifications(data.notifications || []);
            
            // Mark as read immediately when loaded
            const unreadIds = data.notifications
                ?.filter((n: any) => !n.is_read)
                .map((n: any) => n.id);
                
            if (unreadIds && unreadIds.length > 0) {
                await markNotificationsAsRead(unreadIds);
            }
        } catch (error) {
            console.error('Failed to load notifications', error);
        } finally {
            setLoading(false);
        }
    };

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
            {/* Header */}
            <View className={`flex-row items-center justify-between px-6 ${isTablet ? 'py-8' : 'py-4'}`}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className={`items-center justify-center bg-white shadow-sm border border-stone-100 rounded-full ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}
                >
                    <MaterialIcons name="arrow-back" size={isTablet ? 32 : 24} color="#594048" />
                </TouchableOpacity>

                <Text className={`font-headline-bold text-[#b30069] text-center flex-1 ${isTablet ? 'text-4xl' : 'text-xl'}`}>
                    Notifications
                </Text>

                <TouchableOpacity
                    activeOpacity={0.7}
                    className={`bg-white border border-stone-100 flex-row items-center px-4 py-2 rounded-full shadow-sm ${isTablet ? 'px-6 py-3.5' : ''}`}
                >
                    <Text className={`text-[#b30069] font-headline-bold mr-1 ${isTablet ? 'text-xl' : 'text-[13px]'}`}>
                        All
                    </Text>
                    <Ionicons name="chevron-down" size={isTablet ? 18 : 12} color="#b30069" />
                </TouchableOpacity>
            </View>

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 10, paddingBottom: 40 }}
            >
                {/* Time Section Label */}
                <Text className={`font-body-bold text-[#594048]/60 uppercase tracking-widest mb-4 ${isTablet ? 'text-2xl mb-6' : 'text-xs'}`}>
                    Today
                </Text>

                {/* Notifications Stack */}
                <View style={{ gap: isTablet ? 20 : 12 }}>
                    {loading ? (
                        <ActivityIndicator size="large" color="#b30069" style={{ marginTop: 40 }} />
                    ) : notifications.length === 0 ? (
                        <Text className="text-center text-stone-500 font-body-medium mt-10">No notifications yet</Text>
                    ) : notifications.map((item) => {
                        const { bg, icon } = getIconDetails(item.notification_type);
                        const timeAgo = formatDistanceToNow(new Date(item.created_at), { addSuffix: true });
                        const thumbnails = item.metadata?.thumbnails || [];
                        return (
                            <View
                                key={item.id}
                                className={`bg-white rounded-[24px] border border-stone-100 shadow-sm flex-row ${isTablet ? 'p-6' : 'p-4'}`}
                                style={{ elevation: 2 }}
                            >
                                {/* Left Side Icon Circle */}
                                <View
                                    style={{ backgroundColor: bg }}
                                    className={`rounded-full items-center justify-center mr-4 ${isTablet ? 'w-16 h-16' : 'w-12 h-12'}`}
                                >
                                    {icon}
                                </View>

                                {/* Center/Right Content */}
                                <View className="flex-1 justify-center">
                                    <View className="flex-row items-start justify-between">
                                        <Text
                                            className={`font-headline-bold text-[#1c1c18] flex-1 leading-snug ${isTablet ? 'text-2xl mb-1.5' : 'text-[14px] mb-1'}`}
                                        >
                                            {item.title}
                                        </Text>
                                        <Text
                                            className={`font-body-medium text-[#594048]/55 ml-2 ${isTablet ? 'text-lg' : 'text-[11px]'}`}
                                        >
                                            {timeAgo}
                                        </Text>
                                    </View>
                                    
                                    <Text
                                        className={`font-body-medium text-[#594048]/75 leading-relaxed ${isTablet ? 'text-xl' : 'text-[12px]'}`}
                                    >
                                        {item.body}
                                    </Text>

                                    {/* Inline Thumbnails for Memory additions */}
                                    {thumbnails.length > 0 && (
                                        <View className={`flex-row mt-3.5 ${isTablet ? 'gap-4 mt-5' : 'gap-2.5'}`}>
                                            {thumbnails.map((url: string, index: number) => (
                                                <View 
                                                    key={index} 
                                                    className={`rounded-[14px] overflow-hidden bg-stone-100 border border-stone-100 ${isTablet ? 'w-20 h-20' : 'w-[52px] h-[52px]'}`}
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
