import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GroupTimelineItem } from '../../lib/api';
import { getTypeLabel, formatTimelineDate } from '../../utils/timelineUtils';

export const MilestoneTimelineCard = ({
    item,
    isTablet,
    onShareMilestone,
}: {
    item: GroupTimelineItem;
    isTablet: boolean;
    onShareMilestone: (item: GroupTimelineItem) => void;
}) => {
    return (
        <View className={`rounded-[32px] overflow-hidden border border-[#ea580c]/10 ${isTablet ? 'mb-8' : 'mb-5'}`}>
            <LinearGradient
                colors={['#fff7ed', '#fff0f5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ padding: isTablet ? 36 : 20 }}
            >
                <View className="flex-row items-start">
                    <View
                        style={{ backgroundColor: '#ffffff' }}
                        className={`rounded-full items-center justify-center mr-4 shadow-sm ${isTablet ? 'w-20 h-20' : 'w-14 h-14'}`}
                    >
                        <Ionicons name="sparkles" size={isTablet ? 34 : 24} color="#ea580c" />
                    </View>
                    <View className="flex-1">
                        <Text className={`font-body-bold uppercase tracking-widest text-[#ea580c] ${isTablet ? 'text-base' : 'text-[10px]'}`}>
                            {getTypeLabel(item.type)} • {formatTimelineDate(item.occurredAt)}
                        </Text>
                        <Text className={`font-headline-bold text-[#1c1c18] mt-1 ${isTablet ? 'text-4xl leading-tight' : 'text-xl leading-7'}`}>
                            {item.title}
                        </Text>
                        {!!item.subtitle && (
                            <Text className={`font-body-medium text-[#594048]/70 mt-2 ${isTablet ? 'text-xl leading-8' : 'text-sm leading-5'}`}>
                                {item.subtitle}
                            </Text>
                        )}
                        <TouchableOpacity
                            onPress={() => onShareMilestone(item)}
                            activeOpacity={0.85}
                            className={`self-start bg-[#1c1c18] rounded-full flex-row items-center ${isTablet ? 'mt-6 px-7 py-3' : 'mt-4 px-5 py-2.5'}`}
                        >
                            <Ionicons name="share-social" size={isTablet ? 22 : 15} color="white" />
                            <Text className={`font-body-bold text-white ml-2 ${isTablet ? 'text-lg' : 'text-xs'}`}>
                                Share
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </LinearGradient>
        </View>
    );
};
