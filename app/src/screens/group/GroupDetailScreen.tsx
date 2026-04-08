import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { fetchGroupDetail } from '../../lib/api';

const GroupDetailScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { groupId } = route.params as { groupId: string };

    const { data, isLoading, error } = useQuery({
        queryKey: ['group', groupId],
        queryFn: () => fetchGroupDetail(groupId),
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

    const { group, members } = data;

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            {/* Header */}
            <View className="flex-row items-center justify-between px-6 py-4">
                <View className="flex-row items-center">
                    <View className="w-10 h-10 rounded-full bg-primary/10 overflow-hidden mr-3">
                        {group.cover_photo_url ? (
                            <Image source={{ uri: group.cover_photo_url }} className="w-full h-full" />
                        ) : (
                             <View className="w-full h-full items-center justify-center">
                                <Text className="text-primary font-headline-bold">{group.name.charAt(0)}</Text>
                             </View>
                        )}
                    </View>
                    <Text className="text-2xl font-headline-bold text-primary" numberOfLines={1}>{group.name}</Text>
                </View>
                <TouchableOpacity className="w-10 h-10 items-center justify-center bg-surface-container rounded-full shadow-sm">
                    <MaterialIcons name="settings" size={22} color="#594048" />
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}>
                {/* Welcome Card */}
                <View className="bg-surface-container rounded-3xl p-8 mt-4 shadow-sm border border-black/5">
                    <Text className="text-[28px] font-headline-bold text-on-surface leading-8 mb-4">Gather round the hearth.</Text>
                    <Text className="text-lg font-body-regular text-on-surface-variant leading-6">
                        {group.description || 'Your small corner of the internet for memories and play.'}
                    </Text>
                </View>

                {/* Invite Card */}
                <View className="bg-primary rounded-[40px] p-8 mt-6 flex-row items-center relative overflow-hidden shadow-lg shadow-primary/20">
                    <View className="w-16 h-16 bg-white/20 rounded-full items-center justify-center mr-5">
                       <MaterialIcons name="share" size={28} color="white" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-xl font-headline-bold text-white mb-0.5">Invite Members</Text>
                        <Text className="text-white/80 font-body-medium">Expand your circle of trust.</Text>
                        
                        <TouchableOpacity 
                            onPress={handleShareLink}
                            className="bg-white rounded-full py-3 items-center justify-center mt-4 w-36 shadow-md"
                        >
                            <Text className="text-primary font-headline-bold text-[15px]">Share Link</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Members Section */}
                <View className="flex-row items-center justify-between mt-10 mb-6">
                    <Text className="text-2xl font-headline-bold text-on-surface">Members</Text>
                    <View className="bg-surface-container px-3 py-1.5 rounded-full">
                        <Text className="text-xs font-body-bold text-on-surface-variant">{members.length} Active</Text>
                    </View>
                </View>

                {/* Member List */}
                {members.map((member) => (
                    <View key={member.id} className="flex-row items-center bg-white rounded-3xl p-4 mb-3 shadow-sm border border-black/5">
                        <View className="w-14 h-14 rounded-full bg-surface-container overflow-hidden mr-4 border border-black/5">
                            {member.users.avatar_url ? (
                                <Image source={{ uri: member.users.avatar_url }} className="w-full h-full" />
                            ) : (
                                <View className="w-full h-full items-center justify-center">
                                    <Text className="text-lg font-headline-bold text-primary">{member.users.name.charAt(0)}</Text>
                                </View>
                            )}
                            {/* Role Badge on Avatar */}
                            {member.role === 'admin' && (
                                <View className="absolute bottom-0 right-0 w-6 h-6 bg-white rounded-full items-center justify-center shadow-sm">
                                    <MaterialIcons name="check-circle" size={18} color="#43a047" />
                                </View>
                            )}
                        </View>

                        <View className="flex-1">
                            <Text className="text-lg font-headline-bold text-on-surface leading-5">{member.users.name}</Text>
                            <Text className={`text-xs font-body-bold uppercase tracking-wider mt-0.5 ${member.role === 'admin' ? 'text-primary' : 'text-on-surface-variant'}`}>
                                {member.role === 'admin' ? 'Group Founder' : 'Member'}
                            </Text>
                        </View>

                        <TouchableOpacity className="w-10 h-10 items-center justify-center">
                            <MaterialIcons name="more-vert" size={24} color="#a09d96" />
                        </TouchableOpacity>
                    </View>
                ))}
            </ScrollView>

            {/* Bottom Nav Mock (Since it's probably part of a larger Tab system, but matches the UI screenshot) */}
            <View className="absolute bottom-6 left-6 right-6 h-18 bg-white/95 rounded-full flex-row items-center justify-around px-2 shadow-xl border border-black/5">
                <TouchableOpacity className="items-center px-4">
                    <MaterialIcons name="grid-view" size={24} color="#a09d96" />
                    <Text className="text-[10px] font-body-bold text-[#a09d96] mt-1">Play</Text>
                </TouchableOpacity>
                <TouchableOpacity className="items-center px-4">
                    <MaterialIcons name="photo-library" size={24} color="#a09d96" />
                    <Text className="text-[10px] font-body-bold text-[#a09d96] mt-1">Memories</Text>
                </TouchableOpacity>
                <View className="items-center px-6 py-2 bg-primary rounded-full min-w-[100px]">
                    <MaterialIcons name="group" size={24} color="white" />
                    <Text className="text-[10px] font-body-bold text-white mt-1">Group</Text>
                </View>
            </View>
        </SafeAreaView>
    );
};

export default GroupDetailScreen;
