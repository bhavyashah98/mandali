import React, { useState } from 'react';
import { useIsTablet } from '../../hooks/useIsTablet';
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    Keyboard,
    TouchableWithoutFeedback,
    Platform,
    KeyboardAvoidingView,
    ScrollView,
    useWindowDimensions,
    Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { setupHousieGame, fetchGroupDetail } from '../../lib/api';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';

const PRESETS = ['20', '50', '100', '200'];

const HousieCreateGameScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute();
    const { groupId, gameCode } = (route.params as { groupId: string, gameCode: string }) || {};
    const [ticketPrice, setTicketPrice] = useState('50');
    const [isLoading, setIsLoading] = useState(false);

    const { height, width } = useWindowDimensions();
    const isTablet = useIsTablet();

    const { data: groupData } = useQuery({
        queryKey: ['groupDetail', groupId],
        queryFn: () => fetchGroupDetail(groupId!),
        enabled: !!groupId,
    });

    const groupName = groupData?.group?.name || 'Mandali';

    // Responsive scaling
    const scale = Math.min(Math.max(height / 812, 0.75), isTablet ? 2.5 : 1.25);
    const priceFontSize = Math.round(isTablet ? 120 : 72 * scale);
    const cardPadding = Math.round(isTablet ? 100 : 24 * scale);
    const isSmall = height < 700;

    const handleCreateGame = async () => {
        if (!gameCode) {
            Alert.alert('Error', 'Game session was lost. Please return to the lobby.');
            return;
        }
        const price = parseFloat(ticketPrice);
        if (isNaN(price) || price < 0) {
            Alert.alert('Invalid Price', 'Please enter a valid ticket price.');
            return;
        }
        try {
            setIsLoading(true);
            const response = await setupHousieGame(gameCode, price);
            if (response.success) {
                navigation.replace('HousieWaitingRoom', { gameCode, groupId });
            }
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to initialize game');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top', 'bottom']}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={{ flex: 1 }}
                >
                    {/* Centered Top Bar */}
                    <View className={`flex-row items-center px-6 ${isTablet ? 'py-8' : 'py-4'}`}>
                        <View style={{ width: isTablet ? 64 : 44 }}>
                            <TouchableOpacity
                                onPress={() => navigation.goBack()}
                                className={`items-center justify-center rounded-full bg-white shadow-sm border border-stone-100 ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}
                            >
                                <MaterialIcons name="arrow-back-ios" size={isTablet ? 28 : 20} color="#b30069" style={{ marginLeft: isTablet ? 12 : 5 }} />
                            </TouchableOpacity>
                        </View>
                        <View className="flex-1 items-center">
                            <Text
                                className="font-headline-bold text-[#1c1c18] uppercase tracking-[4px]"
                                style={{ fontSize: isTablet ? 36 : 20 }}
                            >
                                Housie Host
                            </Text>
                        </View>
                        <View style={{ width: isTablet ? 64 : 44 }} />
                    </View>

                    <ScrollView
                        contentContainerStyle={{
                            flexGrow: 1,
                            paddingHorizontal: isTablet ? 60 : 24,
                            paddingBottom: isTablet ? 80 : 40,
                        }}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            <View>
                                {/* Top section */}
                                <View className="items-center">
                                    {/* Badge row - REPLACED WITH GROUP NAME */}
                                    <View className={`items-center mb-${isTablet ? '16' : '8'} mt-${isTablet ? '8' : '4'}`}>
                                        <View className={`rounded-[32px] bg-primary/10 items-center justify-center mb-6 overflow-hidden ${isTablet ? 'w-40 h-40' : 'w-20 h-20'}`}>
                                            {groupData?.group?.cover_photo_url ? (
                                                <Image source={{ uri: groupData.group.cover_photo_url }} style={{ width: '100%', height: '100%' }}
                                                    contentFit="cover" />
                                            ) : (
                                                <FontAwesome5 name="users" size={isTablet ? 72 : 32} color="#b30069" />
                                            )}
                                        </View>
                                        <Text className={`text-stone-400 font-body-bold uppercase tracking-[4px] mb-2 ${isTablet ? 'text-2xl' : 'text-[10px]'}`}>{groupName}</Text>
                                        <Text className={`text-primary font-headline-bold ${isTablet ? 'text-4xl' : 'text-xl'}`}>Session Host</Text>
                                    </View>

                                    <Text
                                        className="text-stone-500 font-body-medium leading-relaxed text-center"
                                        style={{ fontSize: isTablet ? 28 : 16, marginBottom: isTablet ? 60 : 32 }}
                                    >
                                        Choose a ticket price to define the prize pool for your Mandali.
                                    </Text>
                                </View>

                                {/* Price Input Card */}
                                <View
                                    className="bg-white rounded-[40px] shadow-md shadow-black/5 border border-stone-100 items-center"
                                    style={{ padding: cardPadding, marginBottom: isTablet ? 60 : (isSmall ? 12 : 20) }}
                                >
                                    <Text className={`text-stone-300 font-body-bold uppercase tracking-[3px] mb-6 ${isTablet ? 'text-xl' : 'text-xs'}`}>
                                        Ticket Value (₹)
                                    </Text>

                                    {/* Price input row */}
                                    <View className="flex-row items-center justify-center">
                                        <Text style={{ fontSize: priceFontSize * 0.55, color: '#b30069' }} className="font-headline-bold mr-1">₹</Text>
                                        <TextInput
                                            value={ticketPrice}
                                            onChangeText={(val) => setTicketPrice(val.replace(/[^0-9]/g, ''))}
                                            keyboardType="number-pad"
                                            placeholder="0"
                                            placeholderTextColor="#e6d9d0"
                                            style={{
                                                fontSize: priceFontSize,
                                                fontFamily: Platform.OS === 'ios' ? 'NotoSerif_700Bold' : 'serif',
                                                color: '#b30069',
                                                textAlign: 'center',
                                                padding: 0,
                                                margin: 0,
                                                minWidth: 100,
                                                maxWidth: 220,
                                                includeFontPadding: false,
                                                height: priceFontSize * 1.25,
                                            }}
                                        />
                                    </View>

                                    {/* Preset pills */}
                                    <View
                                        className="flex-row items-center justify-center"
                                        style={{ gap: isTablet ? 20 : (isSmall ? 8 : 12), marginTop: isTablet ? 24 : (isSmall ? 12 : 16) }}
                                    >
                                        {PRESETS.map((p) => (
                                            <TouchableOpacity
                                                key={p}
                                                onPress={() => setTicketPrice(p)}
                                                style={{ width: isTablet ? 120 : (isSmall ? 52 : 56), height: isTablet ? 80 : (isSmall ? 40 : 46) }}
                                                className={`rounded-full border items-center justify-center ${ticketPrice === p
                                                    ? 'bg-primary border-primary'
                                                    : 'bg-transparent border-stone-200'
                                                    }`}
                                            >
                                                <Text
                                                    style={{ fontSize: isTablet ? 24 : (isSmall ? 11 : 13) }}
                                                    className={`font-body-bold ${ticketPrice === p ? 'text-white' : 'text-stone-400'}`}
                                                >
                                                    ₹{p}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                {/* Info row — upscaled for tablet */}
                                <View className={`flex-row items-center bg-primary/5 border border-primary/10 rounded-[32px] ${isTablet ? 'px-10 py-8 mb-12' : 'px-4 py-3 mb-5'}`}>
                                    <View className={`rounded-full bg-primary/10 items-center justify-center ${isTablet ? 'w-16 h-16' : 'w-8 h-8'}`}>
                                        <MaterialIcons name="info-outline" size={isTablet ? 32 : 16} color="#b30069" />
                                    </View>
                                    <Text
                                        className="text-primary/70 font-body-medium ml-4 flex-1"
                                        style={{ fontSize: isTablet ? 24 : 14, lineHeight: isTablet ? 36 : 20 }}
                                    >
                                        All ticket sales go into the prize pool, split across bounties you define next.
                                    </Text>
                                </View>

                                {/* CTA */}
                                <TouchableOpacity
                                    onPress={handleCreateGame}
                                    disabled={isLoading || !ticketPrice || ticketPrice === '0'}
                                    activeOpacity={0.9}
                                    style={{ height: isTablet ? 110 : 64 }}
                                    className={`bg-primary rounded-[40px] flex-row items-center justify-center shadow-lg shadow-primary/30 ${isLoading || !ticketPrice || ticketPrice === '0' ? 'opacity-50' : 'opacity-100'
                                        }`}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <>
                                            <MaterialIcons name="bolt" size={isTablet ? 42 : 22} color="white" />
                                            <Text
                                                style={{ fontSize: isTablet ? 32 : 20 }}
                                                className="text-white font-headline-bold ml-4"
                                            >
                                                Initialize Game
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </TouchableWithoutFeedback>
    );
};

export default HousieCreateGameScreen;
