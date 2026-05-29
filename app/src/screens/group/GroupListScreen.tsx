// lib
import React, { useCallback, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused, useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';

//hooks
import { useIsTablet } from '../../hooks/useIsTablet';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSocket } from '../../hooks/useSocket';

//api
import { fetchGroups, getOptimizedImageUrl } from '../../lib/api';
import { SearchBar } from '../../components/common/SearchBar';
import { MandaliCard } from '../../components/common/MandaliCard';

const GroupListScreen = () => {
    const navigation = useNavigation<any>();
    const isFocused = useIsFocused();
    const isTablet = useIsTablet();
    const socket = useSocket();
    const queryClient = useQueryClient();

    const { data: groups = [], isLoading, isRefetching, refetch } = useQuery({
        queryKey: ['groups'],
        queryFn: fetchGroups,
    });

    const [searchQuery, setSearchQuery] = useState('');

    const filteredGroups = useMemo(() => {
        if (!groups) return [];
        if (!searchQuery.trim()) return groups;
        return groups.filter((g: any) =>
            g.name?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [groups, searchQuery]);

    useFocusEffect(
        useCallback(() => {
            refetch();

            if (!socket) {
                return;
            }

            const handleGroupUpdate = (event: any) => {
                queryClient.invalidateQueries({ queryKey: ['groups'] });
            };

            socket.on('group_event', handleGroupUpdate);

            return () => {
                console.log('[GroupList] 🔇 Unregistering group listeners');
                socket.off('group_event', handleGroupUpdate);
            };
        }, [socket, queryClient, refetch])
    );

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
                {/* Notification Bell Button */}
                <TouchableOpacity
                    onPress={() => navigation.navigate('Notifications')}
                    activeOpacity={0.7}
                    className="w-10 h-10 bg-white border border-stone-100 shadow-sm rounded-full items-center justify-center relative"
                >
                    <Ionicons name="notifications-outline" size={20} color="#b30069" />
                    {/* Active Indicator dot */}
                    <View className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#b30069] rounded-full border border-white" />
                </TouchableOpacity>
            </View>

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
            </View>

            <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search Mandalis..."
            />

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 60 }}
                refreshControl={
                    <RefreshControl refreshing={isFocused ? isRefetching : false} onRefresh={refetch} tintColor="#b30069" />
                }
            >
                {/* Loading state */}
                {isLoading && groups.length === 0 && (
                    <View className="py-20 items-center justify-center">
                        <ActivityIndicator color="#b30069" size="large" />
                    </View>
                )}

                {/* Empty State */}
                {!isLoading && groups.length === 0 && (
                    <View className="py-12 items-center">
                        <View className="w-20 h-20 bg-primary/5 rounded-full items-center justify-center mb-6" style={{ opacity: 0.4 }}>
                            <Ionicons name="people-outline" size={32} color="#b30069" />
                        </View>
                        <Text className="font-headline-bold text-lg text-on-surface-variant">No groups yet</Text>
                        <Text className="font-body-regular text-sm text-on-surface-variant opacity-60 mt-1">Start your first Mandali below</Text>
                    </View>
                )}

                {/* Group List (Vertical stacking) */}
                <View style={{ gap: isTablet ? 20 : 12 }}>
                    {filteredGroups.map((group: any) => (
                        <MandaliCard
                            key={group.id}
                            item={group}
                            onPress={(id) => navigation.navigate('GroupDetail', { groupId: id })}
                        />
                    ))}
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

            {/* Floating Action Buttons - Bottom Right */}
            <View style={{ position: 'absolute', bottom: isTablet ? 40 : 24, right: isTablet ? 32 : 24, gap: 12, alignItems: 'flex-end' }}>
                <TouchableOpacity
                    onPress={() => navigation.navigate('JoinGroup', { returnTo: { screen: 'GroupList' } })}
                    activeOpacity={0.7}
                    style={{
                        elevation: 4,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.15,
                        shadowRadius: 4,
                    }}
                    className={`bg-white border border-[#b30069]/10 rounded-full flex-row items-center ${isTablet ? 'px-6 py-4' : 'px-5 py-3.5'}`}
                >
                    <MaterialIcons name="qr-code-scanner" size={isTablet ? 28 : 20} color="#b30069" />
                    <Text className={`text-[#b30069] font-headline-bold ml-2.5 ${isTablet ? 'text-2xl' : 'text-base'}`}>Join Mandali</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => navigation.navigate('CreateGroup', { returnTo: { screen: 'GroupList' } })}
                    activeOpacity={0.9}
                    style={{
                        elevation: 6,
                        shadowColor: '#b30069',
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.25,
                        shadowRadius: 6,
                    }}
                    className={`bg-[#b30069] rounded-full flex-row items-center ${isTablet ? 'px-6 py-4' : 'px-5 py-3.5'}`}
                >
                    <MaterialIcons name="add" size={isTablet ? 30 : 22} color="white" />
                    <Text className={`text-white font-headline-bold ml-2 ${isTablet ? 'text-2xl' : 'text-base'}`}>Create New</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

export default GroupListScreen;
