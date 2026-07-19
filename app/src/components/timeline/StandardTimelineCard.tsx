import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { formatDistanceToNow } from 'date-fns';
import { getOptimizedImageUrl, GroupTimelineItem } from '../../lib/api';
import { getTimelineTone, getTypeLabel, getTimelineImage, formatTimelineDate } from '../../utils/timelineUtils';

export const StandardTimelineCard = ({
    item,
    isTablet,
}: {
    item: GroupTimelineItem;
    isTablet: boolean;
}) => {
    const tone = getTimelineTone(item.type);
    const imageUrl = getTimelineImage(item);
    const timeAgo = item.occurredAt ? formatDistanceToNow(new Date(item.occurredAt), { addSuffix: true }) : '';

    return (
        <View className={`flex-row ${isTablet ? 'mb-8' : 'mb-5'}`}>
            <View className="items-center mr-4">
                <View
                    style={{ backgroundColor: tone.bg }}
                    className={`rounded-full items-center justify-center border border-white ${isTablet ? 'w-16 h-16' : 'w-11 h-11'}`}
                >
                    <Ionicons name={tone.icon as any} size={isTablet ? 28 : 19} color={tone.color} />
                </View>
                <View className="w-[2px] flex-1 bg-stone-200 mt-3" />
            </View>

            <View className={`flex-1 bg-white border border-stone-100 rounded-[28px] shadow-sm ${isTablet ? 'p-7' : 'p-4'}`}>
                <View className="flex-row items-start">
                    <View className="flex-1 pr-3">
                        <Text className={`font-body-bold uppercase tracking-widest ${isTablet ? 'text-base' : 'text-[10px]'}`} style={{ color: tone.color }}>
                            {getTypeLabel(item.type)} • {timeAgo}
                        </Text>
                        <Text className={`font-headline-bold text-[#1c1c18] mt-1 ${isTablet ? 'text-3xl leading-tight' : 'text-[16px] leading-6'}`}>
                            {item.title}
                        </Text>
                        {!!item.subtitle && (
                            <Text className={`font-body-medium text-[#594048]/70 mt-1.5 ${isTablet ? 'text-xl leading-7' : 'text-[12px] leading-5'}`}>
                                {item.subtitle}
                            </Text>
                        )}
                    </View>

                    {imageUrl ? (
                        <View className={`rounded-[20px] overflow-hidden bg-stone-100 ${isTablet ? 'w-28 h-28' : 'w-16 h-16'}`}>
                            <Image
                                source={{ uri: getOptimizedImageUrl(imageUrl, 'w_240,q_auto,f_auto') }}
                                style={{ width: '100%', height: '100%' }}
                                contentFit="cover"
                            />
                        </View>
                    ) : null}
                </View>

                <View className="flex-row items-center justify-between mt-4 pt-4 border-t border-stone-100">
                    <View className="flex-row items-center flex-1">
                        {item.actor?.avatarUrl ? (
                            <Image
                                source={{ uri: getOptimizedImageUrl(item.actor.avatarUrl, 'w_100,q_auto,f_auto') }}
                                style={{ width: isTablet ? 34 : 24, height: isTablet ? 34 : 24, borderRadius: 999 }}
                                contentFit="cover"
                            />
                        ) : (
                            <View className={`rounded-full bg-stone-100 items-center justify-center ${isTablet ? 'w-9 h-9' : 'w-6 h-6'}`}>
                                <Ionicons name="person" size={isTablet ? 17 : 11} color="#a09d96" />
                            </View>
                        )}
                        <Text className={`font-body-bold text-[#594048]/60 ml-2 flex-1 ${isTablet ? 'text-base' : 'text-[11px]'}`} numberOfLines={1}>
                            {item.actor?.name || 'Mandali'}
                        </Text>
                    </View>
                    <Text className={`font-body-medium text-[#594048]/40 ${isTablet ? 'text-base' : 'text-[11px]'}`}>
                        {formatTimelineDate(item.occurredAt)}
                    </Text>
                </View>
            </View>
        </View>
    );
};
