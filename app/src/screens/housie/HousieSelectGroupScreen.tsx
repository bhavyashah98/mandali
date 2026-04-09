import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { fetchGroups } from '../../lib/api';

const HousieSelectGroupScreen = () => {
    const navigation = useNavigation<any>();
    const { data: groups, isLoading } = useQuery({
        queryKey: ['groups'],
        queryFn: fetchGroups
    });

    const renderEmptyState = () => (
        <View className="flex-1 items-center justify-center px-8">
            <View className="w-24 h-24 rounded-full bg-primary/5 items-center justify-center mb-6">
                <MaterialIcons name="group-off" size={48} color="#b30069" />
            </View>
            <Text className="text-2xl font-headline-bold text-on-surface text-center mb-3">No Mandali Found!</Text>
            <Text className="text-on-surface-variant text-center font-body-medium mb-10 leading-5">
                Housie is better with friends and family. Create or join a Mandali to start your first session!
            </Text>

            <View className="w-full gap-4">
                <TouchableOpacity
                    onPress={() => navigation.navigate('Groups', { screen: 'CreateGroup' })}
                    className="bg-primary h-16 rounded-2xl flex-row items-center justify-center shadow-lg shadow-primary/30"
                >
                    <Ionicons name="add-circle" size={24} color="white" />
                    <Text className="text-white font-headline-bold text-lg ml-2">Create New Mandali</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => navigation.navigate('Groups', { screen: 'JoinGroup' })}
                    className="h-16 rounded-2xl border border-primary/20 flex-row items-center justify-center"
                >
                    <Ionicons name="enter" size={24} color="#b30069" />
                    <Text className="text-primary font-headline-bold text-lg ml-2">Join Existing Mandali</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderGroupItem = ({ item, index }: { item: any, index: number }) => {
        // Preset colors for group icons to match the requested look
        const bgColors = ['bg-green-100', 'bg-blue-100', 'bg-purple-100', 'bg-orange-100'];
        const iconColors = ['#2e7d32', '#1565c0', '#6a1b9a', '#ef6c00'];
        const bgColor = bgColors[index % bgColors.length];
        const iconColor = iconColors[index % iconColors.length];

        return (
            <TouchableOpacity
                onPress={() => navigation.navigate('HousieLobby', { groupId: item.id })}
                className="bg-white rounded-[32px] p-6 mb-5 flex-row items-center shadow-xl shadow-black/[0.03] border border-stone-50"
            >
                {/* Circular Icon with Background */}
                <View className={`w-20 h-20 rounded-full ${bgColor} items-center justify-center overflow-hidden`}>
                    {item.cover_photo_url ? (
                        <Image
                            source={{ uri: item.cover_photo_url }}
                            className="w-full h-full"
                            resizeMode="cover"
                        />
                    ) : (
                        <MaterialIcons name="group" size={36} color={iconColor} />
                    )}
                </View>

                <View className="ml-6 flex-1">
                    <Text className="text-2xl font-headline-bold text-on-surface mb-1" numberOfLines={1}>
                        {item.name}
                    </Text>
                    <View className="flex-row items-center">
                        <MaterialIcons name="people-outline" size={16} color="#594048" />
                        <Text className="text-base text-stone-500 font-body-medium ml-2">
                            {item.memberCount} Members
                        </Text>
                    </View>
                </View>
                <MaterialIcons name="chevron-right" size={28} color="#e6d9d0" />
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top']}>
            <View className="px-6 py-4 flex-row items-center justify-between">
                <View>
                    <Text className="text-stone-400 font-body-bold text-[10px] uppercase tracking-[3px] mb-1">Mandali Choice</Text>
                    <Text className="text-2xl font-headline-bold text-primary">Pick a Mandali</Text>
                </View>
                <TouchableOpacity className="w-10 h-10 rounded-full bg-white items-center justify-center shadow-sm">
                    <MaterialIcons name="search" size={22} color="#594048" />
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator color="#b30069" size="large" />
                </View>
            ) : groups?.length === 0 ? (
                renderEmptyState()
            ) : (
                <FlatList
                    data={groups}
                    renderItem={renderGroupItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );
};

export default HousieSelectGroupScreen;
