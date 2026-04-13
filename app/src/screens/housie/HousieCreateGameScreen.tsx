import React, { useState } from 'react';
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
    useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { setupHousieGame } from '../../lib/api';

const PRESETS = ['20', '50', '100', '200'];

const HousieCreateGameScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute();
    const { groupId, gameCode } = (route.params as { groupId: string, gameCode: string }) || {};
    const [ticketPrice, setTicketPrice] = useState('50');
    const [isLoading, setIsLoading] = useState(false);

    const { height } = useWindowDimensions();

    // Responsive scaling — base is 812pt (iPhone 13)
    const scale = Math.min(Math.max(height / 812, 0.75), 1.2);
    const priceFontSize = Math.round(72 * scale);
    const titleFontSize = Math.round(38 * scale);
    const cardPadding = Math.round(24 * scale);
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
                    {/* Header */}
                    <View
                        style={{ paddingHorizontal: 24, paddingTop: isSmall ? 8 : 16, paddingBottom: 8 }}
                        className="flex-row items-center justify-between"
                    >
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            className="w-10 h-10 rounded-full bg-white items-center justify-center shadow-sm border border-stone-100"
                        >
                            <MaterialIcons name="close" size={20} color="#594048" />
                        </TouchableOpacity>
                        <Text className="text-stone-400 font-body-bold text-[10px] uppercase tracking-[4px]">Housie Host</Text>
                        <View className="w-10" />
                    </View>

                    <ScrollView
                        contentContainerStyle={{
                            flexGrow: 1,
                            paddingHorizontal: 24,
                            paddingBottom: 40,
                        }}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        bounces={false}
                    >
                        {/* Top section */}
                        <View>
                            {/* Badge row */}
                            <View className="flex-row items-center" style={{ marginTop: isSmall ? 4 : 12, marginBottom: isSmall ? 8 : 16 }}>
                                <View className="w-11 h-11 rounded-2xl bg-primary/10 items-center justify-center">
                                    <FontAwesome5 name="medal" size={20} color="#b30069" />
                                </View>
                                <View className="ml-3">
                                    <Text className="text-stone-400 font-body-bold text-[10px] uppercase tracking-[3px]">Mandali Master</Text>
                                    <Text className="text-primary font-headline-bold text-sm">Session Host</Text>
                                </View>
                            </View>

                            {/* Title */}
                            <Text
                                style={{ fontSize: titleFontSize, lineHeight: titleFontSize * 1.1 }}
                                className="font-headline-bold text-on-surface"
                            >
                                Set the{"\n"}Stakes
                            </Text>
                            <Text
                                className="text-stone-500 font-body-medium leading-5"
                                style={{ fontSize: isSmall ? 13 : 15, marginTop: 6, marginBottom: isSmall ? 12 : 20 }}
                            >
                                Choose a ticket price to define the prize pool.
                            </Text>
                        </View>

                        {/* Price Input Card */}
                        <View
                            className="bg-white rounded-[32px] shadow-md shadow-black/5 border border-stone-100 items-center"
                            style={{ padding: cardPadding, marginBottom: isSmall ? 12 : 20 }}
                        >
                            <Text className="text-stone-300 font-body-bold text-xs uppercase tracking-[3px]" style={{ marginBottom: isSmall ? 8 : 12 }}>
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
                                style={{ gap: isSmall ? 8 : 12, marginTop: isSmall ? 12 : 16 }}
                            >
                                {PRESETS.map((p) => (
                                    <TouchableOpacity
                                        key={p}
                                        onPress={() => setTicketPrice(p)}
                                        style={{ width: isSmall ? 52 : 56, height: isSmall ? 40 : 46 }}
                                        className={`rounded-full border items-center justify-center ${
                                            ticketPrice === p
                                                ? 'bg-primary border-primary'
                                                : 'bg-transparent border-stone-200'
                                        }`}
                                    >
                                        <Text
                                            style={{ fontSize: isSmall ? 11 : 13 }}
                                            className={`font-body-bold ${ticketPrice === p ? 'text-white' : 'text-stone-400'}`}
                                        >
                                            ₹{p}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Info row — hidden on very small screens to save space */}
                        {!isSmall && (
                            <View className="flex-row items-center bg-primary/5 rounded-2xl px-4 py-3 mb-5 border border-primary/10">
                                <MaterialIcons name="info-outline" size={16} color="#b30069" />
                                <Text className="text-primary/70 font-body-medium text-sm ml-2 flex-1">
                                    All ticket sales go into the prize pool, split across bounties you define next.
                                </Text>
                            </View>
                        )}

                        {/* CTA */}
                        <TouchableOpacity
                            onPress={handleCreateGame}
                            disabled={isLoading || !ticketPrice || ticketPrice === '0'}
                            activeOpacity={0.9}
                            style={{ height: isSmall ? 56 : 64 }}
                            className={`bg-primary rounded-[28px] flex-row items-center justify-center shadow-lg shadow-primary/30 ${
                                isLoading || !ticketPrice || ticketPrice === '0' ? 'opacity-50' : 'opacity-100'
                            }`}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <MaterialIcons name="bolt" size={22} color="white" />
                                    <Text
                                        style={{ fontSize: isSmall ? 17 : 20 }}
                                        className="text-white font-headline-bold ml-2"
                                    >
                                        Initialize Game
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </TouchableWithoutFeedback>
    );
};

export default HousieCreateGameScreen;
