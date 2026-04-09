import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Share, Alert, Modal, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchGroupDetail, leaveGroup, deleteGroup, transferOwnership } from '../../lib/api';
import { Image } from 'expo-image';
import { useAuthStore } from '../../stores/authStore';

const GroupDetailScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute();
    const queryClient = useQueryClient();
    const { groupId } = route.params as { groupId: string };
    const { user: currentUser } = useAuthStore();
    const [showTransferModal, setShowTransferModal] = useState(false);

    const { data, isLoading, isRefetching, error, refetch } = useQuery({
        queryKey: ['group', groupId],
        queryFn: () => fetchGroupDetail(groupId),
    });

    const leaveMutation = useMutation({
        mutationFn: () => leaveGroup(groupId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            navigation.navigate('GroupList');
        },
        onError: (err: any) => {
            Alert.alert('Error', err?.response?.data?.error || 'Failed to leave group');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: () => deleteGroup(groupId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            navigation.navigate('GroupList');
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

    const handleShareLink = async () => {
        if (!data?.group.invite_code) return;
        try {
            await Share.share({
                message: `Join our Mandali circle! Use this invite code: ${data.group.invite_code}`,
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
            <View className="flex-row items-center justify-between px-6 py-4">
                <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 items-center justify-center bg-stone-50 rounded-full">
                    <MaterialIcons name="arrow-back" size={22} color="#594048" />
                </TouchableOpacity>
                <View className="w-10 h-10 rounded-[32px] overflow-hidden border-4 border-white shadow-xl bg-stone-50 shadow-black/5">
                    {group.cover_photo_url ? (
                        <Image
                            source={{ uri: group.cover_photo_url }}
                            style={{ width: '100%', height: '100%' }}
                            contentFit="cover"
                        />
                    ) : (
                        <View className="w-full h-full items-center justify-center">
                            <Text className="text-primary font-headline-bold text-[32px]">{group.name.charAt(0)}</Text>
                        </View>
                    )}
                </View>
                <Text className="text-xl font-headline-bold text-primary flex-1 text-left mx-2" numberOfLines={1}>
                    {group.name}
                </Text>
                {isAdmin ? (
                    <TouchableOpacity
                        onPress={() => navigation.navigate('CreateGroup', { group })}
                        className="bg-primary/10 px-4 py-2 rounded-full flex-row items-center"
                    >
                        <Feather name="edit-3" size={14} color="#b30069" />
                        <Text className="text-primary font-body-bold text-[13px] ml-1.5">Edit</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 44 }} />
                )}
            </View>

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
                refreshControl={
                    <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#b30069" />
                }
            >
                {/* Branding Avatar */}

                {/* Group Info Card */}
                {group.description && (
                    <View className="bg-stone-50 rounded-[32px] p-6 mb-8 border border-stone-100">
                        <Text className="text-[13px] font-body-bold text-primary mb-2 uppercase tracking-[1px] opacity-60">
                            About our Mandali
                        </Text>
                        <Text className="text-[17px] font-body-medium text-on-surface-variant leading-6">
                            {group.description}
                        </Text>
                    </View>
                )}

                {/* Main Actions */}
                <View className="gap-4">
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Memories', { screen: 'MemoriesHome', params: { groupId: group.id } })}
                        className="bg-[#fcecf2] rounded-[24px] p-6 flex-row items-center border border-primary/5 shadow-sm"
                    >
                        <View className="w-12 h-12 bg-white rounded-xl items-center justify-center mr-4 shadow-sm shadow-primary/10">
                            <Ionicons name="images" size={24} color="#b30069" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-lg font-headline-bold text-[#b30069]">Shared Memories</Text>
                            <Text className="text-[#b30069]/60 text-xs font-body-medium">Relive your best moments</Text>
                        </View>
                        <MaterialIcons name="chevron-right" size={20} color="#b3006969" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => navigation.navigate('Housie', { screen: 'HousieLobby', params: { groupId: group.id } })}
                        className="bg-[#b30069] rounded-[24px] p-6 flex-row items-center shadow-lg shadow-primary/20"
                    >
                        <View className="w-12 h-12 bg-white rounded-xl items-center justify-center mr-4">
                            <Ionicons name="game-controller" size={24} color="#b30069" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-lg font-headline-bold text-white">Housie Gathering</Text>
                            <Text className="text-white/60 text-xs font-body-medium">Gather everyone for a game</Text>
                        </View>
                        <MaterialIcons name="chevron-right" size={20} color="white" opacity={0.6} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleShareLink}
                        className="bg-[#1c1c18] rounded-[24px] p-6 flex-row items-center shadow-lg shadow-black/10"
                    >
                        <View className="w-12 h-12 bg-white/10 rounded-xl items-center justify-center mr-4">
                            <Ionicons name="share-social" size={24} color="white" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-lg font-headline-bold text-white">Invite Members</Text>
                            <Text className="text-white/60 text-xs font-body-medium">Expand your circle of trust</Text>
                        </View>
                        <View className="bg-white/20 px-3 py-1 rounded-full">
                            <Text className="text-white font-body-bold text-[10px] uppercase">{group.invite_code}</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Members Section */}
                <View className="mt-12">
                    <View className="flex-row items-center justify-between mb-6">
                        <Text className="text-xl font-headline-bold text-[#1c1c18]">Members</Text>
                        <Text className="text-stone-400 font-body-bold text-sm">{members.length} Active</Text>
                    </View>

                    {members.map((member: any) => (
                        <View key={member.id} className="flex-row items-center mb-4 bg-white/50 p-3 rounded-2xl border border-stone-100">
                            <View className="w-12 h-12 rounded-full overflow-hidden bg-stone-100 mr-4 border border-stone-200">
                                {member.users.avatar_url ? (
                                    <Image source={{ uri: member.users.avatar_url }} className="w-full h-full" />
                                ) : (
                                    <View className="w-full h-full items-center justify-center">
                                        <Text className="text-primary font-headline-bold">{member.users.name.charAt(0)}</Text>
                                    </View>
                                )}
                            </View>
                            <View className="flex-1">
                                <Text className="text-[16px] font-headline-bold text-[#1c1c18]">{member.users.name}</Text>
                                <Text className="text-[11px] font-body-bold text-[#a09d96] uppercase tracking-wider">
                                    {member.role === 'admin' ? 'Founder' : 'Member'}
                                </Text>
                            </View>
                            {member.role === 'admin' && (
                                <View className="bg-primary/5 px-2 py-1 rounded-md">
                                    <Feather name="shield" size={12} color="#b30069" />
                                </View>
                            )}
                        </View>
                    ))}
                </View>

                {/* Danger Zone */}
                <View className="mt-12 pt-8 border-t border-stone-100">
                    <TouchableOpacity
                        onPress={handleLeaveOrDelete}
                        className="bg-red-50 h-16 rounded-[24px] items-center justify-center border border-red-100"
                    >
                        <Text className="text-red-600 font-headline-bold text-[16px]">
                            {isAdmin && members.length === 1 ? 'Permanently Delete Mandali' : 'Leave This Mandali'}
                        </Text>
                    </TouchableOpacity>
                </View>
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
                                            <Image source={{ uri: m.users.avatar_url }} className="w-full h-full" />
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
                            className="h-16 rounded-[24px] items-center justify-center bg-stone-100 shadow-sm"
                        >
                            <Text className="text-[#594048] font-headline-bold text-[16px]">Cancel</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
};

export default GroupDetailScreen;
