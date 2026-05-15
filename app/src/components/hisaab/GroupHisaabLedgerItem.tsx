import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useIsTablet } from '../../hooks/useIsTablet';

interface GroupHisaabLedgerItemProps {
    item: any;
    currentUserId: string | undefined;
    onPress: () => void;
}

interface NetPosition {
    label: string;
    amount: number;
    color: string;
    bg: string;
}

const computeNetPosition = (item: any, currentUserId: string | undefined): NetPosition => {
    const isSettlement = item.type === 'settlement';
    const isPayer = item.paidBy === currentUserId;

    if (isSettlement) {
        if (isPayer) {
            return { label: 'Cleared', amount: item.amount, color: '#7c3aed', bg: 'rgba(124,58,237,0.08)' };
        }
        if (item.toUserId === currentUserId) {
            return { label: 'Received', amount: item.amount, color: '#0ea5e9', bg: 'rgba(14,165,233,0.08)' };
        }
        return { label: 'Observed', amount: 0, color: '#a8a29e', bg: 'rgba(168,162,158,0.08)' };
    }

    const myShare = item.participants.find((p: any) => p.userId === currentUserId)?.amount ?? 0;

    if (isPayer) {
        const lent = Number((item.amount - myShare).toFixed(2));
        if (lent > 0) {
            return { label: 'Lent', amount: lent, color: '#10b981', bg: 'rgba(16,185,129,0.08)' };
        }
        return { label: 'Settled', amount: 0, color: '#10b981', bg: 'rgba(16,185,129,0.08)' };
    }

    if (myShare > 0) {
        return { label: 'Owe', amount: myShare, color: '#ef4444', bg: 'rgba(239,68,68,0.08)' };
    }

    return { label: 'Observed', amount: 0, color: '#a8a29e', bg: 'rgba(168,162,158,0.08)' };
};

const GroupHisaabLedgerItem = ({ item, currentUserId, onPress }: GroupHisaabLedgerItemProps) => {
    const isTablet = useIsTablet();
    const isSettlement = item.type === 'settlement';
    const isPaidByMe = item.paidBy === currentUserId;

    const net = computeNetPosition(item, currentUserId);

    let iconName = 'receipt-long';
    let iconColor = '#a8a29e';
    let iconBg = 'rgba(168,162,158,0.06)';

    if (isSettlement) {
        iconName = 'handshake';
        iconColor = '#7c3aed';
        iconBg = 'rgba(124,58,237,0.06)';
    } else if (isPaidByMe) {
        iconName = 'arrow-upward';
        iconColor = '#10b981';
        iconBg = 'rgba(16,185,129,0.06)';
    } else {
        const myShare = item.participants.find((p: any) => p.userId === currentUserId)?.amount ?? 0;
        if (myShare > 0) {
            iconName = 'arrow-downward';
            iconColor = '#ef4444';
            iconBg = 'rgba(239,68,68,0.06)';
        } else {
            iconName = 'visibility';
        }
    }

    const payerLabel = isPaidByMe ? 'You' : item.paidByName;

    const primaryLine = isSettlement
        ? (isPaidByMe ? `You → ${item.toUserName}` : `${item.paidByName} → ${item.toUserName}`)
        : item.description;

    const secondaryLine = isSettlement
        ? `Settlement · ₹${item.amount.toLocaleString()}`
        : `Paid by ${payerLabel} · ₹${item.amount.toLocaleString()}`;

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.75}
            style={{ elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 2 }}
            className={`bg-white rounded-[24px] flex-row items-center border border-stone-50 mb-4 ${isTablet ? 'px-8 py-6' : 'px-4 py-4'}`}
        >
            <View
                style={{ backgroundColor: iconBg }}
                className={`rounded-2xl items-center justify-center ${isTablet ? 'w-20 h-20' : 'w-12 h-12'} mr-4`}
            >
                {isSettlement ? (
                    <FontAwesome5 name={iconName} size={isTablet ? 32 : 18} color={iconColor} />
                ) : (
                    <MaterialIcons name={iconName as any} size={isTablet ? 40 : 24} color={iconColor} />
                )}
            </View>

            <View className="flex-1 justify-center">
                <Text
                    className={`font-headline-bold text-[#1c1c18] ${isTablet ? 'text-3xl' : 'text-base'}`}
                    numberOfLines={1}
                >
                    {primaryLine}
                </Text>
                <Text className={`font-body-medium text-stone-400 mt-0.5 ${isTablet ? 'text-xl' : 'text-[11px]'}`} numberOfLines={1}>
                    {secondaryLine}
                </Text>
            </View>

            <View className="items-end ml-3">
                {net.amount > 0 ? (
                    <View style={{ backgroundColor: net.bg }} className="rounded-xl px-3 py-1.5 items-center">
                        <Text style={{ color: net.color }} className={`font-body-bold ${isTablet ? 'text-xl' : 'text-[11px]'}`}>
                            {net.label}
                        </Text>
                        <Text style={{ color: net.color }} className={`font-headline-bold ${isTablet ? 'text-3xl' : 'text-sm'}`}>
                            ₹{net.amount.toLocaleString()}
                        </Text>
                    </View>
                ) : (
                    <View style={{ backgroundColor: net.bg }} className="rounded-xl px-3 py-1.5">
                        <Text style={{ color: net.color }} className={`font-body-bold ${isTablet ? 'text-xl' : 'text-[11px]'}`}>
                            {net.label}
                        </Text>
                    </View>
                )}
                <Text className={`font-body-regular text-stone-300 mt-1.5 ${isTablet ? 'text-xl' : 'text-[10px]'}`}>
                    {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </Text>
            </View>
        </TouchableOpacity>
    );
};

export default GroupHisaabLedgerItem;
