import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { fetchGroups } from '../../lib/api';

const GroupListScreen = () => {
    const navigation = useNavigation<any>();

    const { data: groups = [], isLoading, isRefetching, refetch } = useQuery({
        queryKey: ['groups'],
        queryFn: fetchGroups,
    });

    const getIconInfo = (index: number) => {
        const icons = [
            { name: 'flower', color: '#b30069', bg: '#fdf0f4' },
            { name: 'utensils', color: '#8d6e3f', bg: '#fef3e3' },
            { name: 'graduation-cap', color: '#43a047', bg: '#e8f5e9' },
            { name: 'heart', color: '#d32f2f', bg: '#ffebee' },
            { name: 'home', color: '#1976d2', bg: '#e3f2fd' },
        ];
        return icons[index % icons.length];
    };

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            {/* Top Bar with Avatar and Settings */}
            <View className="flex-row items-center justify-between px-6 py-3">
                <View className="w-10 h-10 rounded-full overflow-hidden bg-surface-container">
                    <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' }} className="w-full h-full" />
                </View>
                <Text className="text-2xl font-headline-bold text-primary">Mandali</Text>
                <TouchableOpacity>
                    <Ionicons name="settings-outline" size={24} color="#594048" />
                </TouchableOpacity>
            </View>

            <ScrollView 
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 30, paddingBottom: 100 }}
                refreshControl={
                    <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#b30069" />
                }
            >
                {/* Header Section */}
                <View className="mb-10">
                    <Text className="text-[40px] font-headline-bold text-on-surface leading-tight mb-2">My Mandalis</Text>
                    <Text className="text-[17px] font-body-regular text-on-surface-variant">
                        Your digital hearths and gathering circles.
                    </Text>
                </View>

                {/* Loading state */}
                {isLoading && groups.length === 0 && (
                    <View className="py-10 items-center justify-center">
                        <ActivityIndicator color="#b30069" size="large" />
                    </View>
                )}

                {/* Groups List */}
                {groups.map((group: any, index: number) => {
                    const iconInfo = getIconInfo(index);
                    return (
                        <TouchableOpacity 
                            key={group.id}
                            onPress={() => navigation.navigate('GroupDetail', { groupId: group.id })}
                            activeOpacity={0.9}
                            className="bg-white rounded-[48px] p-8 mb-4 shadow-sm border border-black/5"
                            style={{
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.04,
                                shadowRadius: 10,
                                elevation: 2,
                            }}
                        >
                            <View className="flex-row items-center">
                                <View 
                                    className="w-[72px] h-[72px] rounded-full items-center justify-center mr-6"
                                    style={{ backgroundColor: iconInfo.bg }}
                                >
                                    {group.cover_photo_url ? (
                                        <Image source={{ uri: group.cover_photo_url }} className="w-full h-full rounded-full" />
                                    ) : (
                                        <FontAwesome5 name={iconInfo.name} size={24} color={iconInfo.color} />
                                    )}
                                </View>

                                <View className="flex-1">
                                    <Text className="text-2xl font-headline-bold text-on-surface mb-1">
                                        {group.name}
                                    </Text>
                                    <View className="flex-row items-center opacity-70">
                                        <MaterialIcons name="group" size={16} color="#594048" />
                                        <Text className="text-on-surface text-[15px] font-body-medium ml-2">
                                            {group.memberCount} Members
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                })}

                {/* Create Mandali Card */}
                <TouchableOpacity 
                    onPress={() => navigation.navigate('CreateGroup')}
                    activeOpacity={0.95}
                    className="bg-primary rounded-[56px] p-10 mt-6 mb-6 relative overflow-hidden shadow-xl shadow-primary/20"
                >
                    {/* Ghost Plus Background Icon */}
                    <View className="absolute top-[-20px] right-[-20px] opacity-10">
                        <MaterialIcons name="add" size={180} color="white" />
                    </View>

                    <Text className="text-[28px] font-headline-bold text-white mb-2">Create New Mandali</Text>
                    <Text className="text-[16px] font-body-regular text-white/90 leading-6 pr-10">
                        Start a new gathering place for your favorite people.
                    </Text>
                </TouchableOpacity>

                {/* Join Button */}
                <TouchableOpacity 
                    onPress={() => navigation.navigate('JoinGroup')}
                    className="bg-surface-container/40 h-[68px] rounded-full flex-row items-center justify-center mt-2 border border-black/5"
                >
                    <Ionicons name="link" size={22} color="#b30069" style={{ transform: [{ rotate: '-45deg' }] }} />
                    <Text className="text-on-surface font-body-bold text-lg ml-2">Join with Link</Text>
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
};

export default GroupListScreen;
