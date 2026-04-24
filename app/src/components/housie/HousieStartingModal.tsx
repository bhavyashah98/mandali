import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Animated, useWindowDimensions, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { useIsTablet } from '../../hooks/useIsTablet';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MandaliCoin from '../MandaliCoin';

interface HousieStartingModalProps {
    visible: boolean;
    game: any;
    onComplete?: () => void;
}

const HousieStartingModal: React.FC<HousieStartingModalProps> = ({ visible, game, onComplete }) => {
    const { width, height } = useWindowDimensions();
    const isTablet = useIsTablet();
    const [activeTab, setActiveTab] = useState<'prizes' | 'players'>('prizes');
    const [secondsLeft, setSecondsLeft] = useState(15);
    const progressAnim = React.useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (!visible || !game?.last_activity_at) return;

        const calculateTime = () => {
            const startTime = new Date(game.last_activity_at).getTime();
            const now = Date.now();
            const elapsed = (now - startTime) / 1000;
            const remaining = Math.max(0, 15 - elapsed);
            
            setSecondsLeft(Math.ceil(remaining));
            progressAnim.setValue(remaining / 15);

            if (remaining <= 0 && onComplete) {
                onComplete();
                return 0;
            }
            return remaining;
        };

        const remaining = calculateTime();
        if (remaining <= 0) return;

        const interval = setInterval(() => {
            const rem = calculateTime();
            if (rem <= 0) clearInterval(interval);
        }, 1000);

        // Animate the progress bar smoothly from current position to 0
        Animated.timing(progressAnim, {
            toValue: 0,
            duration: remaining * 1000,
            useNativeDriver: false,
        }).start();

        return () => {
            clearInterval(interval);
        };
    }, [visible, game?.last_activity_at]);

    if (!visible) return null;

    const participants = game?.participants || [];
    const prizes = game?.prizes || [];

    return (
        <Modal transparent visible={visible} animationType="fade">
            <View className="flex-1 justify-center items-center bg-black/80">
                <BlurView intensity={40} className="absolute w-full h-full" tint="dark" />
                
                <View 
                    style={{ width: width * 0.92, height: height * 0.8 }}
                    className="bg-white rounded-[48px] overflow-hidden shadow-2xl"
                >
                    {/* Glowing Header Area */}
                    <View className="items-center justify-center pt-8 pb-6 px-6 bg-[#fdf9f3]">
                        <View className="w-full absolute top-0 h-full overflow-hidden">
                            <LinearGradient
                                colors={['rgba(179,0,105,0.08)', 'rgba(179,0,105,0)']}
                                className="w-full h-full"
                            />
                        </View>
                        
                        <View className="bg-white px-6 py-2 rounded-full mb-4 border border-primary/20 shadow-sm shadow-primary/10">
                            <Text className={`text-primary font-body-bold uppercase tracking-[4px] ${isTablet ? 'text-lg' : 'text-[10px]'}`}>Game Starting</Text>
                        </View>
                        
                        <View className="items-center justify-center flex-row relative">
                            <Text 
                                className="text-[#1c1c18] font-headline-bold text-center" 
                                style={{ fontSize: isTablet ? 100 : 72, lineHeight: isTablet ? 110 : 80, includeFontPadding: false }}
                            >
                                {secondsLeft}
                            </Text>
                            <Text 
                                className="text-stone-300 font-headline-bold relative" 
                                style={{ fontSize: isTablet ? 44 : 30, top: isTablet ? -22 : -16, left: 4 }}
                            >
                                s
                            </Text>
                        </View>
                        
                        {/* Elegant Progress Bar */}
                        <View className="w-3/4 bg-stone-200/50 rounded-full mt-4 overflow-hidden" style={{ height: isTablet ? 10 : 5 }}>
                            <Animated.View 
                                style={{ 
                                    width: progressAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: ['0%', '100%']
                                    })
                                }}
                                className="h-full bg-primary rounded-full" 
                            />
                        </View>
                    </View>

                    {/* Modern Pill Tabs */}
                    <View className="flex-row px-6 pt-6 pb-2 bg-white">
                        <TouchableOpacity 
                            onPress={() => setActiveTab('prizes')}
                            activeOpacity={0.8}
                            className={`flex-1 flex-row items-center justify-center rounded-full mr-2 border shadow-sm ${isTablet ? 'py-5' : 'py-3'} ${activeTab === 'prizes' ? 'bg-primary border-primary shadow-primary/20' : 'bg-stone-50 border-stone-100 shadow-transparent'}`}
                        >
                            <MaterialIcons name="emoji-events" size={isTablet ? 24 : 18} color={activeTab === 'prizes' ? 'white' : '#a09d96'} />
                            <Text className={`font-headline-bold ml-2 ${isTablet ? 'text-2xl' : 'text-sm'} ${activeTab === 'prizes' ? 'text-white' : 'text-stone-400'}`}>Rewards ({prizes.length})</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            onPress={() => setActiveTab('players')}
                            activeOpacity={0.8}
                            className={`flex-1 flex-row items-center justify-center rounded-full ml-2 border shadow-sm ${isTablet ? 'py-5' : 'py-3'} ${activeTab === 'players' ? 'bg-[#f5f5f4] border-stone-200 shadow-stone-200' : 'bg-stone-50 border-stone-100 shadow-transparent'}`}
                            style={{ backgroundColor: activeTab === 'players' ? '#594048' : undefined, borderColor: activeTab === 'players' ? '#594048' : undefined }}
                        >
                            <MaterialIcons name="people" size={isTablet ? 24 : 18} color={activeTab === 'players' ? 'white' : '#a09d96'} />
                            <Text className={`font-headline-bold ml-2 ${isTablet ? 'text-2xl' : 'text-sm'} ${activeTab === 'players' ? 'text-white' : 'text-stone-400'}`}>Players ({participants.length})</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Content List */}
                    <ScrollView 
                        className="px-6 bg-white flex-1"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: Math.max(40, isTablet ? 80 : 40), paddingTop: 16 }}
                    >
                        {activeTab === 'prizes' ? (
                            <View className="gap-4">
                                {prizes.map((prize: any, idx: number) => (
                                    <View key={idx} className={`bg-[#fdf9f3] rounded-[24px] border border-stone-100 flex-row items-center ${isTablet ? 'p-6' : 'p-4'}`}>
                                        <View className={`rounded-full bg-primary/10 items-center justify-center mr-4 ${isTablet ? 'w-16 h-16' : 'w-12 h-12'}`}>
                                            <MaterialIcons name={prize.icon || 'stars'} size={isTablet ? 32 : 24} color="#b30069" />
                                        </View>
                                        <View className="flex-1">
                                            <Text className={`text-[#1c1c18] font-headline-bold ${isTablet ? 'text-2xl mb-1' : 'text-base'}`}>{prize.name}</Text>
                                            {prize.description ? (
                                                <Text className={`text-stone-400 font-body-medium ${isTablet ? 'text-lg' : 'text-[10px]'}`}>{prize.description}</Text>
                                            ) : null}
                                        </View>
                                        <View className="flex-row items-center bg-white px-4 py-2 rounded-full border border-stone-100 shadow-sm ml-2">
                                            <Text className={`font-headline-bold text-[#b30069] ${isTablet ? 'text-2xl' : 'text-lg'}`}>{prize.amount}</Text>
                                            <MandaliCoin size={isTablet ? 24 : 16} style={{ marginLeft: 6 }} />
                                        </View>
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <View className="gap-4">
                                {participants.map((player: any, idx: number) => (
                                    <View key={idx} className={`bg-white rounded-[24px] p-4 border border-stone-100 flex-row items-center ${isTablet ? 'p-6' : 'p-4'}`}>
                                        <View className={`rounded-full bg-stone-100 items-center justify-center mr-4 overflow-hidden border border-stone-200 ${isTablet ? 'w-16 h-16' : 'w-12 h-12'}`}>
                                            {player.avatar ? (
                                                <ActivityIndicator size="small" /> 
                                            ) : (
                                                <Text className={`text-stone-400 font-headline-bold ${isTablet ? 'text-2xl' : 'text-base'}`}>{player.name[0]}</Text>
                                            )}
                                        </View>
                                        <View className="flex-1">
                                            <Text className={`text-[#1c1c18] font-headline-bold ${isTablet ? 'text-2xl mb-1' : 'text-base'}`}>{player.name}</Text>
                                            <Text className={`text-primary/80 font-body-bold ${isTablet ? 'text-lg' : 'text-xs'}`}>{player.ticketCount} {parseInt(player.ticketCount) === 1 ? 'Ticket' : 'Tickets'}</Text>
                                        </View>
                                        <View className={`rounded-full bg-green-500 mr-2 ${isTablet ? 'w-4 h-4' : 'w-2 h-2'}`} />
                                    </View>
                                ))}
                            </View>
                        )}
                    </ScrollView>

                    {/* Footer Tip */}
                    <View className="px-6 py-4 bg-stone-50 items-center">
                        <Text className="text-stone-400 font-body-medium text-[10px] text-center italic">
                            "May the best ticket win! Please stay on this screen to avoid connection issues."
                        </Text>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export default HousieStartingModal;
