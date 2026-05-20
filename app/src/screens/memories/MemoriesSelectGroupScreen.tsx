import React, { useState, useMemo } from 'react';
import { useIsTablet } from '../../hooks/useIsTablet';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { fetchGroups } from '../../lib/api';
import { SearchBar } from '../../components/common/SearchBar';
import { MandaliCard } from '../../components/common/MandaliCard';

const MemoriesSelectGroupScreen = () => {
    const navigation = useNavigation<any>();
    const { width } = useWindowDimensions();
    const isTablet = useIsTablet();
    const [searchQuery, setSearchQuery] = useState('');

    const { data: groups, isLoading, isRefetching, refetch } = useQuery({
        queryKey: ['groups'],
        queryFn: fetchGroups
    });

    const filteredGroups = useMemo(() => {
        if (!groups) return [];
        
        let result = groups;
        if (searchQuery.trim()) {
            result = groups.filter((g: any) =>
                g.name?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        
        // Sort groups by memory count (highest first)
        return [...result].sort((a: any, b: any) => {
            const countA = a.memoryCount || 0;
            const countB = b.memoryCount || 0;
            return countB - countA; // Descending order
        });
    }, [groups, searchQuery]);

    const renderContextCards = () => (
        <View className={`gap-4 flex-1 w-full pb-12 ${isTablet ? 'mt-12' : 'mt-4'}`}>
            <View className={`h-[1px] bg-stone-200/80 w-full mb-${isTablet ? '12' : '4'} mt-2`} />
            <View className={`bg-primary/5 rounded-[32px] ${isTablet ? 'p-12' : 'p-5'}`}>
                <MaterialIcons name="photo-album" size={isTablet ? 48 : 24} color="#b30069" className="mb-4" />
                <Text className={`font-headline-bold text-[#1c1c18] mb-2 ${isTablet ? 'text-3xl' : 'text-[15px]'}`}>Shared Albums</Text>
                <Text className={`font-body-medium text-stone-500 leading-relaxed ${isTablet ? 'text-2xl' : 'text-[13px]'}`}>
                    Drop photos directly into the stream and let everyone in your Mandali circle relive the moments together.
                </Text>
            </View>
            <View className={`bg-primary/5 rounded-[32px] ${isTablet ? 'p-12' : 'p-5'}`}>
                <MaterialIcons name="calendar-month" size={isTablet ? 48 : 24} color="#b30069" className="mb-4" />
                <Text className={`font-headline-bold text-[#1c1c18] mb-2 ${isTablet ? 'text-3xl' : 'text-[15px]'}`}>Timeless Timeline</Text>
                <Text className={`font-body-medium text-stone-500 leading-relaxed ${isTablet ? 'text-2xl' : 'text-[13px]'}`}>
                    Your photos are intelligently grouped by month and year so you never lose track of a precious memory.
                </Text>
            </View>
            <View className={`bg-primary/5 rounded-[32px] ${isTablet ? 'p-12' : 'p-5'}`}>
                <MaterialIcons name="cloud-upload" size={isTablet ? 48 : 24} color="#b30069" className="mb-4" />
                <Text className={`font-headline-bold text-[#1c1c18] mb-2 ${isTablet ? 'text-3xl' : 'text-[15px]'}`}>Permanent Storage</Text>
                <Text className={`font-body-medium text-stone-500 leading-relaxed ${isTablet ? 'text-2xl' : 'text-[13px]'}`}>
                    No compression and no expiry. Preserve your full-quality memories indefinitely across all your devices.
                </Text>
            </View>
        </View>
    );

    const renderEmptyState = () => (
        <View className="items-center w-full mb-12 mt-16 px-6">
            <View className={`rounded-full bg-primary/5 items-center justify-center mb-8 ${isTablet ? 'w-40 h-40' : 'w-20 h-20'}`}>
                <MaterialIcons name="photo-library" size={isTablet ? 80 : 40} color="#b30069" />
            </View>
            <Text className={`font-headline-bold text-on-surface text-center mb-4 ${isTablet ? 'text-5xl' : 'text-2xl'}`}>No Mandali Found!</Text>
            <Text className={`text-on-surface-variant text-center font-body-medium leading-relaxed mb-12 ${isTablet ? 'text-2xl px-20' : 'text-[15px]'}`}>
                Memories are better when shared with friends and family. Create or join a Mandali to start capturing your moments!
            </Text>

            <View className="w-full gap-6">
                <TouchableOpacity
                    onPress={() => navigation.navigate('Groups', { 
                        screen: 'CreateGroup',
                        params: { returnTo: { parent: 'Memories', screen: 'MemoriesSelectGroup' } }
                    })}
                    style={{ height: isTablet ? 110 : 64 }}
                    className="rounded-[32px] bg-[#b30069] flex-row items-center justify-center px-8 shadow-xl shadow-primary/20"
                >
                    <Ionicons name="add-circle" size={isTablet ? 36 : 24} color="white" />
                    <Text 
                        className="text-white font-headline-bold ml-4"
                        style={{ fontSize: isTablet ? 32 : 20 }}
                    >Create New Mandali</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => navigation.navigate('Groups', { 
                        screen: 'JoinGroup',
                        params: { returnTo: { parent: 'Memories', screen: 'MemoriesSelectGroup' } }
                    })}
                    style={{ height: isTablet ? 110 : 64 }}
                    className="rounded-[32px] bg-[#fcecf2] flex-row items-center justify-center px-8 border border-[#b30069]/10"
                >
                    <Ionicons name="enter" size={isTablet ? 36 : 24} color="#b30069" />
                    <Text 
                        className="text-[#b30069] font-headline-bold ml-4"
                        style={{ fontSize: isTablet ? 32 : 20 }}
                    >Join Existing Mandali</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderGroupItem = ({ item }: { item: any }) => {
        return (
            <MandaliCard 
                item={item} 
                onPress={(id) => navigation.navigate('MemoriesHome', { groupId: id })}
                customSubtitle={
                    <View className="flex-row items-center">
                        <View style={{ backgroundColor: 'rgba(179, 0, 105, 0.4)' }} className={`rounded-full mr-3 ${isTablet ? 'w-2.5 h-2.5' : 'w-1.5 h-1.5'}`} />
                        <Text className={`font-body-bold text-[#594048] opacity-60 ${isTablet ? 'text-2xl' : 'text-[13px]'}`}>
                            {item.memoryCount || 0} Memories
                        </Text>
                    </View>
                }
            />
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top']}>
            {/* Centered Header Section */}
            <View 
                className="items-center w-full"
                style={{ 
                    marginTop: isTablet ? 30 : 12,
                    marginBottom: isTablet ? 20 : 12 
                }}
            >
                <Text
                    className="font-headline-bold text-[#1c1c18] text-center tracking-tight"
                    style={{ fontSize: isTablet ? 72 : 42 }}
                    adjustsFontSizeToFit
                    numberOfLines={1}
                >
                    Memories
                </Text>
                <Text 
                    className="font-body-bold text-[#b30069] text-center tracking-[4px] uppercase"
                    style={{ 
                        fontSize: isTablet ? 20 : 12,
                        marginTop: isTablet ? 8 : 4
                    }}
                >
                    Pick a Mandali
                </Text>
            </View>

            <SearchBar 
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search Mandalis..."
            />

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator color="#b30069" size="large" />
                </View>
            ) : (
                <FlatList
                    data={filteredGroups}
                    renderItem={renderGroupItem}
                    keyExtractor={(item) => item.id}
                    ListEmptyComponent={renderEmptyState}
                    ListFooterComponent={renderContextCards}
                    contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40, gap: isTablet ? 16 : 12 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl 
                            refreshing={isRefetching} 
                            onRefresh={refetch} 
                            tintColor="#b30069" 
                            colors={['#b30069']} 
                        />
                    }
                />
            )}
        </SafeAreaView>
    );
};

export default MemoriesSelectGroupScreen;
