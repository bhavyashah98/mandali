//lib
import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Share, Alert, Modal, Pressable, RefreshControl, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';

//hooks
import { useIsTablet } from '../../hooks/useIsTablet';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchGroupDetail, leaveGroup, deleteGroup, transferOwnership, fetchBlockedUsers, blockUser, unblockUser, getOptimizedImageUrl } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { useSocket } from '../../hooks/useSocket';
import { useSocketRoom } from '../../hooks/useSocketRoom';

const GroupDetailScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute();
    const queryClient = useQueryClient();
    const { groupId } = route.params as { groupId: string };
    const { user: currentUser } = useAuthStore();
    const isTablet = useIsTablet();
    const socket = useSocket();
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showModMenu, setShowModMenu] = useState(false);
    const [modTargetUser, setModTargetUser] = useState<{ id: string, name: string, isBlocked: boolean } | null>(null);
    const [profileTargetUser, setProfileTargetUser] = useState<{ name: string, phone: string, avatar_url: string } | null>(null);
    const [showCoverModal, setShowCoverModal] = useState(false);

    const { data, isLoading, isRefetching, error, refetch } = useQuery({
        queryKey: ['group', groupId],
        queryFn: () => fetchGroupDetail(groupId),
    });

    const { data: blockedUsers, refetch: refetchBlocked } = useQuery({
        queryKey: ['blockedUsers'],
        queryFn: fetchBlockedUsers
    });

    useSocketRoom('join_group', groupId);

    useFocusEffect(
        useCallback(() => {
            if (!socket) return;

            const handleGroupEvent = (event: any) => {
                if (event.payload?.groupId === groupId) {
                    queryClient.invalidateQueries({ queryKey: ['group', groupId] });
                }
            };

            socket.on('group_event', handleGroupEvent);

            return () => {
                socket.off('group_event', handleGroupEvent);
            };
        }, [socket, groupId, queryClient])
    );

    const leaveMutation = useMutation({
        mutationFn: () => leaveGroup(groupId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            navigation.replace('GroupList');
        },
        onError: (err: any) => {
            Alert.alert('Error', err?.response?.data?.error || 'Failed to leave group');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: () => deleteGroup(groupId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            navigation.replace('GroupList');
        },
        onError: (err: any) => {
            Alert.alert('Error', err?.response?.data?.error || 'Failed to delete group');
        }
    });

    const transferMutation = useMutation({
        mutationFn: (newAdminId: string) => transferOwnership(groupId, newAdminId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['group', groupId] });
            setShowTransferModal(false);
            Alert.alert('Success', 'Ownership transferred. You are now a member.', [
                { text: 'Confirm & Leave', onPress: () => leaveMutation.mutate() },
                { text: 'Stay as Member', style: 'cancel' }
            ]);
        },
        onError: (err: any) => {
            Alert.alert('Error', err?.response?.data?.error || 'Failed to transfer ownership');
        }
    });

    const toggleBlock = async (memberId: string, name: string, currentlyBlocked: boolean) => {
        Alert.alert(
            currentlyBlocked ? 'Unblock User' : 'Block User',
            currentlyBlocked
                ? `Do you want to see photos from ${name} again?`
                : `Are you sure you want to block ${name}? You will no longer see their photos in any shared group gallery.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: currentlyBlocked ? 'Unblock' : 'Block User',
                    style: currentlyBlocked ? 'default' : 'destructive',
                    onPress: async () => {
                        try {
                            if (currentlyBlocked) {
                                await unblockUser(memberId);
                            } else {
                                await blockUser(memberId);
                            }
                            queryClient.invalidateQueries({ queryKey: ['blockedUsers'] });
                            queryClient.invalidateQueries({ queryKey: ['memories'] });
                            Alert.alert('Success', `User ${currentlyBlocked ? 'unblocked' : 'blocked'} successfully.`);
                        } catch (err: any) {
                            Alert.alert('Error', 'Failed to update block status.');
                        }
                    }
                }
            ]
        );
    };

    const handleShareLink = async () => {
        if (!data?.group.invite_code) return;
        try {
            // Universal web link (opens app directly if installed, fallback to web page)
            const webUrl = `https://api.mandaliapp.com/join/${data.group.invite_code}`;
            const inviterName = currentUser?.name || 'Someone';
            const message = `${inviterName} invited you to ${data.group.name} on Mandali\n\n📸 Share memories\n🎮 Play Games together\n💸 Split expenses\n\nJoin Group → ${webUrl}`;

            await Share.share({
                message,
            });
        } catch (err) {
            console.error('[Share] Error:', err);
        }
    };

    const handleLeaveOrDelete = () => {
        const { group, members, myRole } = data!;
        const isAdmin = myRole === 'admin';
        const memberCount = members.length;

        if (isAdmin) {
            if (memberCount === 1) {
                Alert.alert(
                    'Delete Mandali',
                    'You are the only member. This will permanently delete the group and all its memories. Continue?',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete Mandali', style: 'destructive', onPress: () => deleteMutation.mutate() }
                    ]
                );
            } else {
                setShowTransferModal(true);
            }
        } else {
            Alert.alert(
                'Leave Mandali',
                'Are you sure you want to leave this circle?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Leave', style: 'destructive', onPress: () => leaveMutation.mutate() }
                ]
            );
        }
    };

    if (isLoading) {
        return (
            <View className="flex-1 bg-background items-center justify-center">
                <ActivityIndicator color="#b30069" size="large" />
            </View>
        );
    }

    if (error || !data) {
        return (
            <View className="flex-1 bg-background items-center justify-center p-6">
                <Text className="text-on-surface font-headline-bold text-lg mb-4 text-center">Failed to load Mandali</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} className="bg-primary px-6 py-3 rounded-full">
                    <Text className="text-white font-headline-bold">Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const { group, members, myRole } = data;
    const isAdmin = myRole === 'admin';

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            {/* Header */}
            <View className={`flex-row items-center justify-between px-6 ${isTablet ? 'py-8' : 'py-4'}`}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className={`items-center justify-center bg-white shadow-sm border border-stone-100 rounded-full ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}
                >
                    <MaterialIcons name="arrow-back" size={isTablet ? 32 : 24} color="#594048" />
                </TouchableOpacity>
                <Text
                    className="flex-1 text-center font-headline-bold text-primary mx-2"
                    style={{ fontSize: isTablet ? 36 : 20 }}
                    adjustsFontSizeToFit
                    numberOfLines={1}
                >
                    Mandali
                </Text>
                {isAdmin ? (
                    <TouchableOpacity
                        onPress={() => navigation.navigate('CreateGroup', { group, returnTo: { screen: 'GroupDetail' } })}
                        className={`bg-primary/10 rounded-full flex-row items-center ${isTablet ? 'px-10 py-5' : 'px-4 py-2'}`}
                    >
                        <Feather name="edit-3" size={isTablet ? 24 : 14} color="#b30069" />
                        <Text className={`text-primary font-body-bold ml-2 ${isTablet ? 'text-2xl' : 'text-[13px]'}`}>Edit</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: isTablet ? 80 : 44 }} />
                )}
            </View>

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
                refreshControl={
                    <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#b30069" />
                }
            >
                {/* Hero Cover Image */}
                <View
                    style={{ height: isTablet ? 550 : 320 }}
                    className="w-full rounded-[48px] overflow-hidden mt-6 mb-12 shadow-2xl shadow-black/20 bg-stone-100"
                >
                    <Pressable onPress={() => setShowCoverModal(true)} style={{ width: '100%', height: '100%' }}>
                        {group.cover_photo_url ? (
                            <Image
                                source={{ uri: getOptimizedImageUrl(group.cover_photo_url, 'w_800,q_auto,f_auto') }}
                                style={{ width: '100%', height: '100%' }}
                                contentFit="cover"
                                contentPosition="top"
                            />
                        ) : (
                            <View className="w-full h-full bg-[#fcecf2] items-center justify-center">
                                <Ionicons name="people" size={isTablet ? 200 : 100} color="#b30069" style={{ opacity: 0.15 }} />
                            </View>
                        )}
                    </Pressable>

                    {/* Gradient Overlay for Text Readability */}
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.95)']}
                        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '75%', justifyContent: 'flex-end', padding: isTablet ? 60 : 24 }}
                        pointerEvents="none"
                    >
                        <Text
                            className="text-white font-headline-bold mb-4 leading-tight"
                            style={{ fontSize: isTablet ? 92 : 36 }}
                            numberOfLines={2}
                            adjustsFontSizeToFit
                        >
                            {group.name}
                        </Text>
                        <View className="flex-row items-center">
                            <Text className={`text-white font-body-bold ${isTablet ? 'text-3xl' : 'text-[15px]'}`}>
                                {members.length} {members.length === 1 ? 'Member' : 'Members'}
                            </Text>
                            <Text className={`text-white/60 font-body-medium mx-4 ${isTablet ? 'text-3xl' : 'text-[15px]'}`}>•</Text>
                            <Text className={`text-white font-body-bold ${isTablet ? 'text-3xl' : 'text-[15px]'}`}>
                                Since {group.created_at ? new Date(group.created_at).getFullYear() : new Date().getFullYear()}
                            </Text>
                        </View>
                    </LinearGradient>
                </View>

                {/* Group Info Card */}
                {group.description && (
                    <View className={`bg-stone-50 rounded-[48px] mb-12 border border-stone-100 ${isTablet ? 'p-16' : 'p-6'}`}>
                        <Text className={`font-body-bold text-primary mb-6 uppercase tracking-[2px] opacity-60 ${isTablet ? 'text-2xl' : 'text-[13px]'}`}>
                            About our Mandali
                        </Text>
                        <Text className={`font-body-medium text-on-surface-variant ${isTablet ? 'text-3xl leading-relaxed' : 'text-[17px] leading-6'}`}>
                            {group.description}
                        </Text>
                    </View>
                )}

                {/* Main Actions */}
                <View
                    style={{ gap: 16 }}
                    className={isTablet ? "flex-row flex-wrap" : "gap-4"}
                >
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Memories', { screen: 'MemoriesHome', params: { groupId: group.id } })}
                        style={{ flex: isTablet ? 1 : undefined, minWidth: isTablet ? '45%' : '100%', height: isTablet ? 180 : 84 }}
                        className={`bg-[#fcecf2] rounded-[32px] flex-row items-center border border-primary/5 shadow-sm ${isTablet ? 'px-8' : 'px-6'}`}
                    >
                        <View className={`bg-white rounded-[24px] items-center justify-center mr-6 shadow-sm shadow-primary/10 ${isTablet ? 'w-24 h-24' : 'w-12 h-12'}`}>
                            <Ionicons name="images" size={isTablet ? 48 : 24} color="#b30069" />
                        </View>
                        <View className="flex-1">
                            <Text
                                className="font-headline-bold text-[#b30069]"
                                style={{ fontSize: isTablet ? 36 : 18 }}
                                adjustsFontSizeToFit
                                numberOfLines={1}
                            >Shared Memories</Text>
                            <Text className={`text-[#b30069]/60 font-body-medium ${isTablet ? 'text-xl mt-1.5' : 'text-xs'}`}>Relive your best moments</Text>
                        </View>
                        <MaterialIcons name="chevron-right" size={isTablet ? 42 : 20} color="#b3006969" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => navigation.navigate('Games', { screen: 'GameSelection', params: { groupId: group.id } })}
                        style={{ flex: isTablet ? 1 : undefined, minWidth: isTablet ? '45%' : '100%', height: isTablet ? 180 : 84 }}
                        className={`bg-[#b30069] rounded-[32px] flex-row items-center shadow-lg shadow-primary/25 ${isTablet ? 'px-8' : 'px-6'}`}
                    >
                        <View className={`bg-white rounded-[24px] items-center justify-center mr-6 ${isTablet ? 'w-24 h-24' : 'w-12 h-12'}`}>
                            <Ionicons name="game-controller" size={isTablet ? 48 : 24} color="#b30069" />
                        </View>
                        <View className="flex-1">
                            <Text
                                className="font-headline-bold text-white"
                                style={{ fontSize: isTablet ? 36 : 18 }}
                                adjustsFontSizeToFit
                                numberOfLines={1}
                            >Games</Text>
                            <Text className={`text-white/60 font-body-medium ${isTablet ? 'text-xl mt-1.5' : 'text-xs'}`}>Gather everyone for games</Text>
                        </View>
                        <MaterialIcons name="chevron-right" size={isTablet ? 42 : 20} color="white" style={{ opacity: 0.6 }} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={handleShareLink}
                        style={{ width: '100%', height: isTablet ? 180 : 84 }}
                        className={`bg-[#1c1c18] rounded-[32px] flex-row items-center shadow-lg shadow-black/15 ${isTablet ? 'px-8' : 'px-6'}`}
                    >
                        <View className={`bg-white/10 rounded-[24px] items-center justify-center mr-6 ${isTablet ? 'w-24 h-24' : 'w-12 h-12'}`}>
                            <Ionicons name="share-social" size={isTablet ? 48 : 24} color="white" />
                        </View>
                        <View className="flex-1">
                            <Text
                                className="font-headline-bold text-white"
                                style={{ fontSize: isTablet ? 36 : 18 }}
                                adjustsFontSizeToFit
                                numberOfLines={1}
                            >Invite Members</Text>
                            <Text className={`text-white/60 font-body-medium ${isTablet ? 'text-xl mt-1.5' : 'text-xs'}`}>Expand your circle of trust</Text>
                        </View>
                        <View className={`bg-white/20 rounded-full ${isTablet ? 'px-8 py-4' : 'px-4 py-1.5'}`}>
                            <Text className={`text-white font-body-bold uppercase ${isTablet ? 'text-2xl' : 'text-[10px]'}`}>{group.invite_code}</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Members Section */}
                <View className="mt-16">
                    <View className="flex-row items-center justify-between mb-12">
                        <Text className={`font-headline-bold text-[#1c1c18] ${isTablet ? 'text-5xl' : 'text-xl'}`}>Members</Text>
                        <Text className={`text-stone-400 font-body-bold ${isTablet ? 'text-2xl' : 'text-sm'}`}>{members.length} Active</Text>
                    </View>

                    {members.map((member: any) => (
                        <TouchableOpacity
                            key={member.id}
                            className={`flex-row items-center mb-6 bg-white/50 rounded-[28px] border border-stone-100 ${isTablet ? 'p-8' : 'p-3'}`}
                            onPress={() => setProfileTargetUser({
                                name: member.users.name,
                                phone: member.users.phone || '',
                                avatar_url: member.users.avatar_url || ''
                            })}
                            activeOpacity={0.8}
                        >
                            <View className={`rounded-full overflow-hidden bg-stone-100 mr-6 border border-stone-200 ${isTablet ? 'w-20 h-20' : 'w-12 h-12'}`}>
                                {member.users.avatar_url ? (
                                    <Image source={{ uri: getOptimizedImageUrl(member.users.avatar_url, 'w_150,q_auto,f_auto') }} style={{ width: '100%', height: '100%' }} />
                                ) : (
                                    <View className="w-full h-full items-center justify-center">
                                        <Text className={`text-primary font-headline-bold ${isTablet ? 'text-3xl' : ''}`}>{member.users.name.charAt(0)}</Text>
                                    </View>
                                )}
                            </View>
                            <View className="flex-1">
                                <Text className={`font-headline-bold text-[#1c1c18] ${isTablet ? 'text-3xl' : 'text-[16px]'}`}>{member.users.name}</Text>
                                <Text className={`font-body-bold text-[#a09d96] uppercase tracking-wider ${isTablet ? 'text-lg mt-1.5' : 'text-[11px]'}`}>
                                    {member.role === 'admin' ? 'Founder' : 'Member'}
                                </Text>
                            </View>

                            {member.role === 'admin' && (
                                <View className={`bg-primary/5 rounded-2xl ${isTablet ? 'p-5' : 'p-2'}`}>
                                    <Feather name="shield" size={isTablet ? 32 : 12} color="#b30069" />
                                </View>
                            )}

                            {/* THREE DOTS MODERATION MENU */}
                            {member.user_id !== currentUser?.id && (
                                <TouchableOpacity
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        const isBlocked = blockedUsers?.includes(member.user_id);
                                        setModTargetUser({ id: member.user_id, name: member.users.name, isBlocked: !!isBlocked });
                                        setShowModMenu(true);
                                    }}
                                    className={`rounded-full items-center justify-center ${isTablet ? 'w-16 h-16 ml-4' : 'w-10 h-10 ml-2'}`}
                                >
                                    <View className="bg-stone-50 rounded-full w-full h-full items-center justify-center border border-stone-100">
                                        <Ionicons name="ellipsis-vertical" size={isTablet ? 32 : 18} color="#594048" />
                                    </View>
                                </TouchableOpacity>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                {/* MODERATION MENU MODAL */}
                <Modal
                    visible={showModMenu}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowModMenu(false)}
                >
                    <Pressable className="flex-1 bg-black/40 justify-end" onPress={() => setShowModMenu(false)}>
                        <Pressable className="bg-white rounded-t-[40px] p-8 pb-12" onPress={e => e.stopPropagation()}>
                            <View className="w-12 h-1.5 bg-stone-100 rounded-full self-center mb-8" />

                            <View className="mb-8">
                                <Text className="text-2xl font-headline-bold text-[#1c1c18]">{modTargetUser?.name}</Text>
                                <Text className="text-stone-400 font-body-medium">Mandali Member Safety Options</Text>
                            </View>

                            <TouchableOpacity
                                onPress={() => {
                                    setShowModMenu(false);
                                    if (modTargetUser) {
                                        toggleBlock(modTargetUser.id, modTargetUser.name, modTargetUser.isBlocked);
                                    }
                                }}
                                className={`flex-row items-center p-5 rounded-3xl border border-stone-100 mb-4 ${modTargetUser?.isBlocked ? 'bg-primary/5' : 'bg-red-50'}`}
                            >
                                <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${modTargetUser?.isBlocked ? 'bg-primary/10' : 'bg-red-100'}`}>
                                    <Ionicons
                                        name={modTargetUser?.isBlocked ? "person-add-outline" : "person-remove-outline"}
                                        size={24}
                                        color={modTargetUser?.isBlocked ? "#b30069" : "#dc2626"}
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className={`font-headline-bold text-lg ${modTargetUser?.isBlocked ? 'text-primary' : 'text-red-600'}`}>
                                        {modTargetUser?.isBlocked ? 'Unblock User' : 'Block User'}
                                    </Text>
                                    <Text className="text-stone-400 text-xs font-body-medium">
                                        {modTargetUser?.isBlocked ? "Allow their photos back into your gallery" : "Hide their photos from your group gallery"}
                                    </Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => setShowModMenu(false)} className="mt-4 p-4 items-center">
                                <Text className="text-stone-300 font-headline-bold uppercase tracking-widest text-xs">Cancel</Text>
                            </TouchableOpacity>
                        </Pressable>
                    </Pressable>
                </Modal>

                {/* USER PROFILE MODAL */}
                <Modal
                    visible={!!profileTargetUser}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setProfileTargetUser(null)}
                >
                    <Pressable className="flex-1 bg-black/70 justify-center items-center p-6" onPress={() => setProfileTargetUser(null)}>
                        <Pressable className="bg-white rounded-[40px] overflow-hidden w-full max-w-sm shadow-2xl" onPress={e => e.stopPropagation()}>
                            {/* Pinch-zoomable profile photo */}
                            <View style={{ width: '100%', aspectRatio: 1, backgroundColor: '#f5f0e8' }}>
                                {profileTargetUser?.avatar_url ? (
                                    <ScrollView
                                        contentContainerStyle={{ flex: 1 }}
                                        maximumZoomScale={4}
                                        minimumZoomScale={1}
                                        showsVerticalScrollIndicator={false}
                                        showsHorizontalScrollIndicator={false}
                                        centerContent
                                        bouncesZoom
                                        style={{ width: '100%', height: '100%' }}
                                    >
                                        <Image
                                            source={{ uri: profileTargetUser.avatar_url }}
                                            style={{ width: '100%', aspectRatio: 1 }}
                                            contentFit="cover"
                                        />
                                    </ScrollView>
                                ) : (
                                    <View className="w-full h-full items-center justify-center bg-primary/5">
                                        <Text className={`text-primary font-headline-bold ${isTablet ? 'text-[120px]' : 'text-[80px]'}`}>{profileTargetUser?.name?.charAt(0)}</Text>
                                    </View>
                                )}
                            </View>

                            {/* Info section */}
                            <View className={`items-center ${isTablet ? 'p-10' : 'p-6'}`}>
                                <Text className={`font-headline-bold text-[#1c1c18] text-center mb-2 ${isTablet ? 'text-4xl' : 'text-2xl'}`}>{profileTargetUser?.name}</Text>
                                {profileTargetUser?.phone ? (
                                    <View className="flex-row items-center mt-2 bg-stone-50 px-5 py-3 rounded-full border border-stone-100">
                                        <Ionicons name="call" size={16} color="#b30069" />
                                        <Text className={`font-body-medium text-stone-600 ml-2 ${isTablet ? 'text-xl' : 'text-base'}`}>{profileTargetUser.phone}</Text>
                                    </View>
                                ) : (
                                    <View className="flex-row items-center mt-2 bg-stone-50 px-5 py-3 rounded-full border border-stone-100">
                                        <Ionicons name="call-outline" size={16} color="#a8a29e" />
                                        <Text className={`font-body-medium text-stone-400 ml-2 ${isTablet ? 'text-xl' : 'text-base'}`}>No number shared</Text>
                                    </View>
                                )}
                                <TouchableOpacity onPress={() => setProfileTargetUser(null)} className="mt-6 bg-stone-100 px-10 py-3 rounded-full">
                                    <Text className="text-stone-600 font-headline-bold">Close</Text>
                                </TouchableOpacity>
                            </View>
                        </Pressable>
                    </Pressable>
                </Modal>

                <View className="mt-12 pt-8 border-t border-stone-100">
                    <TouchableOpacity
                        onPress={handleLeaveOrDelete}
                        style={{ height: isTablet ? 110 : 64 }}
                        className="bg-red-50 rounded-[32px] items-center justify-center flex-row border border-red-100"
                    >
                        <MaterialIcons
                            name={isAdmin && members.length === 1 ? "delete-sweep" : "exit-to-app"}
                            size={isTablet ? 32 : 20}
                            color="#dc2626"
                        />
                        <Text className={`text-red-600 font-headline-bold ml-3 ${isTablet ? 'text-2xl' : 'text-[16px]'}`}>
                            {isAdmin && members.length === 1 ? 'Permanently Delete Mandali' : 'Leave This Mandali'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* MANDALI PHOTO MODAL */}
                <Modal
                    visible={showCoverModal}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowCoverModal(false)}
                >
                    <Pressable className="flex-1 bg-black/90 justify-center items-center" onPress={() => setShowCoverModal(false)}>
                        <View style={{ width: '100%', height: '100%' }}>
                            {group.cover_photo_url ? (
                                <ScrollView
                                    contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
                                    maximumZoomScale={5}
                                    minimumZoomScale={1}
                                    showsVerticalScrollIndicator={false}
                                    showsHorizontalScrollIndicator={false}
                                    centerContent
                                    bouncesZoom
                                    style={{ width: '100%', height: '100%' }}
                                >
                                    <Image
                                        source={{ uri: group.cover_photo_url }}
                                        style={{ width: '100%', height: undefined, aspectRatio: 1 }}
                                        contentFit="contain"
                                    />
                                </ScrollView>
                            ) : (
                                <View className="flex-1 items-center justify-center bg-primary/5">
                                    <Text className={`text-primary font-headline-bold ${isTablet ? 'text-[120px]' : 'text-[80px]'}`}>{group.name?.charAt(0)}</Text>
                                </View>
                            )}

                            {/* Close button overlay */}
                            <TouchableOpacity
                                onPress={() => setShowCoverModal(false)}
                                className="absolute top-16 right-8 w-12 h-12 bg-white/10 rounded-full items-center justify-center border border-white/20"
                            >
                                <Ionicons name="close" size={28} color="white" />
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Modal>
            </ScrollView>

            {/* Transfer Ownership Modal */}
            <Modal
                visible={showTransferModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowTransferModal(false)}
            >
                <Pressable
                    className="flex-1 bg-black/40 justify-end"
                    onPress={() => setShowTransferModal(false)}
                >
                    <Pressable
                        className="bg-[#FDF9F3] rounded-t-[40px] p-8 pb-12 shadow-2xl"
                        onPress={e => e.stopPropagation()}
                    >
                        <View className="w-12 h-1.5 bg-stone-200 rounded-full self-center mb-8" />

                        <Text className="text-[32px] font-headline-bold text-[#b30069] mb-2">Assign New Founder</Text>
                        <Text className="text-[15px] font-body-medium text-stone-500 mb-8 leading-5">
                            Before you leave, please choose who will lead this Mandali gathering.
                        </Text>

                        <ScrollView className="max-h-[350px] mb-8" showsVerticalScrollIndicator={false}>
                            {members.filter((m: any) => m.user_id !== currentUser?.id).map((m: any) => (
                                <TouchableOpacity
                                    key={m.user_id}
                                    onPress={() => transferMutation.mutate(m.user_id)}
                                    className="flex-row items-center p-4 mb-3 bg-white rounded-3xl border border-stone-100 shadow-sm"
                                >
                                    <View className="w-14 h-14 rounded-full overflow-hidden bg-stone-50 mr-4 border border-stone-100">
                                        {m.users.avatar_url ? (
                                            <Image source={{ uri: getOptimizedImageUrl(m.users.avatar_url, 'w_150,q_auto,f_auto') }} className="w-full h-full" />
                                        ) : (
                                            <View className="w-full h-full items-center justify-center bg-primary/5">
                                                <Text className="text-primary font-headline-bold text-lg">{m.users.name.charAt(0)}</Text>
                                            </View>
                                        )}
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-lg font-headline-bold text-[#1c1c18]">{m.users.name}</Text>
                                        <Text className="text-[13px] font-body-medium text-stone-400">Current Member</Text>
                                    </View>
                                    <View className="w-10 h-10 rounded-full bg-primary/5 items-center justify-center">
                                        <MaterialIcons name="stars" size={24} color="#b30069" />
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <TouchableOpacity
                            onPress={() => setShowTransferModal(false)}
                            style={{ height: isTablet ? 100 : 80 }}
                            className="rounded-[32px] items-center justify-center bg-stone-100 shadow-sm"
                        >
                            <Text className={`text-[#594048] font-headline-bold ${isTablet ? 'text-2xl' : 'text-[16px]'}`}>Cancel</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
};

export default GroupDetailScreen;
