import React, { useState, useCallback } from 'react';
import { View, ScrollView, Alert, Modal, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useIsTablet } from '../../hooks/useIsTablet';
import { createHousieGame } from '../../lib/api';
import { useNavigation, useRoute } from '@react-navigation/native';

// Components
import { HostSettingsHeader } from '../../components/housie/settings/HostSettingsHeader';
import { HostSettingsFooter } from '../../components/housie/settings/HostSettingsFooter';
import { RoomDetailsSection } from '../../components/housie/settings/RoomDetailsSection';
import { SchedulingSection } from '../../components/housie/settings/SchedulingSection';
import { CallingModeSection } from '../../components/housie/settings/CallingModeSection';
import { GameTwistSection } from '../../components/housie/settings/GameTwistSection';
import { HostTicketsSection } from '../../components/housie/settings/HostTicketsSection';

const HousieHostSettingsScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { groupId } = (route.params as { groupId: string }) || {};
    const isTablet = useIsTablet();

    // Basic Info
    const [title, setTitle] = useState('');
    const [isScheduled, setIsScheduled] = useState(false);
    const [scheduledAt, setScheduledAt] = useState(new Date(Date.now() + 3600000));
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    // Calling Mode
    const [callingMode, setCallingMode] = useState<'manual' | 'auto'>('auto');
    const [autoCallSeconds, setAutoCallSeconds] = useState(7);

    // Game Style
    const [gameStyle, setGameStyle] = useState('classic');

    // Host Tickets
    const [hostTickets, setHostTickets] = useState(0);
    const [ticketDifficulty, setTicketDifficulty] = useState('easy');

    const [isLoading, setIsLoading] = useState(false);

    const handleDateChange = (event: any, selectedDate?: Date) => {
        if (event.type === 'dismissed') {
            setShowDatePicker(false);
            return;
        }

        if (selectedDate) {
            const newDate = new Date(scheduledAt);
            newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
            setScheduledAt(newDate);

            if (event.type === 'set') {
                // Wait for Apply button
            }
        }
    };

    const handleTimeChange = (event: any, selectedTime?: Date) => {
        if (event.type === 'dismissed') {
            setShowTimePicker(false);
            return;
        }

        if (selectedTime) {
            const newDate = new Date(scheduledAt);
            newDate.setHours(selectedTime.getHours(), selectedTime.getMinutes());
            setScheduledAt(newDate);

            if (event.type === 'set') {
                // Do nothing here, wait for Apply button
            }
        }
    };

    const handleContinue = useCallback(async () => {
        if (!groupId) {
            Alert.alert('Error', 'Group ID is missing.');
            return;
        }

        if (isScheduled) {
            const oneHourFromNow = new Date(Date.now() + 3600000);
            if (scheduledAt < oneHourFromNow) {
                Alert.alert("Invalid Time", "Games must be scheduled at least 1 hour from now.");
                return;
            }
        }

        // Navigate to Define Bounty screen with all current settings
        navigation.replace('HousieDefineBounty', {
            groupId,
            gameSettings: {
                title: title.trim() || 'Housie Game',
                callingMode,
                autoCallSeconds,
                hostTickets,
                ticketDifficulty,
                gameStyle,
                scheduledAt: isScheduled ? scheduledAt.toISOString() : undefined,
                isScheduled
            }
        });
    }, [groupId, title, callingMode, autoCallSeconds, hostTickets, ticketDifficulty, gameStyle, isScheduled, scheduledAt, navigation]);

    return (
        <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top', 'bottom']}>
            <HostSettingsHeader onBack={() => navigation.goBack()} isTablet={isTablet} />

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: isTablet ? 40 : 20, paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
            >
                <RoomDetailsSection title={title} setTitle={setTitle} />

                <SchedulingSection
                    isScheduled={isScheduled}
                    setIsScheduled={setIsScheduled}
                    scheduledAt={scheduledAt}
                    setShowDatePicker={setShowDatePicker}
                    setShowTimePicker={setShowTimePicker}
                />

                <Modal visible={showDatePicker} transparent animationType="fade">
                    <View className="flex-1 justify-center bg-black/50 px-6">
                        <View className="bg-white rounded-[32px] p-6">
                            <Text className="font-headline-bold text-stone-800 mb-4 text-center text-lg">Pick Date</Text>
                            <DateTimePicker
                                value={scheduledAt}
                                mode="date"
                                display="inline"
                                onChange={handleDateChange}
                                minimumDate={new Date()}
                                accentColor="#b30069"
                            />
                            <View className="flex-row mt-4 gap-3">
                                <TouchableOpacity
                                    onPress={() => setShowDatePicker(false)}
                                    className="flex-1 bg-stone-100 py-4 rounded-2xl items-center"
                                >
                                    <Text className="font-body-bold text-stone-600">Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => {
                                        setShowDatePicker(false);
                                        setTimeout(() => setShowTimePicker(true), 100);
                                    }}
                                    className="flex-1 bg-[#b30069] py-4 rounded-2xl items-center shadow-lg shadow-[#b30069]/20"
                                >
                                    <Text className="font-headline-bold text-white">Apply Date</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                <Modal visible={showTimePicker} transparent animationType="fade">
                    <View className="flex-1 justify-center bg-black/50 px-6">
                        <View className="bg-white rounded-[32px] p-6">
                            <Text className="font-headline-bold text-stone-800 mb-4 text-center text-lg">Pick Time</Text>
                            <DateTimePicker
                                value={scheduledAt}
                                mode="time"
                                display="spinner"
                                onChange={handleTimeChange}
                                textColor="#1c1c18"
                            />
                            <View className="flex-row mt-4 gap-3">
                                <TouchableOpacity
                                    onPress={() => setShowTimePicker(false)}
                                    className="flex-1 bg-stone-100 py-4 rounded-2xl items-center"
                                >
                                    <Text className="font-body-bold text-stone-600">Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => {
                                        const oneHourFromNow = new Date(Date.now() + 3600000);
                                        if (scheduledAt < oneHourFromNow) {
                                            Alert.alert(
                                                "Invalid Time",
                                                "Games must be scheduled at least 1 hour from now.",
                                                [{
                                                    text: "Fix Time", onPress: () => {
                                                        // Optionally reset to 1 hour from now
                                                        const validDate = new Date(Date.now() + 3600000);
                                                        setScheduledAt(validDate);
                                                    }
                                                }]
                                            );
                                            return;
                                        }
                                        setShowTimePicker(false);
                                    }}
                                    className="flex-1 bg-[#b30069] py-4 rounded-2xl items-center shadow-lg shadow-[#b30069]/20"
                                >
                                    <Text className="font-headline-bold text-white">Apply Time</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                <CallingModeSection
                    callingMode={callingMode}
                    setCallingMode={setCallingMode}
                    autoCallSeconds={autoCallSeconds}
                    setAutoCallSeconds={setAutoCallSeconds}
                    isTablet={isTablet}
                />

                <GameTwistSection
                    gameStyle={gameStyle}
                    setGameStyle={setGameStyle}
                    isTablet={isTablet}
                />

                <HostTicketsSection
                    hostTickets={hostTickets}
                    setHostTickets={setHostTickets}
                    ticketDifficulty={ticketDifficulty}
                    setTicketDifficulty={setTicketDifficulty}
                    isManual={callingMode === 'manual'}
                    isTablet={isTablet}
                />
            </ScrollView>

            <HostSettingsFooter
                onContinue={handleContinue}
                isLoading={isLoading}
                isScheduled={isScheduled}
                isTablet={isTablet}
            />
        </SafeAreaView>
    );
};

export default HousieHostSettingsScreen;
