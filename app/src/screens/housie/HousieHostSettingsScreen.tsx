import React, { useState, useCallback } from 'react';
import { View, ScrollView, Alert, Modal, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MandaliDatePicker } from '../../components/MandaliDatePicker';


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
    const [title, setTitle] = useState('Housie Gathering');
    const [isScheduled, setIsScheduled] = useState(false);
    const [scheduledAt, setScheduledAt] = useState(new Date(Date.now() + 2 * 60 * 1000));
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

    const handleConfirmDate = (selectedDate: Date) => {
        setShowDatePicker(false);
        const newDate = new Date(scheduledAt);
        newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
        setScheduledAt(newDate);
    };

    const handleConfirmTime = (selectedTime: Date) => {
        setShowTimePicker(false);
        const newDate = new Date(scheduledAt);
        newDate.setHours(selectedTime.getHours(), selectedTime.getMinutes());
        setScheduledAt(newDate);
    };

    const handleContinue = useCallback(async () => {
        if (!groupId) {
            Alert.alert('Error', 'Group ID is missing.');
            return;
        }

        if (!title.trim()) {
            Alert.alert('Required Info', 'Please give your Housie room a title.');
            return;
        }

        if (isScheduled) {
            const oneMinuteFromNow = new Date(Date.now() + 1 * 60 * 1000);
            if (scheduledAt < oneMinuteFromNow) {
                const adjustedTime = new Date(Date.now() + 2 * 60 * 1000);
                setScheduledAt(adjustedTime);
                Alert.alert("Invalid Time", "Games must be scheduled at least 1 minute from now. We've adjusted the time for you.");
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

                <MandaliDatePicker
                    visible={showDatePicker}
                    mode="date"
                    value={scheduledAt}
                    onConfirm={handleConfirmDate}
                    onCancel={() => setShowDatePicker(false)}
                    minimumDate={new Date()}
                />

                <MandaliDatePicker
                    visible={showTimePicker}
                    mode="time"
                    value={scheduledAt}
                    onConfirm={handleConfirmTime}
                    onCancel={() => setShowTimePicker(false)}
                />

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
