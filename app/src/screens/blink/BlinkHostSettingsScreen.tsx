import React, { useState } from 'react';
import { View, ScrollView, Alert, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MandaliDatePicker } from '../../components/MandaliDatePicker';
import { useIsTablet } from '../../hooks/useIsTablet';
import { createBlinkGame } from '../../lib/api';

// Shared Components
import { HostSettingsHeader } from '../../components/common/HostSettingsHeader';
import { RoomDetailsSection } from '../../components/common/RoomDetailsSection';
import { SchedulingSection } from '../../components/common/SchedulingSection';

const BlinkHostSettingsScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { groupId } = (route.params as { groupId: string }) || {};
    const isTablet = useIsTablet();
    const primaryColor = '#b30069';

    const [title, setTitle] = useState('Blink Match');
    const [maxPlayers, setMaxPlayers] = useState(10);
    const [cardsPerPlayer, setCardsPerPlayer] = useState(12);
    const [symbolsPerCard, setSymbolsPerCard] = useState(6);
    const [theme] = useState('default');

    const [isScheduled, setIsScheduled] = useState(false);
    const [scheduledAt, setScheduledAt] = useState(new Date(Date.now() + 2 * 60 * 1000));
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    const [isLoading, setIsLoading] = useState(false);

    const handleCreate = async () => {
        if (!groupId) return;
        if (!title.trim()) {
            Alert.alert('Required', 'Please enter a room title');
            return;
        }

        setIsLoading(true);
        try {
            const data = await createBlinkGame({
                groupId,
                title: title.trim(),
                maxPlayers,
                cardsPerPlayer,
                symbolsPerCard,
                theme,
                isScheduled,
                scheduledAt: isScheduled ? scheduledAt.toISOString() : undefined
            });

            if (isScheduled) {
                Alert.alert('Success', 'Game scheduled successfully!');
                navigation.goBack();
            } else {
                navigation.replace('BlinkWaitingRoom', { gameCode: data.game.game_code, groupId });
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to create game');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top', 'bottom']}>
            <HostSettingsHeader onBack={() => navigation.goBack()} isTablet={isTablet} groupId={groupId} />

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 24, paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Room Details (Same as Housie) */}
                <RoomDetailsSection title={title} setTitle={setTitle} />

                {/* Game Config */}
                <View
                    style={{
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05,
                        shadowRadius: 8,
                        elevation: 2
                    }}
                    className="mb-8 bg-white p-6 rounded-[32px] border border-stone-100"
                >
                    <Text className="font-headline-bold text-stone-800 mb-4 text-lg">Game Config</Text>

                    <View className="flex-row justify-between mb-6">
                        <View className="flex-1 bg-stone-50 rounded-2xl p-4 border border-stone-100 mr-2">
                            <Text className="text-stone-400 font-body-bold text-[9px] uppercase mb-1">Max Players</Text>
                            <View className="flex-row items-center justify-between">
                                <TouchableOpacity onPress={() => setMaxPlayers(Math.max(2, maxPlayers - 1))}>
                                    <MaterialIcons name="remove-circle-outline" size={24} color={primaryColor} />
                                </TouchableOpacity>
                                <Text className="font-headline-bold text-xl">{maxPlayers}</Text>
                                <TouchableOpacity onPress={() => setMaxPlayers(Math.min(30, maxPlayers + 1))}>
                                    <MaterialIcons name="add-circle-outline" size={24} color={primaryColor} />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View className="flex-1 bg-stone-50 rounded-2xl p-4 border border-stone-100 ml-2">
                            <Text className="text-stone-400 font-body-bold text-[9px] uppercase mb-1">Cards Each</Text>
                            <View className="flex-row items-center justify-between">
                                <TouchableOpacity onPress={() => setCardsPerPlayer(Math.max(5, cardsPerPlayer - 1))}>
                                    <MaterialIcons name="remove-circle-outline" size={24} color={primaryColor} />
                                </TouchableOpacity>
                                <Text className="font-headline-bold text-xl">{cardsPerPlayer}</Text>
                                <TouchableOpacity onPress={() => setCardsPerPlayer(Math.min(25, cardsPerPlayer + 1))}>
                                    <MaterialIcons name="add-circle-outline" size={24} color={primaryColor} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    <Text className="text-stone-400 font-body-bold text-[10px] uppercase mb-3 px-1">Symbols Per Card</Text>
                    <View className="flex-row items-center bg-stone-50 p-1.5 rounded-2xl">
                        {[6, 8].map(level => (
                            <TouchableOpacity
                                key={level}
                                onPress={() => setSymbolsPerCard(level)}
                                className={`flex-1 py-3 rounded-xl items-center justify-center ${symbolsPerCard === level ? 'bg-white' : ''}`}
                                style={symbolsPerCard === level ? {
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 1 },
                                    shadowOpacity: 0.1,
                                    shadowRadius: 2,
                                    elevation: 1
                                } : {}}
                            >
                                <Text className={`font-headline-bold ${symbolsPerCard === level ? 'text-[#b30069]' : 'text-stone-400'}`}>{level}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Scheduling (Same as Housie) */}
                <SchedulingSection
                    isScheduled={isScheduled}
                    setIsScheduled={setIsScheduled}
                    scheduledAt={scheduledAt}
                    setShowDatePicker={setShowDatePicker}
                    setShowTimePicker={setShowTimePicker}
                />
            </ScrollView>

            {/* Footer */}
            <View className="absolute bottom-0 w-full px-6 pt-4 pb-8 bg-[#fdf9f3] border-t border-stone-100">
                <TouchableOpacity
                    onPress={handleCreate}
                    disabled={isLoading}
                    className="w-full bg-[#b30069] rounded-[32px] items-center justify-center"
                    style={{
                        height: isTablet ? 80 : 64,
                        opacity: isLoading ? 0.8 : 1,
                        shadowColor: primaryColor,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                        elevation: 4
                    }}
                >
                    {isLoading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <View className="flex-row items-center">
                            <FontAwesome5 name={isScheduled ? "calendar-alt" : "bolt"} size={18} color="white" />
                            <Text className="text-white font-headline-bold text-xl ml-3">
                                {isScheduled ? 'Schedule Game' : 'Host Match Now'}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            <MandaliDatePicker
                visible={showDatePicker}
                mode="date"
                value={scheduledAt}
                onConfirm={(date) => {
                    const newDate = new Date(scheduledAt);
                    newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                    setScheduledAt(newDate);
                    setShowDatePicker(false);
                }}
                onCancel={() => setShowDatePicker(false)}
                minimumDate={new Date()}
            />

            <MandaliDatePicker
                visible={showTimePicker}
                mode="time"
                value={scheduledAt}
                onConfirm={(time) => {
                    const newDate = new Date(scheduledAt);
                    newDate.setHours(time.getHours(), time.getMinutes());
                    setScheduledAt(newDate);
                    setShowTimePicker(false);
                }}
                onCancel={() => setShowTimePicker(false)}
            />
        </SafeAreaView>
    );
};

export default BlinkHostSettingsScreen;
