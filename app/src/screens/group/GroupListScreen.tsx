import React, { useCallback } from 'react';
import { useIsTablet } from '../../hooks/useIsTablet';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Dimensions, useWindowDimensions } from 'react-native';
import { fetchGroups } from '../../lib/api';
import { Image } from 'expo-image';
import { useAuthStore } from '../../stores/authStore';
import { LinearGradient } from 'expo-linear-gradient';
import MandaliCoin from '../../components/MandaliCoin';

const GroupListScreen = () => {
    const navigation = useNavigation<any>();
    const { user } = useAuthStore();
    const { width } = useWindowDimensions();
    const isTablet = useIsTablet();

    const { data: groups = [], isLoading, isRefetching, refetch } = useQuery({
        queryKey: ['groups'],
        queryFn: fetchGroups,
    });

    return (
        <SafeAreaView className="flex-1 bg-[#FDF9F3]" edges={['top']}>
            {/* Top Brand Bar */}
            <View className="flex-row items-center px-6 py-4">
                <View className="flex-row items-center flex-1">
                    <Image
                        source={require('../../../assets/icon.png')}
                        style={{ width: 42, height: 42 }}
                        contentFit="contain"
                    />
                    <Text className="text-[#b30069] font-headline-bold text-[24px] tracking-tight ml-2">
                        Mandali
                    </Text>
                </View>
            </View>

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 60 }}
                refreshControl={
                    <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#b30069" />
                }
            >
                {/* Centered Header Section */}
                <View
                    className="items-center w-full"
                    style={{
                        marginTop: isTablet ? 40 : 20,
                        marginBottom: isTablet ? 40 : 20
                    }}
                >
                    <Text
                        className="font-headline-bold text-on-surface text-center tracking-tight text-[#1c1c18]"
                        style={{ fontSize: isTablet ? 72 : 38 }}
                        adjustsFontSizeToFit
                        numberOfLines={1}
                    >
                        My Mandalis
                    </Text>
                    <Text
                        className="font-body-medium text-on-surface-variant text-center leading-relaxed opacity-60"
                        style={{
                            fontSize: isTablet ? 24 : 15,
                            marginTop: isTablet ? 24 : 12,
                            paddingHorizontal: isTablet ? 120 : 32
                        }}
                    >
                        Relive your moments and manage your circles
                    </Text>
                    <View
                        className="bg-primary/20 rounded-full"
                        style={{
                            height: 4,
                            width: isTablet ? 120 : 40,
                            marginTop: isTablet ? 40 : 24
                        }}
                    />
                </View>


                {/* Loading state */}
                {isLoading && groups.length === 0 && (
                    <View className="py-20 items-center justify-center">
                        <ActivityIndicator color="#b30069" size="large" />
                    </View>
                )}

                {/* Empty State */}
                {!isLoading && groups.length === 0 && (
                    <View className="py-12 items-center">
                        <View className="w-20 h-20 bg-primary/5 rounded-full items-center justify-center mb-6">
                            <Ionicons name="people-outline" size={32} color="#b30069" opacity={0.4} />
                        </View>
                        <Text className="font-headline-bold text-lg text-on-surface-variant">No groups yet</Text>
                        <Text className="font-body-regular text-sm text-on-surface-variant opacity-60 mt-1">Start your first Mandali below</Text>
                    </View>
                )}

                {/* Group List (Vertical stacking) */}
                <View style={{ gap: isTablet ? 20 : 12 }}>
                    {groups.map((group: any) => (
                        <TouchableOpacity
                            key={group.id}
                            onPress={() => navigation.navigate('GroupDetail', { groupId: group.id })}
                            activeOpacity={0.7}
                            className={`bg-white rounded-[24px] px-${isTablet ? '6' : '4'} py-${isTablet ? '6' : '4'} flex-row items-center border border-stone-100 shadow-sm`}
                            style={{ elevation: 2 }}
                        >
                            {/* Group Avatar */}
                            <View className={`rounded-[28px] overflow-hidden bg-stone-50 border border-stone-100 ${isTablet ? 'w-28 h-28' : 'w-16 h-16'}`}>
                                {group.cover_photo_url ? (
                                    <Image
                                        source={{ uri: group.cover_photo_url }}
                                        style={{ width: '100%', height: '100%' }}
                                        contentFit="cover"
                                    />
                                ) : (
                                    <View className="w-full h-full items-center justify-center bg-primary/5">
                                        <Text className={`font-headline-bold text-primary opacity-30 ${isTablet ? 'text-5xl' : 'text-xl'}`}>
                                            {group.name.charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* Group Details */}
                            <View className="flex-1 ml-8 justify-center">
                                <Text className={`font-headline-bold text-[#1c1c18] mb-2 ${isTablet ? 'text-4xl' : 'text-lg'}`} numberOfLines={1}>
                                    {group.name}
                                </Text>
                                <View className="flex-row items-center">
                                    <View className={`rounded-full bg-primary/40 mr-3 ${isTablet ? 'w-3 h-3' : 'w-1.5 h-1.5'}`} />
                                    <Text className={`font-body-bold text-[#594048] opacity-60 ${isTablet ? 'text-2xl' : 'text-[13px]'}`}>
                                        {group.is_admin ? 'Admin • ' : ''}{group.memberCount || 0} Members
                                    </Text>
                                </View>
                            </View>

                            {/* Navigation Icon */}
                            <MaterialIcons name="chevron-right" size={isTablet ? 48 : 24} color="#b3006969" />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Primary Action Section - Stacked High-Density Rows */}
                <View className={`mt-12 gap-6`}>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('CreateGroup')}
                        activeOpacity={0.9}
                        style={{
                            height: isTablet ? 110 : 64,
                            elevation: 8,
                            shadowColor: '#b30069',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.2,
                            shadowRadius: 8
                        }}
                        className="rounded-[32px] overflow-hidden bg-[#b30069] flex-row items-center justify-center px-8"
                    >
                        <MaterialIcons name="add-circle" size={isTablet ? 42 : 24} color="white" />
                        <Text
                            className="text-white font-headline-bold ml-4"
                            style={{ fontSize: isTablet ? 32 : 20 }}
                            adjustsFontSizeToFit
                            numberOfLines={1}
                        >
                            Create New Mandali
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => navigation.navigate('JoinGroup')}
                        activeOpacity={0.7}
                        style={{
                            height: isTablet ? 110 : 64,
                            borderWidth: 2,
                            borderColor: '#b3006915'
                        }}
                        className="rounded-[32px] bg-[#fcecf2] flex-row items-center justify-center px-8"
                    >
                        <MaterialIcons name="qr-code-scanner" size={isTablet ? 42 : 24} color="#b30069" />
                        <Text
                            className={`text-[#b30069] font-headline-bold ml-4 ${isTablet ? 'text-3xl' : 'text-xl'}`}
                            adjustsFontSizeToFit
                            numberOfLines={1}
                        >
                            Join with Invite
                        </Text>
                    </TouchableOpacity>
                </View>

                <View
                    className="items-center px-10"
                    style={{ marginTop: isTablet ? 80 : 48 }}
                >
                    <View className="bg-stone-200 mb-6" style={{ height: 1, width: isTablet ? 120 : 40 }} />
                    <Text
                        className={`font-body-bold tracking-[0.15em] uppercase text-[#594048]/60 text-center transition-opacity ${isTablet ? 'text-2xl px-20 leading-9' : 'text-[11px] leading-5'}`}
                    >
                        Trusted by Family, Friends, Colleagues & Community Circles
                    </Text>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
};

export default GroupListScreen;
