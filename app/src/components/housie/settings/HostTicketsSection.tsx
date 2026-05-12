import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Switch } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface HostTicketsSectionProps {
    hostTickets: number;
    setHostTickets: React.Dispatch<React.SetStateAction<number>>;
    ticketDifficulty: string;
    setTicketDifficulty: (diff: string) => void;
    isManual: boolean;
    isTablet: boolean;
}

export const HostTicketsSection: React.FC<HostTicketsSectionProps> = React.memo(({
    hostTickets,
    setHostTickets,
    ticketDifficulty,
    setTicketDifficulty,
    isManual,
    isTablet,
}) => {
    const [ticketCount, setTicketCount] = useState('1');

    const countOptionsMap: Record<string, string[]> = {
        easy: ['1', '2'],
        medium: ['3', '4'],
        hard: ['5', '6'],
    };
    const countOptions = countOptionsMap[ticketDifficulty] || ['1', '2'];

    const handleDifficulty = (diff: 'easy' | 'medium' | 'hard') => {
        setTicketDifficulty(diff);
        const defaultCount = { easy: '1', medium: '3', hard: '5' }[diff];
        setTicketCount(defaultCount);
        setHostTickets(parseInt(defaultCount));
    };

    const handleCount = (count: string) => {
        setTicketCount(count);
        setHostTickets(parseInt(count));
    };

    return (
        <View className="mb-8">
            {/* Header row with switch */}
            <View className="flex-row justify-between items-center mb-2">
                <View className="flex-1 mr-4">
                    <Text className="font-headline-bold text-[#1c1c18]" style={{ fontSize: isTablet ? 24 : 18 }}>
                        Host Tickets
                    </Text>
                    {isManual && (
                        <Text className="font-body-regular text-stone-400 mt-1" style={{ fontSize: 12 }}>
                            Not available in Manual mode
                        </Text>
                    )}
                </View>
                <Switch
                    value={hostTickets > 0}
                    disabled={isManual}
                    onValueChange={val => {
                        if (val) {
                            setHostTickets(parseInt(ticketCount));
                        } else {
                            setHostTickets(0);
                        }
                    }}
                    trackColor={{ false: '#e5e5e5', true: '#b30069' }}
                    thumbColor="white"
                    style={{ opacity: isManual ? 0.4 : 1 }}
                />
            </View>

            {!isManual && (
                <Text className="font-body-regular text-stone-500 mb-5" style={{ fontSize: isTablet ? 16 : 14 }}>
                    Play along while hosting — grab tickets for yourself.
                </Text>
            )}

            {hostTickets > 0 && !isManual && (
                <View className="gap-6">
                    {/* Step 1 — Difficulty */}
                    <View>
                        <Text className={`text-[#594048] font-body-bold uppercase tracking-widest mb-3 ml-2 ${isTablet ? 'text-xl' : 'text-xs'}`}>
                            Select Difficulty
                        </Text>
                        <View className="flex-row justify-between gap-3">
                            <TouchableOpacity
                                onPress={() => handleDifficulty('easy')}
                                className={`flex-1 rounded-[24px] items-center justify-center border shadow-sm ${isTablet ? 'h-24' : 'h-16'} ${ticketDifficulty === 'easy' ? 'bg-[#b30069] border-[#b30069]' : 'bg-white border-stone-100'}`}
                            >
                                <Text className={`font-headline-bold ${ticketDifficulty === 'easy' ? 'text-white' : 'text-[#1c1c18]'} ${isTablet ? 'text-2xl' : 'text-base'}`}>
                                    Easy
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => handleDifficulty('medium')}
                                className={`flex-1 rounded-[24px] items-center justify-center border shadow-sm ${isTablet ? 'h-24' : 'h-16'} ${ticketDifficulty === 'medium' ? 'bg-[#f59e0b] border-[#f59e0b]' : 'bg-white border-stone-100'}`}
                            >
                                <View className="absolute top-1.5 right-1.5 bg-[#31302d] px-1.5 py-0.5 rounded-lg flex-row items-center">
                                    <MaterialCommunityIcons name="crown" size={8} color="#fbbf24" />
                                    <Text className="text-[6px] font-headline-bold text-[#fbbf24] uppercase ml-1">Pro</Text>
                                </View>
                                <Text className={`font-headline-bold ${ticketDifficulty === 'medium' ? 'text-white' : 'text-[#1c1c18]'} ${isTablet ? 'text-2xl' : 'text-base'}`}>
                                    Medium
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => handleDifficulty('hard')}
                                className={`flex-1 rounded-[24px] items-center justify-center border shadow-sm ${isTablet ? 'h-24' : 'h-16'} ${ticketDifficulty === 'hard' ? 'bg-[#ef4444] border-[#ef4444]' : 'bg-white border-stone-100'}`}
                            >
                                <View className="absolute top-1.5 right-1.5 bg-[#31302d] px-1.5 py-0.5 rounded-lg flex-row items-center">
                                    <MaterialCommunityIcons name="crown" size={8} color="#fbbf24" />
                                    <Text className="text-[6px] font-headline-bold text-[#fbbf24] uppercase ml-1">Pro</Text>
                                </View>
                                <Text className={`font-headline-bold ${ticketDifficulty === 'hard' ? 'text-white' : 'text-[#1c1c18]'} ${isTablet ? 'text-2xl' : 'text-base'}`}>
                                    Hard
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Step 2 — Ticket Count */}
                    <View>
                        <Text className={`text-[#594048] font-body-bold uppercase tracking-widest mb-3 ml-2 ${isTablet ? 'text-xl' : 'text-xs'}`}>
                            Choose Tickets
                        </Text>
                        <View className="flex-row gap-4">
                            {countOptions.map(count => (
                                <TouchableOpacity
                                    key={count}
                                    onPress={() => handleCount(count)}
                                    className={`flex-1 rounded-[24px] items-center justify-center border shadow-sm ${isTablet ? 'h-20' : 'h-14'} ${ticketCount === count ? 'bg-[#1c1c18] border-[#1c1c18]' : 'bg-white border-stone-200'}`}
                                >
                                    <Text className={`font-headline-bold ${ticketCount === count ? 'text-white' : 'text-[#1c1c18]'} ${isTablet ? 'text-2xl' : 'text-lg'}`}>
                                        {count} {count === '1' ? 'Ticket' : 'Tickets'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
});
