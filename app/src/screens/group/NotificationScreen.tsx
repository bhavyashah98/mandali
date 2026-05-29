import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useIsTablet } from '../../hooks/useIsTablet';

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

    const notifications: NotificationItem[] = [
        {
            id: '1',
            type: 'pulse',
            title: 'Your Mandali Pulse increased! 🎉',
            description: "You're more active than 72% of Mandalis.",
            time: '2m ago'
        },
        {
            id: '2',
            type: 'plan',
            title: 'Rohan created a plan "Weekend Match"',
            description: 'Saturday, 24 May at 5:00 PM',
            time: '15m ago'
        },
        {
            id: '3',
            type: 'memories',
            title: '3 new memories added',
            description: 'Relive the fun moments ✨',
            time: '1h ago',
            thumbnails: [
                'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&q=80',
                'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80',
                'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&q=80'
            ]
        },
        {
            id: '4',
            type: 'streak',
            title: 'Meetup streak: 6 weekends! 🔥',
            description: 'Amazing! Keep the streak alive.',
            time: '2h ago'
        },
        {
            id: '5',
            type: 'members',
            title: 'Only 7/18 members joined recent plans',
            description: "Let's bring the full gang together! 💪",
            time: '3h ago'
        }
    ];

    const getIconDetails = (type: NotificationItem['type']) => {
        switch (type) {
            case 'pulse':
                return {
                    bg: '#fff0f5',
                    icon: <FontAwesome5 name="heartbeat" size={isTablet ? 26 : 18} color="#b30069" />
                };
            case 'plan':
                return {
                    bg: '#f3e8ff',
                    icon: <Ionicons name="calendar" size={isTablet ? 28 : 20} color="#7c3aed" />
                };
            case 'memories':
                return {
                    bg: '#fff0f5',
                    icon: <Ionicons name="image" size={isTablet ? 28 : 20} color="#b30069" />
                };
            case 'streak':
                return {
                    bg: '#fff7ed',
                    icon: <Ionicons name="flame" size={isTablet ? 28 : 20} color="#ea580c" />
                };
            case 'members':
                return {
                    bg: '#fff0f5',
                    icon: <Ionicons name="people" size={isTablet ? 28 : 20} color="#b30069" />
                };
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
                    {notifications.map((item) => {
                        const { bg, icon } = getIconDetails(item.type);
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
                                            {item.time}
                                        </Text>
                                    </View>
                                    
                                    <Text
                                        className={`font-body-medium text-[#594048]/75 leading-relaxed ${isTablet ? 'text-xl' : 'text-[12px]'}`}
                                    >
                                        {item.description}
                                    </Text>

                                    {/* Inline Thumbnails for Memory additions */}
                                    {item.thumbnails && item.thumbnails.length > 0 && (
                                        <View className={`flex-row mt-3.5 ${isTablet ? 'gap-4 mt-5' : 'gap-2.5'}`}>
                                            {item.thumbnails.map((url, index) => (
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
