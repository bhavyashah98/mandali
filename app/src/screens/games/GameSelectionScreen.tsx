import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { fetchGroupDetail } from '../../lib/api';
import { useIsTablet } from '../../hooks/useIsTablet';
import { useConfig } from '../../context/ConfigContext';

const GameSelectionScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { groupId } = route.params;
    const isTablet = useIsTablet();
    const { availableGames } = useConfig();
    const primaryColor = '#b30069';

    // Fetch group details to show the name in the header
    const { data: group, isLoading: isGroupLoading } = useQuery({
        queryKey: ['group', groupId],
        queryFn: () => fetchGroupDetail(groupId),
        enabled: !!groupId,
    });

    const renderGameCard = (game: any) => (
        <TouchableOpacity
            key={game.id}
            onPress={() => {
                navigation.navigate('GameLobby', { groupId, gameType: game.id });
            }}
            activeOpacity={0.85}
            style={{
                elevation: 6,
                shadowColor: primaryColor,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.12,
                shadowRadius: 12,
                minHeight: isTablet ? 220 : 140
            }}
            className="bg-white rounded-[32px] mb-6 overflow-hidden border border-stone-100/60"
        >
            <View className={`flex-1 ${isTablet ? 'p-12' : 'p-6'} flex-row items-center`}>
                <View
                    style={{ backgroundColor: 'rgba(179, 0, 105, 0.06)' }}
                    className={`rounded-[24px] items-center justify-center ${isTablet ? 'w-32 h-32' : 'w-20 h-20'}`}
                >
                    {game.iconType === 'material' ? (
                        <MaterialIcons name={game.icon as any} size={isTablet ? 56 : 36} color={primaryColor} />
                    ) : (
                        <FontAwesome5 name={game.icon as any} size={isTablet ? 48 : 32} color={primaryColor} />
                    )}
                </View>

                <View className="flex-1 ml-5 justify-center">
                    <Text className={`font-headline-bold text-[#1c1c18] ${isTablet ? 'text-4xl mb-2' : 'text-xl mb-1'}`}>
                        {game.title}
                    </Text>
                    <Text
                        className={`font-body-medium text-stone-500 leading-relaxed ${isTablet ? 'text-2xl' : 'text-[13px]'}`}
                        numberOfLines={3}
                    >
                        {game.subtitle || "Step in and play with your Mandali circle!"}
                    </Text>
                </View>

                <MaterialIcons name="chevron-right" size={isTablet ? 40 : 28} color="rgba(179, 0, 105, 0.4)" />
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top']}>
            <View className="flex-row items-center px-6 py-4">
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className={`rounded-full bg-white items-center justify-center border border-stone-200 z-10 ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}
                >
                    <MaterialIcons name="arrow-back" size={isTablet ? 28 : 20} color="#1c1c18" />
                </TouchableOpacity>
                <View className="absolute left-0 right-0 items-center justify-center">
                    <Text className={`font-headline-bold text-[#1c1c18] ${isTablet ? 'text-4xl' : 'text-[22px]'}`}>Select Game</Text>
                    {isGroupLoading ? (
                        <ActivityIndicator size="small" color="#b30069" className="mt-1" />
                    ) : (
                        <Text className={`font-body-bold text-[#b30069] mt-0.5 tracking-wider uppercase ${isTablet ? 'text-lg' : 'text-[10px]'}`}>
                            {group.group.name}
                        </Text>
                    )}
                </View>
            </View>

            <ScrollView
                contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
            >
                {availableGames.map(renderGameCard)}

                <View className={`mt-6 items-center bg-stone-50 rounded-[32px] border border-dashed border-stone-200 ${isTablet ? 'p-12' : 'p-8'}`}>
                    <Ionicons name="sparkles-outline" size={isTablet ? 48 : 28} color={primaryColor} className="mb-3 opacity-40" />
                    <Text className={`font-headline-bold text-stone-400 text-center ${isTablet ? 'text-3xl' : 'text-[17px]'}`}>More Games Coming Soon</Text>
                    <Text className={`text-stone-400 text-center font-body-medium mt-2 leading-relaxed ${isTablet ? 'text-2xl' : 'text-[13px]'}`}>
                        We are actively building more exciting multiplayer experiences. Stay tuned!
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default GameSelectionScreen;
