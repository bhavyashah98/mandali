import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useIsTablet } from '../../hooks/useIsTablet';
import { useConfig } from '../../context/ConfigContext';

const GameSelectionScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { groupId } = route.params;
    const isTablet = useIsTablet();
    const { availableGames } = useConfig();
    const primaryColor = '#b30069';

    const renderGameCard = (game: any) => (
        <TouchableOpacity
            key={game.id}
            onPress={() => {
                navigation.navigate('GameLobby', { groupId, gameType: game.id });
            }}
            activeOpacity={0.8}
            style={{ 
                elevation: 4, 
                shadowColor: primaryColor, 
                shadowOffset: { width: 0, height: 2 }, 
                shadowOpacity: 0.1, 
                shadowRadius: 8,
                height: isTablet ? 180 : 100 
            }}
            className="bg-white rounded-[28px] mb-4 overflow-hidden border border-stone-100"
        >
            <View className={`flex-1 ${isTablet ? 'p-10' : 'p-4'} flex-row items-center`}>
                <View 
                    style={{ backgroundColor: 'rgba(179, 0, 105, 0.05)' }}
                    className={`rounded-[20px] items-center justify-center ${isTablet ? 'w-24 h-24' : 'w-14 h-14'}`}
                >
                    {game.iconType === 'material' ? (
                        <MaterialIcons name={game.icon as any} size={isTablet ? 40 : 28} color={primaryColor} />
                    ) : (
                        <FontAwesome5 name={game.icon as any} size={isTablet ? 32 : 24} color={primaryColor} />
                    )}
                </View>

                <View className="flex-1 ml-4 justify-center">
                    <Text className={`font-headline-bold text-[#1c1c18] ${isTablet ? 'text-3xl' : 'text-lg'}`}>
                        {game.title}
                    </Text>
                    <Text className={`font-body-medium text-stone-400 mt-0.5 ${isTablet ? 'text-xl' : 'text-[11px]'}`} numberOfLines={2}>
                        {game.subtitle}
                    </Text>
                </View>

                <MaterialIcons name="chevron-right" size={isTablet ? 32 : 20} color="rgba(179, 0, 105, 0.3)" />
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top']}>
            <View className="flex-row items-center px-6 py-4">
                <TouchableOpacity 
                    onPress={() => navigation.goBack()}
                    className={`rounded-full bg-white items-center justify-center border border-stone-200 ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}
                >
                    <MaterialIcons name="arrow-back" size={isTablet ? 28 : 20} color="#1c1c18" />
                </TouchableOpacity>
                <View className="flex-1 items-center mr-10">
                    <Text className={`font-headline-bold text-[#1c1c18] ${isTablet ? 'text-4xl' : 'text-xl'}`}>Select Game</Text>
                </View>
            </View>

            <ScrollView 
                contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
            >
                {availableGames.map(renderGameCard)}

                <View className={`mt-4 items-center bg-stone-50 rounded-[28px] border border-dashed border-stone-200 ${isTablet ? 'p-10' : 'p-6'}`}>
                    <Ionicons name="sparkles-outline" size={isTablet ? 40 : 24} color={primaryColor} className="mb-2 opacity-50" />
                    <Text className={`font-headline-bold text-stone-400 text-center ${isTablet ? 'text-2xl' : 'text-[15px]'}`}>More Games Soon</Text>
                    <Text className={`text-stone-300 text-center font-body-medium mt-1 ${isTablet ? 'text-xl' : 'text-[11px]'}`}>
                        Stay tuned for more multiplayer fun!
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default GameSelectionScreen;
