import React from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import MandaliCoin from '../MandaliCoin';
import { getOptimizedImageUrl } from '../../lib/api';

interface Prize {
    name: string;
    amount: number;
    wonAt: string;
}

interface Player {
    userId: string;
    name: string;
    avatarUrl?: string;
    totalWon: number;
    prizes: Prize[];
}

interface PlayerPrizesModalProps {
    visible: boolean;
    player: Player | null;
    onClose: () => void;
    isTablet: boolean;
    bottomInset: number;
}

export const PlayerPrizesModal = ({ 
    visible, 
    player, 
    onClose, 
    isTablet, 
    bottomInset 
}: PlayerPrizesModalProps) => {
    if (!player) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View className="flex-1 justify-end bg-black/50">
                <View 
                    className={`bg-[#fdf9f3] rounded-t-[40px] ${isTablet ? 'p-12' : 'p-6'}`}
                    style={{ height: '70%', paddingBottom: bottomInset + 20 }}
                >
                    {/* Modal Header */}
                    <View className="flex-row items-center justify-between mb-8">
                        <Text className={`text-[#594048] font-headline-bold ${isTablet ? 'text-4xl' : 'text-2xl'}`}>
                            Hall of Fame
                        </Text>
                        <TouchableOpacity 
                            onPress={onClose}
                            className="bg-stone-100 p-2 rounded-full"
                        >
                            <MaterialIcons name="close" size={24} color="#a09d96" />
                        </TouchableOpacity>
                    </View>

                    {/* Player Info Card */}
                    <View className="flex-row items-center mb-10 bg-white p-5 rounded-[32px] border border-stone-100 shadow-sm">
                        <View className={`rounded-full bg-stone-100 overflow-hidden border-2 border-white ${isTablet ? 'w-24 h-24 mr-6' : 'w-16 h-16 mr-4'}`}>
                            {player.avatarUrl ? (
                                <Image
                                    source={{ uri: getOptimizedImageUrl(player.avatarUrl, 'w_200,q_auto,f_auto') }}
                                    className="w-full h-full"
                                />
                            ) : (
                                <View className="w-full h-full items-center justify-center bg-[#b30069]/10">
                                    <Text className="text-[#b30069] font-headline-bold text-2xl">
                                        {player.name?.[0]?.toUpperCase()}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <View className="flex-1">
                            <Text className={`text-[#594048] font-headline-bold ${isTablet ? 'text-3xl' : 'text-xl'}`}>
                                {player.name}
                            </Text>
                            <View className="flex-row items-center mt-1">
                                <Text className="text-stone-400 font-body-bold">Total Won: </Text>
                                <Text className="text-[#b30069] font-headline-bold text-lg">
                                    {player.totalWon.toLocaleString()}
                                </Text>
                                <MandaliCoin size={16} style={{ marginLeft: 4 }} />
                            </View>
                        </View>
                    </View>

                    {/* Prize List */}
                    <Text className="text-stone-400 font-body-bold uppercase tracking-widest mb-4 ml-2">
                        Recent Rewards
                    </Text>
                    <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
                        {(player.prizes || []).map((prize, idx) => (
                            <View 
                                key={idx}
                                className="flex-row items-center justify-between py-4 border-b border-stone-50"
                            >
                                <View className="flex-1 mr-4">
                                    <Text className="text-[#594048] font-body-bold text-base" numberOfLines={1}>
                                        {prize.name}
                                    </Text>
                                    <Text className="text-stone-400 font-body-medium text-xs mt-0.5">
                                        {new Date(prize.wonAt).toLocaleDateString(undefined, { 
                                            month: 'short', 
                                            day: 'numeric',
                                            year: 'numeric'
                                        })}
                                    </Text>
                                </View>
                                <View className="flex-row items-center">
                                    <Text className="text-[#594048] font-headline-bold text-base mr-2">
                                        {prize.amount.toLocaleString()}
                                    </Text>
                                    <MandaliCoin size={14} />
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};
