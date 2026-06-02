import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions, StyleSheet, ActivityIndicator, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Text as SvgText } from 'react-native-svg';
import { useIsTablet } from '../../hooks/useIsTablet';
import { useQuery } from '@tanstack/react-query';
import { fetchGroupPulse } from '../../lib/api';
import MeetupStreakCard from '../../components/pulse/MeetupStreakCard';

const GroupPulseScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute();
    const isTablet = useIsTablet();
    const [showInfo, setShowInfo] = useState(false);

    const { groupId } = route.params as { groupId: string };

    const { data: pulseData, isLoading } = useQuery({
        queryKey: ['groupPulse', groupId],
        queryFn: () => fetchGroupPulse(groupId),
    });

    if (isLoading || !pulseData) {
        return (
            <SafeAreaView className="flex-1 bg-[#FDF9F3]" edges={['top']}>
                {/* Header */}
                <View className={`flex-row items-center justify-between px-6 ${isTablet ? 'py-8' : 'py-4'}`}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        className={`items-center justify-center bg-white shadow-sm border border-stone-100 rounded-full ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}
                    >
                        <MaterialIcons name="arrow-back" size={isTablet ? 32 : 24} color="#594048" />
                    </TouchableOpacity>

                    <Text className={`font-headline-bold text-[#b30069] text-center flex-1 ${isTablet ? 'text-4xl' : 'text-xl'}`}>
                        Pulse Center
                    </Text>

                    <View className={isTablet ? 'w-16' : 'w-10'} />
                </View>
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#b30069" />
                </View>
            </SafeAreaView>
        );
    }

    const {
        pulseScore,
        pulseDelta,
        pulseRank,
        pulsePercentile,
        joinedMembers,
        totalMembers,
        joinedPercent,
        streakCount,
        pastPlans,
        plansCreated,
        totalMemories,
        gamesPlayed,
        hisaabSettled,
        activeMembersLast30d
    } = pulseData;

    // SVG Circular Gauge Calculations (CX=130, CY=120, R=90)
    // Gap is at the bottom. Start angle is 135° (bottom-left) to 405° (bottom-right) clockwise.
    const cx = 130;
    const cy = 120;
    const radius = 90;
    const startAngle = 135;
    const totalSweep = 270;
    
    // Filled sweep angle
    const progressSweep = (pulseScore / 100) * totalSweep;
    const progressEndAngle = startAngle + progressSweep;

    // Helper to calculate cartesian coords on circle
    const getCartesian = (centerX: number, centerY: number, r: number, angleDegrees: number) => {
        const angleRadians = (angleDegrees * Math.PI) / 180.0;
        return {
            x: centerX + r * Math.cos(angleRadians),
            y: centerY + r * Math.sin(angleRadians)
        };
    };

    // Background track path
    const bgStart = getCartesian(cx, cy, radius, startAngle);
    const bgEnd = getCartesian(cx, cy, radius, startAngle + totalSweep);
    const bgPath = `M ${bgStart.x} ${bgStart.y} A ${radius} ${radius} 0 1 1 ${bgEnd.x} ${bgEnd.y}`;

    // Active progress track path
    const activeStart = getCartesian(cx, cy, radius, startAngle);
    const activeEnd = getCartesian(cx, cy, radius, progressEndAngle);
    const largeArcFlag = progressSweep <= 180 ? '0' : '1';
    const activePath = `M ${activeStart.x} ${activeStart.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${activeEnd.x} ${activeEnd.y}`;

    // Thumb position marker
    const thumbPos = getCartesian(cx, cy, radius, progressEndAngle);

    // SVG Circular Progress Mini Ring Coords (R=34)
    const miniRadius = 34;
    const miniCircumference = 2 * Math.PI * miniRadius;
    const strokeDashoffset = miniCircumference * (1 - joinedPercent / 100);

    return (
        <SafeAreaView className="flex-1 bg-[#FDF9F3]" edges={['top']}>
            {/* Header */}
            <View className={`flex-row items-center justify-between px-6 ${isTablet ? 'py-8' : 'py-4'}`}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className={`items-center justify-center bg-white shadow-sm border border-stone-100 rounded-full ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}
                >
                    <MaterialIcons name="arrow-back" size={isTablet ? 32 : 24} color="#594048" />
                </TouchableOpacity>

                <Text className={`font-headline-bold text-[#b30069] text-center flex-1 ${isTablet ? 'text-4xl' : 'text-xl'}`}>
                    Pulse Center
                </Text>

                <TouchableOpacity
                    onPress={() => setShowInfo(true)}
                    activeOpacity={0.7}
                    className={`items-center justify-center bg-white shadow-sm border border-stone-100 rounded-full ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}
                >
                    <Ionicons name="information-circle-outline" size={isTablet ? 30 : 22} color="#594048" />
                </TouchableOpacity>
            </View>

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 10, paddingBottom: 60 }}
            >
                {/* SVG Dial Gauge Wrapper */}
                <View className="items-center justify-center relative w-full mb-3" style={{ height: isTablet ? 320 : 250 }}>
                    {/* SVG Gauge */}
                    <Svg width={isTablet ? 360 : 260} height={isTablet ? 320 : 240} viewBox="0 0 260 240">
                        <Defs>
                            <LinearGradient id="pulseDialGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                                <Stop offset="0%" stopColor="#7828c8" />
                                <Stop offset="50%" stopColor="#b30069" />
                                <Stop offset="100%" stopColor="#ff8a00" />
                            </LinearGradient>
                        </Defs>

                        {/* Background track (faint arc) */}
                        <Path
                            d={bgPath}
                            fill="none"
                            stroke="#f5ebe0"
                            strokeWidth={14}
                            strokeLinecap="round"
                        />

                        {/* Active Progress sweep */}
                        <Path
                            d={activePath}
                            fill="none"
                            stroke="url(#pulseDialGradient)"
                            strokeWidth={14}
                            strokeLinecap="round"
                        />

                        {/* Glowing end point thumb */}
                        <Circle
                            cx={thumbPos.x}
                            cy={thumbPos.y}
                            r={9}
                            fill="white"
                            stroke="#ff8a00"
                            strokeWidth={3}
                        />
                    </Svg>

                    {/* Numeric and badge details overlay absolute centered */}
                    <View className="absolute items-center justify-center top-[30px]" style={{ height: 160 }}>
                        <Text className={`font-headline-bold text-[#1c1c18] ${isTablet ? 'text-7xl mb-1' : 'text-5xl mb-0.5'}`}>
                            {pulseScore}
                        </Text>
                        <Text className={`font-body-bold text-[#594048]/50 tracking-[2px] ${isTablet ? 'text-lg mb-4' : 'text-[11px] mb-2.5'}`}>
                            PULSE
                        </Text>
                        {(() => {
                            const getPulseStatus = (score: number) => {
                                if (score >= 80) return { label: 'Highly Active', emoji: '⚡', color: '#ea580c', bg: '#fff2e8' };
                                if (score >= 50) return { label: 'Moderately Active', emoji: '🔥', color: '#b30069', bg: '#fdf0f5' };
                                if (score >= 20) return { label: 'Active', emoji: '✨', color: '#7828c8', bg: '#fbf7ff' };
                                return { label: 'Calm', emoji: '💤', color: '#594048', bg: '#f5ebe0' };
                            };
                            const status = getPulseStatus(pulseScore);
                            return (
                                <View 
                                    style={{ backgroundColor: status.bg, borderColor: status.color + '15' }}
                                    className="border px-3 py-1 rounded-full flex-row items-center"
                                >
                                    <Text 
                                        style={{ color: status.color }}
                                        className={`font-body-bold mr-1 ${isTablet ? 'text-base' : 'text-[11px]'}`}
                                    >
                                        {status.emoji}
                                    </Text>
                                    <Text 
                                        style={{ color: status.color }}
                                        className={`font-body-bold ${isTablet ? 'text-base' : 'text-[11px]'}`}
                                    >
                                        {status.label}
                                    </Text>
                                </View>
                            );
                        })()}
                    </View>
                </View>

                {/* Subtitle green trends */}
                <View className="items-center mb-6">
                    <View className="bg-white border border-[#22c55e]/10 px-4 py-2 rounded-full flex-row items-center shadow-sm">
                        <Text className={`text-[#22c55e] font-body-bold ${isTablet ? 'text-[18px]' : 'text-[13px]'}`}>
                            ↑ +{pulseDelta} from last week
                        </Text>
                    </View>
                </View>

                {/* Card 1: Participation This Week */}
                <View
                    style={{ elevation: 2 }}
                    className={`bg-white rounded-[32px] border border-stone-100 shadow-sm mb-6 ${isTablet ? 'p-8' : 'p-5'}`}
                >
                    {/* Header */}
                    <View className="flex-row items-center mb-6">
                        <View className={`bg-[#b30069]/10 rounded-full items-center justify-center mr-3.5 ${isTablet ? 'w-12 h-12' : 'w-9 h-9'}`}>
                            <Ionicons name="people-sharp" size={isTablet ? 24 : 16} color="#b30069" />
                        </View>
                        <Text className={`font-headline-bold text-[#1c1c18] ${isTablet ? 'text-3xl' : 'text-[16px]'}`}>
                            Participation This Week
                        </Text>
                    </View>

                    {/* Numeric Progress Ring layout */}
                    <View className="flex-row items-center justify-between mb-5">
                        <View className="flex-1">
                            <View className="flex-row items-baseline mb-1">
                                <Text className={`font-headline-bold text-[#b30069] ${isTablet ? 'text-5xl' : 'text-3xl'}`}>
                                    {joinedMembers}
                                </Text>
                                <Text className={`font-headline-bold text-[#594048]/40 ml-1.5 ${isTablet ? 'text-3xl' : 'text-lg'}`}>
                                    / {totalMembers}
                                </Text>
                            </View>
                            <Text className={`font-body-medium text-[#594048]/60 ${isTablet ? 'text-xl' : 'text-[12px]'}`}>
                                Members Engaged
                            </Text>
                        </View>
                        {/* Simple Percentage Pill */}
                        <View className="bg-[#b30069]/10 rounded-full px-3 py-1 ml-4 justify-center items-center">
                            <Text className="text-[#b30069] font-headline-bold text-[14px]">
                                {joinedPercent}%
                            </Text>
                        </View>
                    </View>

                    {/* Horizontal slider progress bar */}
                    <View className="relative w-full justify-center mb-5" style={{ height: 8 }}>
                        <View className="w-full h-full bg-stone-100 rounded-full" />
                        <View 
                            style={{ width: `${joinedPercent}%` }}
                            className="absolute h-full bg-[#b30069] rounded-full justify-center items-end"
                        >
                            <View className="w-3.5 h-3.5 rounded-full bg-white border border-[#b30069] -mr-1.5 shadow-sm" />
                        </View>
                    </View>

                    {/* Subtext info alert */}
                    <Text className={`font-body-medium text-[#594048]/75 leading-relaxed ${isTablet ? 'text-lg mt-2' : 'text-[12px]'}`}>
                        {(() => {
                            if (joinedPercent >= 80) return 'Incredible turnout! You all are super close! 🌟';
                            if (joinedPercent >= 50) return 'Good participation! Keep meetups regular! 👍';
                            if (joinedPercent >= 30) return 'Less than half the Mandali joined recently 😢';
                            return 'Time to plan a reunion! Get everyone together! 👋';
                        })()}
                    </Text>
                </View>

                {/* Card 2: Meetup Streak */}
                <MeetupStreakCard streakCount={streakCount} isTablet={isTablet} groupId={groupId} pastPlans={pastPlans || []} />

                {/* Section 3: This Month Overview */}
                <View className="mb-4">
                    <Text className={`font-headline-bold text-[#b30069] mb-4 ${isTablet ? 'text-3xl mb-6' : 'text-[18px]'}`}>
                        This Month Overview
                    </Text>

                    {/* 4 Cells Grid */}
                    <View className="flex-row justify-between" style={{ gap: isTablet ? 16 : 8 }}>
                        {/* Plans Created */}
                        <View
                            style={{ elevation: 1 }}
                            className={`flex-1 bg-white border border-stone-50 rounded-2xl items-center shadow-sm ${isTablet ? 'p-5' : 'p-3'}`}
                        >
                            <Text className={`font-headline-bold text-[#b30069] ${isTablet ? 'text-3xl' : 'text-[17px]'}`}>
                                {plansCreated}
                            </Text>
                            <Text className={`font-body-bold text-[#594048]/60 text-center mt-1 leading-[14px] ${isTablet ? 'text-lg mt-2 leading-[20px]' : 'text-[9.5px]'}`}>
                                Plans{"\n"}Created
                            </Text>
                        </View>

                        {/* Games Played */}
                        <View
                            style={{ elevation: 1 }}
                            className={`flex-1 bg-white border border-stone-50 rounded-2xl items-center shadow-sm ${isTablet ? 'p-5' : 'p-3'}`}
                        >
                            <Text className={`font-headline-bold text-[#b30069] ${isTablet ? 'text-3xl' : 'text-[17px]'}`}>
                                {gamesPlayed}
                            </Text>
                            <Text className={`font-body-bold text-[#594048]/60 text-center mt-1 leading-[14px] ${isTablet ? 'text-lg mt-2 leading-[20px]' : 'text-[9.5px]'}`}>
                                Games{"\n"}Played
                            </Text>
                        </View>

                        {/* Memories Shared */}
                        <View
                            style={{ elevation: 1 }}
                            className={`flex-1 bg-white border border-stone-50 rounded-2xl items-center shadow-sm ${isTablet ? 'p-5' : 'p-3'}`}
                        >
                            <Text className={`font-headline-bold text-[#b30069] ${isTablet ? 'text-3xl' : 'text-[17px]'}`}>
                                {totalMemories}
                            </Text>
                            <Text className={`font-body-bold text-[#594048]/60 text-center mt-1 leading-[14px] ${isTablet ? 'text-lg mt-2 leading-[20px]' : 'text-[9.5px]'}`}>
                                Memories{"\n"}Shared
                            </Text>
                        </View>

                        {/* Hisaab Settled */}
                        <View
                            style={{ elevation: 1 }}
                            className={`flex-1 bg-white border border-stone-50 rounded-2xl items-center shadow-sm ${isTablet ? 'p-5' : 'p-3'}`}
                        >
                            <Text className={`font-headline-bold text-[#b30069] ${isTablet ? 'text-3xl' : 'text-[15px]'}`} numberOfLines={1} adjustsFontSizeToFit>
                                {hisaabSettled}
                            </Text>
                            <Text className={`font-body-bold text-[#594048]/60 text-center mt-1 leading-[14px] ${isTablet ? 'text-lg mt-2 leading-[20px]' : 'text-[9.5px]'}`}>
                                Hisaab{"\n"}Settled
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Pulse Explanation Modal */}
            <Modal
                visible={showInfo}
                transparent
                animationType="fade"
                onRequestClose={() => setShowInfo(false)}
            >
                <Pressable className="flex-1 bg-black/60 justify-center items-center p-6" onPress={() => setShowInfo(false)}>
                    <Pressable className={`bg-white rounded-[32px] w-full shadow-2xl ${isTablet ? 'p-10 max-w-xl' : 'p-6 max-w-sm'}`} onPress={e => e.stopPropagation()}>
                        <View className="flex-row items-center justify-between mb-6">
                            <View className="flex-row items-center">
                                <Text className={`mr-3 ${isTablet ? 'text-4xl' : 'text-2xl'}`}>🔥</Text>
                                <Text className={`font-headline-bold text-[#b30069] ${isTablet ? 'text-3xl' : 'text-xl'}`}>How Pulse Works</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowInfo(false)} className="bg-stone-100 rounded-full p-2">
                                <Ionicons name="close" size={20} color="#594048" />
                            </TouchableOpacity>
                        </View>
                        
                        <Text className={`font-body-medium text-stone-600 mb-6 ${isTablet ? 'text-xl' : 'text-[15px]'}`}>
                            Group Pulse measures how active your Mandali is. The score grows as you make memories, but slowly fades over time to keep things fresh.
                        </Text>
                        
                        <View className="mb-8">
                            <View>
                                <Text className={`font-headline-bold text-[#1c1c18] mb-1 ${isTablet ? 'text-2xl' : 'text-base'}`}>📅 Plans</Text>
                                <Text className={`font-body-medium text-stone-600 ${isTablet ? 'text-xl' : 'text-sm'}`}>• +10 pts for creating a plan</Text>
                                <Text className={`font-body-medium text-stone-600 ${isTablet ? 'text-xl' : 'text-sm'}`}>• +5 pts when it happens</Text>
                                <Text className={`font-body-medium text-stone-600 ${isTablet ? 'text-xl' : 'text-sm'}`}>• +3 pts per RSVP</Text>
                            </View>
                            
                            <View className="mt-5">
                                <Text className={`font-headline-bold text-[#1c1c18] mb-1 ${isTablet ? 'text-2xl' : 'text-base'}`}>🎮 Games</Text>
                                <Text className={`font-body-medium text-stone-600 ${isTablet ? 'text-xl' : 'text-sm'}`}>• +8 pts for playing</Text>
                                <Text className={`font-body-medium text-stone-600 ${isTablet ? 'text-xl' : 'text-sm'}`}>• +2 pts for every extra player</Text>
                                <Text className={`font-body-medium text-stone-600 ${isTablet ? 'text-xl' : 'text-sm'}`}>• +3 pts for rematches</Text>
                            </View>
                            
                            <View className="mt-5">
                                <Text className={`font-headline-bold text-[#1c1c18] mb-1 ${isTablet ? 'text-2xl' : 'text-base'}`}>📸 Memories</Text>
                                <Text className={`font-body-medium text-stone-600 ${isTablet ? 'text-xl' : 'text-sm'}`}>• +5 pts per uploader</Text>
                                <Text className={`font-body-medium text-stone-600 ${isTablet ? 'text-xl' : 'text-sm'}`}>• +2 pts for captions</Text>
                                <Text className={`font-body-medium text-stone-600 ${isTablet ? 'text-xl' : 'text-sm'}`}>• +1 pt per reaction</Text>
                            </View>
                        </View>
                        
                        <View className="bg-[#b30069]/5 p-4 rounded-2xl">
                            <Text className={`font-body-bold text-[#b30069] ${isTablet ? 'text-xl' : 'text-[13px]'}`}>
                                💡 Tip: High group participation multiplies your score, making every moment count!
                            </Text>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
};

export default GroupPulseScreen;
