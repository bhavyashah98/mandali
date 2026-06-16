import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { getOptimizedImageUrl } from '../../lib/api';
import type { PlanRsvpUser, PlanRsvpStatus } from '../../types/plans';
import PlanAvatarStack from './card/PlanAvatarStack';
import PlanCardBadge from './card/PlanCardBadge';
import PlanCardMeta from './card/PlanCardMeta';

export interface PlanCardPlan {
    id: string;
    groupId: string;
    activityLabel: string;
    activityIcon?: keyof typeof MaterialIcons.glyphMap;
    startsAt: string;
    location?: string | null;
    locationDetail?: string | null;
    placeId?: string | null;
    status: 'upcoming' | 'live' | 'past';
    groupName: string;
    groupCoverUrl?: string | null;
    going?: PlanRsvpUser[];
    goingCount?: number;
    placePhotoUrl?: string | null;
    groupDescription?: string | null;
    createdBy?: string;
    creatorName?: string | null;
    creatorAvatarUrl?: string | null;
    isHost?: boolean;
    hasRsvp?: boolean;
    myRsvp?: { status: PlanRsvpStatus; note?: string | null } | null;
    daysLabel?: string;
    section?: string;
    description?: string | null;
}

interface PlanCardProps {
    plan: PlanCardPlan;
    isTablet: boolean;
    showLiveBadge?: boolean;
    onPress?: () => void;
}

const cardStyle = { shadowColor: '#b30069', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 };

const PlanCard = ({ plan, isTablet, showLiveBadge, onPress }: PlanCardProps) => (
    <TouchableOpacity
        activeOpacity={0.86}
        onPress={onPress}
        disabled={!onPress}
        className="bg-white border border-stone-100 rounded-[20px] mb-4 overflow-hidden"
        style={cardStyle}
    >
        <View className={isTablet ? 'p-7' : 'p-5'}>
            <View className="flex-row items-center mb-4 pb-3 border-b border-stone-100/80">
                <View
                    className={`overflow-hidden bg-stone-50 border border-stone-100 ${isTablet ? 'w-11 h-11' : 'w-10 h-10'}`}
                    style={{ borderRadius: 14 }}
                >
                    {plan.groupCoverUrl ? (
                        <Image
                            source={{ uri: getOptimizedImageUrl(plan.groupCoverUrl, 'w_300,q_auto,f_auto') }}
                            style={{ width: '100%', height: '100%' }}
                            contentFit="cover"
                        />
                    ) : (
                        <View className="flex-1 items-center justify-center bg-[#b30069]/5">
                            <Text className="font-headline-bold text-[#b30069]" style={{ fontSize: isTablet ? 18 : 15, opacity: 0.4 }}>
                                {plan.groupName.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                    )}
                </View>
                <View className="flex-1 ml-3 justify-center">
                    <Text
                        className="font-body-bold text-[#1c1c18]"
                        style={{ fontSize: isTablet ? 15 : 13 }}
                        numberOfLines={1}
                    >
                        {plan.groupName}
                    </Text>
                </View>
                {plan.creatorName ? (
                    <View className="flex-row items-center ml-3 max-w-[42%]">
                        <View
                            className={`rounded-full overflow-hidden bg-[#fdeaf4] items-center justify-center ${isTablet ? 'w-8 h-8' : 'w-7 h-7'}`}
                        >
                            {plan.creatorAvatarUrl ? (
                                <Image
                                    source={{ uri: getOptimizedImageUrl(plan.creatorAvatarUrl, 'w_120,q_auto,f_auto') }}
                                    style={{ width: '100%', height: '100%' }}
                                    contentFit="cover"
                                />
                            ) : (
                                <Text className="font-body-bold text-[#b30069]" style={{ fontSize: isTablet ? 13 : 11 }}>
                                    {plan.creatorName.charAt(0).toUpperCase()}
                                </Text>
                            )}
                        </View>
                        <Text
                            className="font-body-bold text-[#594048] ml-2 flex-shrink"
                            style={{ fontSize: isTablet ? 13 : 11 }}
                            numberOfLines={1}
                        >
                            {plan.creatorName}
                        </Text>
                    </View>
                ) : null}
            </View>

            <View className="flex-row items-start justify-between mb-3">
                <View className="flex-row items-center flex-1 mr-3">
                    <View className={`${isTablet ? 'w-14 h-14' : 'w-12 h-12'} rounded-2xl items-center justify-center mr-3 bg-[#b30069]/10`}>
                        <MaterialIcons name={plan.activityIcon || 'event'} size={isTablet ? 28 : 23} color="#b30069" />
                    </View>
                    <View className="flex-1">
                        <Text className="font-headline-bold text-[#1c1c18]" style={{ fontSize: isTablet ? 26 : 18 }} numberOfLines={1}>{plan.activityLabel}</Text>
                        <PlanCardMeta {...plan} isTablet={isTablet} />
                    </View>
                </View>
                <PlanCardBadge label={plan.daysLabel} live={showLiveBadge && plan.status === 'live'} />
            </View>
            <PlanAvatarStack going={plan.going} goingCount={plan.goingCount} />
        </View>
    </TouchableOpacity>
);

export default PlanCard;
