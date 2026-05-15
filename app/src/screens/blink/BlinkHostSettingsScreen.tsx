import React, { useState, useCallback } from 'react';
import { View, ScrollView, Alert, Text, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MandaliDatePicker } from '../../components/MandaliDatePicker';
import { useIsTablet } from '../../hooks/useIsTablet';
import { createBlinkGame } from '../../lib/api';

const BlinkHostSettingsScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { groupId } = (route.params as { groupId: string }) || {};
    const isTablet = useIsTablet();
    const primaryColor = '#b30069';

    const [title, setTitle] = useState('Blink Match');
    const [maxPlayers, setMaxPlayers] = useState(10);
    const [cardsPerPlayer, setCardsPerPlayer] = useState(12);
    const [difficultyLevel, setDifficultyLevel] = useState(6);
    const [theme, setTheme] = useState('default');
    
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
                difficultyLevel,
                theme,
                isScheduled,
                scheduledAt: isScheduled ? scheduledAt.toISOString() : undefined
            });

            if (data.game) {
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
            {/* Header */}
            <View className="flex-row items-center px-6 py-4 border-b border-stone-100">
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className="w-10 h-10 items-center justify-center rounded-full bg-white border border-stone-100 shadow-sm"
                >
                    <MaterialIcons name="arrow-back-ios" size={20} color={primaryColor} style={{ marginLeft: 5 }} />
                </TouchableOpacity>
                <View className="flex-1 items-center" style={{ marginRight: 40 }}>
                    <Text className="font-headline-bold text-[#1c1c18]" style={{ fontSize: isTablet ? 32 : 22 }}>
                        Blink Setup
                    </Text>
                </View>
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Title */}
                <View className="mb-8">
                    <Text className="font-body-bold text-stone-400 uppercase tracking-widest text-[10px] mb-3">Room Title</Text>
                    <TextInput
                        value={title}
                        onChangeText={setTitle}
                        placeholder="E.g. Sunday Speed Match"
                        className="bg-white rounded-3xl p-5 font-body-bold text-lg border border-stone-100 shadow-sm"
                    />
                </View>

                {/* Game Config */}
                <View className="mb-8">
                    <Text className="font-body-bold text-stone-400 uppercase tracking-widest text-[10px] mb-4">Game Configuration</Text>
                    
                    <View className="flex-row justify-between mb-4">
                        <View className="flex-1 bg-white rounded-3xl p-4 border border-stone-100 mr-2 shadow-sm">
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
                        <View className="flex-1 bg-white rounded-3xl p-4 border border-stone-100 ml-2 shadow-sm">
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

                    <View className="bg-white rounded-3xl p-4 border border-stone-100 shadow-sm">
                        <Text className="text-stone-400 font-body-bold text-[9px] uppercase mb-1">Difficulty (Symbols per card)</Text>
                        <View className="flex-row items-center justify-around mt-2">
                            {[4, 6, 8].map(level => (
                                <TouchableOpacity 
                                    key={level}
                                    onPress={() => setDifficultyLevel(level)}
                                    className={`px-6 py-2 rounded-2xl ${difficultyLevel === level ? 'bg-[#b30069]' : 'bg-stone-50'}`}
                                >
                                    <Text className={`font-headline-bold ${difficultyLevel === level ? 'text-white' : 'text-stone-400'}`}>{level}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>

                {/* Scheduling */}
                <View className="mb-8">
                    <Text className="font-body-bold text-stone-400 uppercase tracking-widest text-[10px] mb-4">Scheduling</Text>
                    <TouchableOpacity 
                        onPress={() => setIsScheduled(!isScheduled)}
                        className={`flex-row items-center p-5 rounded-3xl border ${isScheduled ? 'bg-blue-50 border-blue-200' : 'bg-white border-stone-100'}`}
                    >
                        <MaterialIcons name={isScheduled ? "alarm-on" : "alarm-add"} size={24} color={isScheduled ? primaryColor : "#a09d96"} />
                        <View className="ml-4 flex-1">
                            <Text className={`font-headline-bold ${isScheduled ? 'text-blue-600' : 'text-stone-800'}`}>Schedule for later</Text>
                            <Text className="text-stone-400 font-body-medium text-xs">Announce game to group members</Text>
                        </View>
                        <View className={`w-12 h-6 rounded-full px-1 justify-center ${isScheduled ? 'bg-blue-600' : 'bg-stone-200'}`}>
                            <View className={`w-4 h-4 bg-white rounded-full ${isScheduled ? 'self-end' : 'self-start'}`} />
                        </View>
                    </TouchableOpacity>

                    {isScheduled && (
                        <View className="flex-row mt-4">
                            <TouchableOpacity 
                                onPress={() => setShowDatePicker(true)}
                                className="flex-1 bg-white rounded-3xl p-4 border border-stone-100 mr-2 flex-row items-center justify-center shadow-sm"
                            >
                                <MaterialIcons name="calendar-today" size={18} color={primaryColor} />
                                <Text className="ml-2 font-body-bold text-stone-800">{scheduledAt.toLocaleDateString([], { month: 'short', day: 'numeric' })}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                onPress={() => setShowTimePicker(true)}
                                className="flex-1 bg-white rounded-3xl p-4 border border-stone-100 ml-2 flex-row items-center justify-center shadow-sm"
                            >
                                <MaterialIcons name="access-time" size={18} color={primaryColor} />
                                <Text className="ml-2 font-body-bold text-stone-800">{scheduledAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </ScrollView>

            <View className="px-6 py-6 border-t border-stone-100 bg-white">
                <TouchableOpacity
                    onPress={handleCreate}
                    disabled={isLoading}
                    className="w-full rounded-3xl overflow-hidden shadow-lg"
                >
                    <View style={{ backgroundColor: primaryColor }} className="py-5 items-center flex-row justify-center">
                        <FontAwesome5 name={isScheduled ? "calendar-alt" : "bolt"} size={18} color="white" />
                        <Text className="text-white font-headline-bold text-lg ml-3">
                            {isScheduled ? 'Schedule Game' : 'Host Now'}
                        </Text>
                    </View>
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
