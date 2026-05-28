import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, ScrollView, Alert, TouchableOpacity, ActivityIndicator, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

// API
import { createHousieGame, fetchHousiePrizeCatalogue } from '../../lib/api';

// Components
import HousiePrizeSelectionModal from '../../components/housie/bounty/HousiePrizeSelectionModal';
import BountyHeader from '../../components/housie/bounty/BountyHeader';
import PoolIndicator from '../../components/housie/bounty/PoolIndicator';
import PrizeCard from '../../components/housie/bounty/PrizeCard';
import BountyActionButtons from '../../components/housie/bounty/BountyActionButtons';
import FullHouseSelection from '../../components/housie/bounty/FullHouseSelection';

// Utils
import { distributePoolByWeightage } from '../../utils/housieBountyUtils';

const HousieDefineBountyScreen = ({ navigation, route }: any) => {
    const insets = useSafeAreaInsets();

    const { groupId, planId, gameSettings } = (route.params as { groupId: string; planId?: string; gameSettings: any }) || {};

    const [availablePrizes, setAvailablePrizes] = useState<any[]>([]);
    const [isLoadingPrizes, setIsLoadingPrizes] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [showSelectionModal, setShowSelectionModal] = useState(false);

    // Separated state for different prize types
    const [otherPrizes, setOtherPrizes] = useState<any[]>([]);
    const [fullHouseCount, setFullHouseCount] = useState(1);

    // Combined and distributed prizes for display
    const selectedPrizes = useMemo(() => {
        // 1. Get full house template
        const fhTemplate = availablePrizes.find(p => p.id === 'full_house') || {
            id: 'full_house',
            name: 'Full House',
            category: 'fullhouse',
            weightage: 15
        };

        // 2. Create the list of full houses
        const fullHouses = Array.from({ length: fullHouseCount }).map((_, i) => ({
            ...fhTemplate,
            id: `full_house_${i + 1}`,
            name: fullHouseCount === 1 ? 'Full House' : `Full House ${i + 1}`,
        }));

        // 3. Combine with other prizes and distribute
        return distributePoolByWeightage([...otherPrizes, ...fullHouses]);
    }, [otherPrizes, fullHouseCount, availablePrizes]);

    useEffect(() => {
        const loadPrizes = async () => {
            try {
                setIsLoadingPrizes(true);
                const mode = gameSettings?.callingMode || 'manual';
                const { prizes } = await fetchHousiePrizeCatalogue(mode);
                setAvailablePrizes(prizes);

                // Initial "Other Prizes": Top, Middle, Bottom Line
                const initialOthers = prizes.filter(p =>
                    ['top_line', 'middle_line', 'bottom_line'].includes(p.id)
                );
                setOtherPrizes(initialOthers);

            } catch (err) {
                console.error('Failed to load prize catalogue:', err);
                Alert.alert('Error', 'Failed to load prize list.');
            } finally {
                setIsLoadingPrizes(false);
            }
        };
        loadPrizes();
    }, [gameSettings?.callingMode]);

    const totalPercentage = useMemo(() => {
        return selectedPrizes.reduce((sum, p) => sum + (parseFloat(p.percentage) || 0), 0);
    }, [selectedPrizes]);

    const isValid = totalPercentage === 100;

    const handleConfirmSelection = (newlySelected: any[]) => {
        // Only update otherPrizes (modal doesn't handle Full Houses now)
        setOtherPrizes(newlySelected);
    };

    const handleUpdatePercentage = (id: string, val: string) => {
        // We need to allow manual overrides, but our useMemo will overwrite them
        // unless we store the overrides. For now, let's keep it simple and
        // just let the user edit the Combined list if they want, but useMemo makes it hard.
        // Actually, the user asked for "distribution according to weightage", 
        // so manual override is less important right now.
        // I'll skip manual override for a moment to ensure the weights work perfectly.
        Alert.alert('Fair Distribution', 'Percentages are automatically calculated based on prize difficulty to ensure a fair game.');
    };

    const handleRemovePrize = (id: string) => {
        if (id.startsWith('full_house')) {
            if (fullHouseCount > 1) setFullHouseCount(prev => prev - 1);
            else Alert.alert('Required', 'At least one Full House is required.');
        } else {
            setOtherPrizes(prev => prev.filter(p => p.id !== id));
        }
    };

    const handleCreateGame = useCallback(async () => {
        if (!isValid) {
            Alert.alert('Invalid Distribution', `Total percentage must be exactly 100%. Current: ${totalPercentage}%`);
            return;
        }

        try {
            setIsCreating(true);

            const result = await createHousieGame(
                groupId,
                {
                    callingMode: gameSettings.callingMode,
                    autoCallSeconds: gameSettings.autoCallSeconds,
                    hostTickets: gameSettings.hostTickets,
                    ticketDifficulty: gameSettings.ticketDifficulty,
                    gameStyle: gameSettings.gameStyle,
                    prizes: selectedPrizes.map(p => ({
                        id: p.id,
                        name: p.name,
                        type: p.type || p.id,
                        row: p.row,
                        description: p.description,
                        icon: p.icon,
                        percentage: p.percentage,
                        category: p.category,
                        weightage: p.weightage
                    }))
                },
                gameSettings.title,
                gameSettings.scheduledAt,
                100, // Hardcoded ticketPrice
                planId
            );

            if (gameSettings.isScheduled) {
                Alert.alert('Success', 'Game scheduled successfully!');
                navigation.goBack();
            } else {
                navigation.replace('HousieWaitingRoom', {
                    groupId,
                    gameCode: result.game.game_code,
                    planId,
                });
            }
        } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.error || 'Failed to create game.');
        } finally {
            setIsCreating(false);
        }
    }, [groupId, planId, gameSettings, selectedPrizes, totalPercentage, isValid, navigation]);

    return (
        <View className="flex-1 bg-[#fdf9f3]" style={{ paddingTop: insets.top }}>
            <BountyHeader
                onBack={() => navigation.goBack()}
                title="Define Prizes"
                subtitle="Fair distribution by difficulty"
            />

            <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 150 }}>
                <PoolIndicator totalPercentage={totalPercentage} isValid={isValid} />

                {/* Full House Selection Section */}
                <FullHouseSelection count={fullHouseCount} onCountChange={setFullHouseCount} />

                <View className="flex-row items-center justify-between mb-4 ml-2">
                    <Text className="font-headline-bold text-stone-800 text-lg">Other Rewards</Text>
                    <TouchableOpacity onPress={() => setShowSelectionModal(true)} className="bg-[#b30069]/10 px-4 py-1.5 rounded-xl">
                        <Text className="font-body-bold text-[#b30069] text-xs">Edit List</Text>
                    </TouchableOpacity>
                </View>

                {selectedPrizes.map((prize, index) => (
                    <PrizeCard
                        key={prize.id}
                        prize={prize}
                        index={index}
                        onUpdatePercentage={handleUpdatePercentage}
                        onRemove={handleRemovePrize}
                    />
                ))}

                <BountyActionButtons
                    onOpenSelection={() => setShowSelectionModal(true)}
                />
            </ScrollView>

            <View className="absolute bottom-0 w-full px-6 pt-4 pb-8 bg-[#fdf9f3] border-t border-stone-100">
                <TouchableOpacity
                    onPress={handleCreateGame}
                    disabled={isCreating || !isValid}
                    className={`w-full h-16 rounded-[32px] items-center justify-center shadow-lg ${isValid ? 'bg-[#b30069]' : 'bg-stone-300'}`}
                >
                    {isCreating ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="font-headline-bold text-white text-xl">
                            {gameSettings?.isScheduled ? 'Schedule Game' : 'Create & Open Room'}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>

            <HousiePrizeSelectionModal
                visible={showSelectionModal}
                onClose={() => setShowSelectionModal(false)}
                catalogue={availablePrizes}
                selectedPrizes={otherPrizes}
                onConfirm={handleConfirmSelection}
                isTablet={false}
            />
        </View>
    );
};

export default HousieDefineBountyScreen;
