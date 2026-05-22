import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useIsTablet } from '../../hooks/useIsTablet';
import { fetchPlans } from '../../lib/api';
import type { PlanStatus } from '../../types/plans';
import PlanCard from '../../components/plans/PlanCard';

const TABS: { key: PlanStatus; label: string }[] = [
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'live', label: 'Live' },
    { key: 'past', label: 'Past' },
];

const PlansHomeScreen = () => {
    const navigation = useNavigation<any>();
    const isTablet = useIsTablet();
    const [activeTab, setActiveTab] = useState<PlanStatus>('upcoming');

    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: ['plans', activeTab],
        queryFn: () => fetchPlans(activeTab),
        staleTime: 30_000,
    });

    const plans = data?.plans ?? [];

    return (
        <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top']}>
            <View className={`px-6 ${isTablet ? 'pt-8 pb-4' : 'pt-4 pb-3'}`}>
                <Text
                    className="font-headline-bold text-[#1c1c18]"
                    style={{ fontSize: isTablet ? 40 : 28 }}
                >
                    Plans
                </Text>
                <Text
                    className="font-body-regular text-[#594048] mt-1"
                    style={{ fontSize: isTablet ? 18 : 14 }}
                >
                    Kitty nights, get-togethers & more
                </Text>
            </View>

            <View className="px-6 mb-4">
                <View className="flex-row bg-stone-200/50 p-1.5 rounded-[32px]">
                    {TABS.map((tab) => {
                        const active = activeTab === tab.key;
                        return (
                            <TouchableOpacity
                                key={tab.key}
                                onPress={() => setActiveTab(tab.key)}
                                className={`flex-1 py-3 rounded-[28px] items-center ${active ? 'bg-[#b30069]' : ''}`}
                                style={
                                    active
                                        ? {
                                              shadowColor: '#b30069',
                                              shadowOffset: { width: 0, height: 2 },
                                              shadowOpacity: 0.2,
                                              shadowRadius: 4,
                                              elevation: 2,
                                          }
                                        : {}
                                }
                            >
                                <Text
                                    className={`font-body-bold ${isTablet ? 'text-base' : 'text-sm'} ${
                                        active ? 'text-white' : 'text-[#594048]'
                                    }`}
                                >
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#b30069" />
                </View>
            ) : isError ? (
                <View className="flex-1 items-center justify-center px-8">
                    <MaterialIcons name="error-outline" size={48} color="#d6d3d1" />
                    <Text className="font-body-bold text-stone-400 mt-4 text-center">
                        Could not load plans. Pull to refresh.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={plans}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{
                        paddingHorizontal: 24,
                        paddingBottom: 120,
                        flexGrow: 1,
                    }}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefetching}
                            onRefresh={refetch}
                            tintColor="#b30069"
                        />
                    }
                    ListEmptyComponent={
                        <View className="items-center py-16 px-6">
                            <View className="w-20 h-20 bg-white rounded-full items-center justify-center mb-4 border border-stone-100">
                                <MaterialIcons name="event-busy" size={40} color="#d6d3d1" />
                            </View>
                            <Text className="font-headline-bold text-[#1c1c18] text-lg text-center">
                                No {activeTab} plans
                            </Text>
                            <Text className="font-body-medium text-stone-400 text-center mt-2">
                                Tap + to plan something awesome with your Mandali
                            </Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <PlanCard
                            plan={item}
                            isTablet={isTablet}
                            showLiveBadge={activeTab === 'live'}
                        />
                    )}
                />
            )}

            <TouchableOpacity
                onPress={() => navigation.navigate('CreatePlan')}
                activeOpacity={0.9}
                style={{
                    position: 'absolute',
                    bottom: isTablet ? 40 : 24,
                    right: isTablet ? 32 : 24,
                    elevation: 8,
                    shadowColor: '#b30069',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.35,
                    shadowRadius: 8,
                }}
                className={`bg-[#b30069] rounded-full items-center justify-center ${isTablet ? 'w-16 h-16' : 'w-14 h-14'}`}
            >
                <MaterialIcons name="add" size={isTablet ? 36 : 30} color="white" />
            </TouchableOpacity>
        </SafeAreaView>
    );
};

export default PlansHomeScreen;
