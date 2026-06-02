import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable, ScrollView } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

interface MeetupStreakCardProps {
    streakCount: number;
    isTablet: boolean;
    groupId: string;
    pastPlans?: any[];
}

const MeetupStreakCard: React.FC<MeetupStreakCardProps> = ({ streakCount, isTablet, groupId, pastPlans = [] }) => {
    const navigation = useNavigation<any>();
    const [showHistory, setShowHistory] = useState(false);

    const handleViewHistory = () => {
        setShowHistory(true);
    };

    return (
        <View
            style={{ elevation: 2 }}
            className={`bg-white rounded-[32px] border border-stone-100 shadow-sm mb-8 ${isTablet ? 'p-8' : 'p-5'}`}
        >
            {/* Header */}
            <View className="flex-row items-center justify-between mb-6">
                <View className="flex-row items-center">
                    <View className={`bg-[#fff7ed] rounded-full items-center justify-center mr-3.5 ${isTablet ? 'w-12 h-12' : 'w-9 h-9'}`}>
                        <Ionicons name="flame" size={isTablet ? 24 : 16} color="#ea580c" />
                    </View>
                    <Text className={`font-headline-bold text-[#1c1c18] ${isTablet ? 'text-3xl' : 'text-[16px]'}`}>
                        Meetup Streak
                    </Text>
                </View>
                <TouchableOpacity className="flex-row items-center" onPress={handleViewHistory} activeOpacity={0.7}>
                    <Text className={`text-[#b30069] font-headline-bold mr-1 ${isTablet ? 'text-xl' : 'text-[13px]'}`}>
                        View history
                    </Text>
                    <MaterialIcons name="chevron-right" size={isTablet ? 22 : 16} color="#b30069" />
                </TouchableOpacity>
            </View>

            {/* Streak Count & Flames details */}
            <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-baseline">
                    <Text className={`font-headline-bold text-[#1c1c18] ${isTablet ? 'text-5xl' : 'text-3xl'}`}>
                        {streakCount}
                    </Text>
                    <Text className={`font-body-bold text-[#594048]/60 ml-2 ${isTablet ? 'text-xl' : 'text-[12px]'}`}>
                        Weekends Together
                    </Text>
                </View>

                {/* List of 6 flame icons representing streak */}
                <View className="flex-row items-center">
                    {Array.from({ length: 6 }).map((_, idx) => {
                        const isLit = idx < streakCount;
                        return (
                            <Ionicons 
                                key={idx} 
                                name="flame" 
                                size={isTablet ? 26 : 20} 
                                color={isLit ? "#ea580c" : "#e5e5e5"} 
                                style={{ marginRight: 2 }} 
                            />
                        );
                    })}
                </View>
            </View>

            {/* Subtext advice */}
            <Text className={`font-body-medium text-[#594048]/75 ${isTablet ? 'text-lg mt-2' : 'text-[12px]'}`}>
                Keep it going! ❤️
            </Text>

            {/* History Modal */}
            <Modal
                visible={showHistory}
                transparent
                animationType="fade"
                onRequestClose={() => setShowHistory(false)}
            >
                <Pressable className="flex-1 bg-black/60 justify-center items-center p-6" onPress={() => setShowHistory(false)}>
                    <Pressable className={`bg-white rounded-[32px] w-full shadow-2xl ${isTablet ? 'p-10 max-w-xl h-[600px]' : 'p-6 max-w-sm h-[400px]'}`} onPress={e => e.stopPropagation()}>
                        <View className="flex-row items-center justify-between mb-4">
                            <Text className={`font-headline-bold text-[#b30069] ${isTablet ? 'text-3xl' : 'text-xl'}`}>
                                Meetup History
                            </Text>
                            <TouchableOpacity onPress={() => setShowHistory(false)} className="bg-stone-100 rounded-full p-2">
                                <Ionicons name="close" size={20} color="#594048" />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView showsVerticalScrollIndicator={false} className="flex-1 mt-2">
                            {pastPlans.length === 0 ? (
                                <View className="flex-1 items-center justify-center py-10">
                                    <Text className="font-body-medium text-stone-500 text-center">No past meetups found.</Text>
                                </View>
                            ) : (
                                pastPlans.map((plan, index) => (
                                    <View key={plan.id} className="bg-stone-50 rounded-2xl p-4 mb-3 flex-row items-center justify-between">
                                        <View className="flex-1 pr-4">
                                            <Text className={`font-headline-bold text-[#1c1c18] mb-1 ${isTablet ? 'text-xl' : 'text-base'}`} numberOfLines={1}>
                                                {plan.title || 'Meetup'}
                                            </Text>
                                            <Text className={`font-body-medium text-stone-500 ${isTablet ? 'text-base' : 'text-[12px]'}`}>
                                                {new Date(plan.starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </Text>
                                        </View>
                                        <View className="bg-[#b30069]/10 rounded-full px-3 py-1">
                                            <Text className="text-[#b30069] font-body-bold text-[11px] uppercase">Past</Text>
                                        </View>
                                    </View>
                                ))
                            )}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
};

export default MeetupStreakCard;
