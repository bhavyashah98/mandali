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
    useWindowDimensions,
    Dimensions
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

    const { height, width } = useWindowDimensions();
    const isTablet = width > 500;

    // Responsive scaling — base is 812pt (iPhone 13)
    const scale = Math.min(Math.max(height / 812, 0.75), isTablet ? 2.5 : 1.25);
    const priceFontSize = Math.round(isTablet ? 120 : 72 * scale);
    const titleFontSize = Math.round(isTablet ? 72 : 38 * scale);
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
                    {/* Header */}
                    <View className={`flex-row items-center px-6 ${isTablet ? 'py-8' : 'py-4'}`}>
                        <TouchableOpacity 
                            onPress={() => navigation.goBack()} 
                            className={`items-center justify-center rounded-full bg-white shadow-sm border border-stone-100 ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}
                        >
                            <MaterialIcons name="arrow-back-ios" size={isTablet ? 28 : 20} color="#b30069" style={{ marginLeft: isTablet ? 12 : 5 }} />
                        </TouchableOpacity>
                    </View>

                    {/* Centered Header Section */}
                    <View 
                        className="items-center w-full"
                        style={{ 
                            marginTop: isTablet ? 20 : 0,
                            marginBottom: isTablet ? 40 : 20 
                        }}
                    >
                        <Text
                            className="font-headline-bold text-on-surface text-center tracking-tight text-[#1c1c18]"
                            style={{ fontSize: isTablet ? 72 : 38 }}
                            adjustsFontSizeToFit
                            numberOfLines={1}
                        >
                            Set Game Stakes
                        </Text>
                        <Text 
                            className="font-body-medium text-on-surface-variant text-center leading-relaxed opacity-60"
                            style={{ 
                                fontSize: isTablet ? 22 : 15,
                                marginTop: isTablet ? 20 : 12,
                                paddingHorizontal: isTablet ? 80 : 32
                            }}
                        >
                            Configure the ticket price and bounties for this session
                        </Text>
                        <View 
                            className="bg-primary/20 rounded-full"
                            style={{ 
                                height: 4, 
                                width: isTablet ? 120 : 40,
                                marginTop: isTablet ? 36 : 20 
                            }} 
                        />
                    </View>

                    <ScrollView
                        contentContainerStyle={{
                            flexGrow: 1,
                            paddingHorizontal: isTablet ? 60 : 24,
                            paddingBottom: isTablet ? 80 : 40,
                        }}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        bounces={false}
                    >
                        {/* Top section */}
                        <View>
                            {/* Badge row */}
                            <View className="flex-row items-center" style={{ marginTop: isTablet ? 32 : (isSmall ? 4 : 12), marginBottom: isTablet ? 32 : (isSmall ? 8 : 16) }}>
                                <View className={`rounded-2xl bg-primary/10 items-center justify-center ${isTablet ? 'w-20 h-20' : 'w-11 h-11'}`}>
                                    <FontAwesome5 name="medal" size={isTablet ? 36 : 20} color="#b30069" />
                                </View>
                                <View className="ml-5">
                                    <Text className={`text-stone-400 font-body-bold uppercase tracking-[3px] ${isTablet ? 'text-xl' : 'text-[10px]'}`}>Mandali Master</Text>
                                    <Text className={`text-primary font-headline-bold ${isTablet ? 'text-3xl mt-1' : 'text-sm'}`}>Session Host</Text>
                                </View>
                            </View>

                            {/* Title (Hidden as we have centered header now) */}
                            {/* <Text ... /> */}
                            <Text
                                className="text-stone-500 font-body-medium leading-8 text-center"
                                style={{ fontSize: isTablet ? 28 : 15, marginTop: 12, marginBottom: isTablet ? 40 : 20 }}
                            >
                                Choose a ticket price to define the prize pool.
                            </Text>
                        </View>

                        {/* Price Input Card */}
                        <View
                            className="bg-white rounded-[40px] shadow-md shadow-black/5 border border-stone-100 items-center"
                            style={{ padding: cardPadding, marginBottom: isTablet ? 40 : (isSmall ? 12 : 20) }}
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
                                        className={`rounded-full border items-center justify-center ${
                                            ticketPrice === p
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
                            style={{ height: isTablet ? 110 : 64 }}
                            className={`bg-primary rounded-[40px] flex-row items-center justify-center shadow-lg shadow-primary/30 ${
                                isLoading || !ticketPrice || ticketPrice === '0' ? 'opacity-50' : 'opacity-100'
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
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </TouchableWithoutFeedback>
    );
};

export default HousieCreateGameScreen;
