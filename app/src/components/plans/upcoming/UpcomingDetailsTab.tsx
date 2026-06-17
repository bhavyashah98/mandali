import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import type { PlanCardPlan } from '../PlanCard';
import { openPlanLocationInMaps } from '../../../lib/planMaps';
import { formatLiveDate, formatLiveTime } from '../live/livePlanFormat';
import { getOptimizedImageUrl } from '../../../lib/api';

const MAPS_API_KEY = 'AIzaSyBLUn3uIoQh1oMhhuZ4lbeFldGUHOYmzog';

function buildStaticMapUrl(plan: { location?: string | null; placeId?: string | null }): string | null {
    if (!plan.location) return null;
    const base = 'https://maps.googleapis.com/maps/api/staticmap';
    const size = '600x300';
    const zoom = '15';
    const maptype = 'roadmap';
    const style = [
        'feature:poi|element:labels|visibility:off',
        'feature:transit|visibility:simplified',
    ].map((s) => `style=${encodeURIComponent(s)}`).join('&');

    if (plan.placeId) {
        const q = encodeURIComponent(`place_id:${plan.placeId}`);
        return `${base}?size=${size}&zoom=${zoom}&maptype=${maptype}&markers=color:0xb30069|${q}&center=${q}&key=${MAPS_API_KEY}&${style}`;
    }
    const q = encodeURIComponent(plan.location);
    return `${base}?size=${size}&zoom=${zoom}&maptype=${maptype}&markers=color:0xb30069|${q}&center=${q}&key=${MAPS_API_KEY}&${style}`;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDuration(startsAt: string, endsAt?: string | null): string | null {
    if (!endsAt) return null;
    const diffMs = new Date(endsAt).getTime() - new Date(startsAt).getTime();
    if (diffMs <= 0) return null;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
}

// ─── Section Label ───────────────────────────────────────────────────────────

const SectionLabel = ({ icon, label }: { icon: string; label: string }) => (
    <View className="flex-row items-center mb-3">
        <Text className="text-base mr-2">{icon}</Text>
        <Text className="font-body-bold text-[#1c1c18] text-xs uppercase tracking-widest">
            {label}
        </Text>
    </View>
);

// ─── Info Row ────────────────────────────────────────────────────────────────

const InfoRow = ({
    icon,
    label,
    value,
    accent,
}: {
    icon: keyof typeof MaterialIcons.glyphMap;
    label: string;
    value: string;
    accent?: boolean;
}) => (
    <View className="flex-row items-center py-3.5 border-b border-stone-100/70 last:border-b-0">
        <View className="w-8 h-8 rounded-xl bg-[#b30069]/8 items-center justify-center mr-3">
            <MaterialIcons name={icon} size={16} color={accent ? '#b30069' : '#594048'} />
        </View>
        <View className="flex-1">
            <Text className="font-body-medium text-stone-400 text-[10px] uppercase tracking-wider mb-0.5">
                {label}
            </Text>
            <Text
                className={`font-body-bold text-sm ${accent ? 'text-[#b30069]' : 'text-[#1c1c18]'}`}
            >
                {value}
            </Text>
        </View>
    </View>
);

// ─── Main Component ──────────────────────────────────────────────────────────

interface Props {
    plan: PlanCardPlan & { endsAt?: string | null };
}

const CARD_STYLE = {
    shadowColor: '#b30069',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
};

const UpcomingDetailsTab = ({ plan }: Props) => {
    const duration = formatDuration(plan.startsAt, (plan as any).endsAt);
    const hasLocation = !!plan.location;
    const staticMapUrl = buildStaticMapUrl(plan);

    return (
        <View className="pb-10">
            {/* ── 1. Timing Card ────────────────────────────────────────── */}
            <View className="mx-6 mt-5">
                <SectionLabel icon="🗓️" label="When" />
                <View
                    className="bg-white rounded-3xl overflow-hidden border border-stone-100/80 px-4"
                    style={CARD_STYLE}
                >
                    <InfoRow
                        icon="calendar-today"
                        label="Date"
                        value={formatLiveDate(plan.startsAt)}
                    />
                    <InfoRow
                        icon="schedule"
                        label="Start time"
                        value={formatLiveTime(plan.startsAt)}
                        accent
                    />
                    {duration ? (
                        <InfoRow
                            icon="timelapse"
                            label="Duration"
                            value={duration}
                        />
                    ) : null}
                    {(plan as any).endsAt ? (
                        <InfoRow
                            icon="event-available"
                            label="Ends at"
                            value={formatLiveTime((plan as any).endsAt)}
                        />
                    ) : null}
                </View>
            </View>

            {/* ── 2. Location + Map ─────────────────────────────────────── */}
            {hasLocation ? (
                <View className="mx-6 mt-6">
                    <SectionLabel icon="📍" label="Location" />
                    <View className="bg-white rounded-3xl overflow-hidden border border-stone-100/80" style={CARD_STYLE}>
                        {/* Static map tile — only when a real placeId is linked */}
                        {plan.placeId && staticMapUrl ? (
                            <TouchableOpacity
                                activeOpacity={0.92}
                                onPress={() => openPlanLocationInMaps(plan)}
                            >
                                <View className="h-44 w-full overflow-hidden">
                                    <Image
                                        source={{ uri: staticMapUrl }}
                                        style={{ width: '100%', height: '100%' }}
                                        contentFit="cover"
                                    />
                                    {/* Subtle pink tint overlay */}
                                    <View
                                        className="absolute inset-0"
                                        style={{ backgroundColor: 'rgba(179,0,105,0.04)' }}
                                        pointerEvents="none"
                                    />
                                    {/* Open Maps badge */}
                                    <View
                                        className="absolute top-3 right-3 bg-white/90 px-2.5 py-1.5 rounded-xl flex-row items-center"
                                        style={{ shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 }}
                                    >
                                        <MaterialIcons name="open-in-new" size={12} color="#b30069" />
                                        <Text className="font-body-bold text-[#b30069] text-[11px] ml-1">Open Maps</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ) : null}

                        {/* Location text + View on Map */}
                        <View className="px-4 pt-3.5 pb-4 flex-row items-start">
                            <View className="w-8 h-8 rounded-xl bg-[#b30069]/8 items-center justify-center mr-3 mt-0.5">
                                <MaterialIcons name="place" size={16} color="#b30069" />
                            </View>
                            <View className="flex-1 mr-3">
                                <Text className="font-body-bold text-[#1c1c18] text-sm" numberOfLines={2}>
                                    {plan.location}
                                </Text>
                                {plan.locationDetail ? (
                                    <Text className="font-body-medium text-stone-400 text-xs mt-1 leading-4" numberOfLines={2}>
                                        {plan.locationDetail}
                                    </Text>
                                ) : null}
                            </View>
                            <TouchableOpacity
                                onPress={() => openPlanLocationInMaps(plan)}
                                activeOpacity={0.7}
                                className="flex-row items-center bg-[#b30069]/8 border border-[#b30069]/15 px-3 py-2 rounded-xl"
                            >
                                <MaterialIcons name="map" size={13} color="#b30069" />
                                <Text className="font-body-bold text-[#b30069] text-xs ml-1.5">
                                    View on Map
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            ) : null}


            {/* ── 3. About this plan ────────────────────────────────────── */}
            {plan.description?.trim() ? (
                <View className="mx-6 mt-6">
                    <SectionLabel icon="✍️" label="About this plan" />
                    <View className="bg-white rounded-3xl px-5 py-4 border border-stone-100/80" style={CARD_STYLE}>
                        <Text className="font-body-medium text-[#594048] leading-[22px] text-sm">
                            {plan.description}
                        </Text>
                    </View>
                </View>
            ) : null}

            {/* ── 4. About the Mandali ──────────────────────────────────── */}
            {plan.groupDescription?.trim() ? (
                <View className="mx-6 mt-6">
                    <SectionLabel icon="🏕️" label="About the Mandali" />
                    <View className="bg-white rounded-3xl border border-stone-100/80 px-5 py-4" style={CARD_STYLE}>
                        {/* Group name label */}
                        <View className="flex-row items-center mb-3">
                            <View className="bg-[#b30069]/8 px-3 py-1 rounded-xl mr-2">
                                <Text className="font-body-bold text-[#b30069] text-xs">{plan.groupName}</Text>
                            </View>
                            {plan.memberCount ? (
                                <View className="flex-row items-center bg-stone-100/60 px-2.5 py-1 rounded-xl">
                                    <MaterialIcons name="people" size={12} color="#594048" />
                                    <Text className="font-body-bold text-[#594048] text-xs ml-1">
                                        {plan.memberCount} members
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                        <Text className="font-body-medium text-[#594048] leading-[22px] text-sm">
                            {plan.groupDescription}
                        </Text>
                    </View>
                </View>
            ) : null}

            {/* ── 5. Organizer Card ─────────────────────────────────────── */}
            {plan.creatorName ? (
                <View className="mx-6 mt-6">
                    <SectionLabel icon="👑" label="Organized by" />
                    <View
                        className="bg-white rounded-3xl px-4 py-4 border border-stone-100/80 flex-row items-center"
                        style={CARD_STYLE}
                    >
                        {/* Avatar */}
                        <View className="w-12 h-12 rounded-2xl overflow-hidden bg-[#fdeaf4] items-center justify-center mr-4 border border-[#b30069]/10">
                            {plan.creatorAvatarUrl ? (
                                <Image
                                    source={{ uri: getOptimizedImageUrl(plan.creatorAvatarUrl, 'w_120,q_auto,f_auto') }}
                                    style={{ width: '100%', height: '100%' }}
                                    contentFit="cover"
                                />
                            ) : (
                                <Text className="font-headline-bold text-[#b30069] text-lg">
                                    {plan.creatorName.charAt(0).toUpperCase()}
                                </Text>
                            )}
                        </View>
                        <View className="flex-1">
                            <Text className="font-body-bold text-[#1c1c18] text-sm">
                                {plan.creatorName}
                            </Text>
                            <Text className="font-body-medium text-stone-400 text-xs mt-0.5">
                                Organizer · {plan.groupName}
                            </Text>
                        </View>
                        <View className="bg-[#b30069]/8 px-3 py-1.5 rounded-xl">
                            <Text className="font-body-bold text-[#b30069] text-xs">Host</Text>
                        </View>
                    </View>
                </View>
            ) : null}

            {/* ── Fallback ──────────────────────────────────────────────── */}
            {!hasLocation && !plan.description?.trim() && !plan.groupDescription?.trim() && !plan.creatorName ? (
                <View className="mx-6 mt-8 items-center py-10">
                    <Text className="text-3xl mb-3">📋</Text>
                    <Text className="font-body-bold text-stone-400 text-sm">No details added yet</Text>
                    <Text className="font-body-medium text-stone-300 text-xs mt-1 text-center">
                        The organizer hasn't added any additional info for this plan.
                    </Text>
                </View>
            ) : null}
        </View>
    );
};

export default UpcomingDetailsTab;
