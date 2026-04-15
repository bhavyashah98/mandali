import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { fetchGroups } from '../../lib/api';
import { Image } from 'expo-image';
import { useAuthStore } from '../../stores/authStore';
import { LinearGradient } from 'expo-linear-gradient';

const GroupListScreen = () => {
    const navigation = useNavigation<any>();
    const { user } = useAuthStore();

    const { data: groups = [], isLoading, isRefetching, refetch } = useQuery({
        queryKey: ['groups'],
        queryFn: fetchGroups,
    });

    console.log(groups, isLoading);

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
                <View className="items-center mb-10 mt-6 w-full">
                    <Text
                        className="font-headline-bold text-on-surface text-center tracking-tight text-[#1c1c18]"
                        style={{ fontSize: 38 }}
                        adjustsFontSizeToFit
                        numberOfLines={1}
                    >
                        My Mandalis
                    </Text>
                    <Text className="text-[15px] font-body-medium text-on-surface-variant text-center px-8 mt-3 leading-5 opacity-60">
                        All your groups, in one place
                    </Text>
                    <View className="w-10 h-[3px] bg-primary/20 mt-8 rounded-full" />
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
                <View style={{ gap: 12 }}>
                    {groups.map((group: any) => (
                        <TouchableOpacity
                            key={group.id}
                            onPress={() => navigation.navigate('GroupDetail', { groupId: group.id })}
                            activeOpacity={0.7}
                            className="bg-white rounded-[24px] px-4 py-4 flex-row items-center border border-stone-100 shadow-sm"
                            style={{ elevation: 2 }}
                        >
                            {/* Group Avatar */}
                            <View className="w-16 h-16 rounded-2xl overflow-hidden bg-stone-50 border border-stone-100">
                                {group.cover_photo_url ? (
                                    <Image
                                        source={{ uri: group.cover_photo_url }}
                                        style={{ width: '100%', height: '100%' }}
                                        contentFit="cover"
                                    />
                                ) : (
                                    <View className="w-full h-full items-center justify-center bg-primary/5">
                                        <Text className="font-headline-bold text-xl text-primary opacity-30">
                                            {group.name.charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* Group Details */}
                            <View className="flex-1 ml-4 justify-center">
                                <Text className="text-lg font-headline-bold text-[#1c1c18] mb-0.5" numberOfLines={1}>
                                    {group.name}
                                </Text>
                                <View className="flex-row items-center">
                                    <View className="w-1.5 h-1.5 rounded-full bg-primary/40 mr-2" />
                                    <Text className="text-[13px] font-body-bold text-[#594048] opacity-60">
                                        {group.is_admin ? 'Admin • ' : ''}{group.memberCount || 0} Members
                                    </Text>
                                </View>
                            </View>

                            {/* Navigation Icon */}
                            <MaterialIcons name="chevron-right" size={24} color="#b3006969" />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Primary Action Section - Matching Game Style */}
                <View className="mt-12 gap-4">
                    <TouchableOpacity
                        onPress={() => navigation.navigate('CreateGroup')}
                        activeOpacity={0.9}
                        className="h-16 rounded-[28px] overflow-hidden shadow-xl shadow-primary/20 bg-[#b30069] flex-row items-center justify-center px-6"
                        style={{ elevation: 8 }}
                    >
                        <MaterialIcons name="add-circle" size={24} color="white" />
                        <Text
                            className="text-white font-headline-bold ml-3"
                            style={{ fontSize: 20 }}
                            adjustsFontSizeToFit
                            numberOfLines={1}
                        >
                            Create New Mandali
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => navigation.navigate('JoinGroup')}
                        activeOpacity={0.7}
                        className="h-16 rounded-[28px] bg-[#fcecf2] flex-row items-center justify-center px-6 border border-[#b30069]/10"
                    >
                        <MaterialIcons name="qr-code-scanner" size={24} color="#b30069" />
                        <Text
                            className="text-[#b30069] font-headline-bold ml-3"
                            style={{ fontSize: 20 }}
                            adjustsFontSizeToFit
                            numberOfLines={1}
                        >
                            Join with Invite
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Social Proof (Updated) */}
                <View className="mt-16 items-center px-10">
                    <View className="h-[1px] w-12 bg-stone-200 mb-6" />
                    <Text className="text-[11px] font-body-bold tracking-[0.15em] uppercase text-[#594048]/60 text-center leading-5 transition-opacity">
                        Trusted by Family, Friends, Colleagues & Community Circles
                    </Text>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
};

export default GroupListScreen;
