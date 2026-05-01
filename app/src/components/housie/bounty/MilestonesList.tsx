import React, { useState } from 'react';
import {
    View, Text, TouchableOpacity, TextInput,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import MandaliCoin from '../../MandaliCoin';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Prize {
    id: string;
    name: string;
    description?: string;
    amount: string;
    icon?: string;
    isHighlight?: boolean;
    category?: string;
}

// ─── Single Row ───────────────────────────────────────────────────────────────
const MilestoneRow: React.FC<{
    prize: Prize;
    index: number;
    total: number;
    isExpanded: boolean;
    onToggle: () => void;
    onChangeName: (v: string) => void;
    onChangeAmount: (v: string) => void;
    onDelete: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    isTablet: boolean;
    canEditName: boolean;
}> = ({ prize, index, total, isExpanded, onToggle, onChangeName, onChangeAmount, onDelete, onMoveUp, onMoveDown, isTablet, canEditName }) => {
    const hasZero = !parseInt(prize.amount) || parseInt(prize.amount) <= 0;
    return (
        <View
            className="bg-white rounded-3xl border overflow-hidden"
            style={{ borderColor: hasZero ? '#fca5a5' : '#f5f5f4', elevation: 1 }}
        >
            {/* ── Header row (tap to expand/collapse) ── */}
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={onToggle}
                className="flex-row items-center px-4"
                style={{ height: isTablet ? 72 : 58 }}
            >
                {prize.isHighlight && (
                    <Ionicons name="star" size={isTablet ? 18 : 14} color="#b30069" style={{ marginRight: 6 }} />
                )}
                <View className="flex-1">
                    <Text
                        className="font-headline-bold"
                        style={{ fontSize: isTablet ? 20 : 15, color: prize.isHighlight ? '#b30069' : '#1c1c18' }}
                        numberOfLines={1}
                    >
                        {prize.name}
                    </Text>
                    {prize.description ? (
                        <Text className="font-body-regular text-stone-400" style={{ fontSize: isTablet ? 13 : 11 }} numberOfLines={1}>
                            {prize.description}
                        </Text>
                    ) : null}
                </View>

                {/* Amount pill — red tint if 0 */}
                <View
                    className="flex-row items-center rounded-full px-3 py-1 mr-2"
                    style={{ backgroundColor: hasZero ? '#fee2e2' : '#fce7f3' }}
                >
                    <Text className="font-headline-bold" style={{ fontSize: isTablet ? 16 : 13, color: hasZero ? '#ef4444' : '#b30069' }}>
                        {prize.amount || '0'}
                    </Text>
                    <MandaliCoin size={isTablet ? 16 : 13} style={{ marginLeft: 4 }} />
                </View>

                <MaterialIcons
                    name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                    size={isTablet ? 26 : 20}
                    color="#a8a29e"
                />
            </TouchableOpacity>

            {/* ── Expanded panel ── */}
            {isExpanded && (
                <View className="px-4 pb-4 border-t border-stone-100" style={{ gap: 10 }}>
                    {/* Name — locked in auto mode */}
                    <View className="mt-3">
                        <Text className="font-body-bold text-stone-400 uppercase tracking-widest mb-1.5" style={{ fontSize: isTablet ? 12 : 9 }}>
                            Reward Name
                        </Text>
                        {canEditName ? (
                            <TextInput
                                value={prize.name}
                                onChangeText={onChangeName}
                                placeholder="Milestone Name"
                                placeholderTextColor="#c4b9b0"
                                className="bg-stone-100 rounded-xl px-4 font-headline-bold"
                                style={{ height: isTablet ? 56 : 46, fontSize: isTablet ? 18 : 14, color: '#1c1c18' }}
                            />
                        ) : (
                            <View className="bg-stone-100 rounded-xl px-4 flex-row items-center" style={{ height: isTablet ? 56 : 46 }}>
                                <Text className="font-headline-bold flex-1" style={{ fontSize: isTablet ? 18 : 14, color: '#1c1c18' }}>
                                    {prize.name}
                                </Text>
                                <MaterialIcons name="lock" size={isTablet ? 18 : 14} color="#c4b9b0" />
                            </View>
                        )}
                    </View>

                    {/* Amount */}
                    <View>
                        <Text className="font-body-bold text-stone-400 uppercase tracking-widest mb-1.5" style={{ fontSize: isTablet ? 12 : 9 }}>
                            Glory Amount {hasZero && <Text style={{ color: '#ef4444' }}>*required</Text>}
                        </Text>
                        <View
                            className="flex-row items-center rounded-xl px-4"
                            style={{ height: isTablet ? 56 : 46, backgroundColor: hasZero ? '#fff1f2' : '#f1f5f9', borderWidth: hasZero ? 1 : 0, borderColor: '#fca5a5' }}
                        >
                            <TextInput
                                value={prize.amount}
                                onChangeText={onChangeAmount}
                                keyboardType="number-pad"
                                placeholder="Enter amount"
                                placeholderTextColor="#fca5a5"
                                className="flex-1 font-headline-bold"
                                style={{ fontSize: isTablet ? 18 : 14, color: hasZero ? '#ef4444' : '#1c1c18', height: '100%' }}
                            />
                            <MandaliCoin size={isTablet ? 24 : 18} />
                        </View>
                    </View>

                    {/* Reorder + Delete row */}
                    <View className="flex-row" style={{ gap: 8 }}>
                        {/* Move up */}
                        <TouchableOpacity
                            onPress={onMoveUp}
                            disabled={index === 0}
                            className="items-center justify-center rounded-xl bg-stone-100 border border-stone-200"
                            style={{ height: isTablet ? 52 : 42, width: isTablet ? 60 : 48, opacity: index === 0 ? 0.3 : 1 }}
                        >
                            <MaterialIcons name="keyboard-arrow-up" size={isTablet ? 26 : 22} color="#594048" />
                        </TouchableOpacity>

                        {/* Move down */}
                        <TouchableOpacity
                            onPress={onMoveDown}
                            disabled={index === total - 1}
                            className="items-center justify-center rounded-xl bg-stone-100 border border-stone-200"
                            style={{ height: isTablet ? 52 : 42, width: isTablet ? 60 : 48, opacity: index === total - 1 ? 0.3 : 1 }}
                        >
                            <MaterialIcons name="keyboard-arrow-down" size={isTablet ? 26 : 22} color="#594048" />
                        </TouchableOpacity>

                        {/* Delete */}
                        <TouchableOpacity
                            onPress={onDelete}
                            className="flex-1 flex-row items-center justify-center rounded-xl bg-red-50 border border-red-100"
                            style={{ height: isTablet ? 52 : 42 }}
                        >
                            <MaterialIcons name="delete-outline" size={isTablet ? 22 : 18} color="#ef4444" />
                            <Text className="font-body-bold text-red-400 ml-1.5" style={{ fontSize: isTablet ? 16 : 13 }}>Remove</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
};

// ─── Draggable List ───────────────────────────────────────────────────────────
interface Props {
    prizes: Prize[];
    setPrizes: (prizes: Prize[]) => void;
    isTablet: boolean;
    onAdd: () => void;
    callingMode: 'auto' | 'manual';
}

const MilestonesList: React.FC<Props> = ({ prizes, setPrizes, isTablet, onAdd, callingMode }) => {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const moveUp = (index: number) => {
        if (index === 0) return;
        const next = [...prizes];
        [next[index - 1], next[index]] = [next[index], next[index - 1]];
        setPrizes(next);
    };

    const moveDown = (index: number) => {
        if (index === prizes.length - 1) return;
        const next = [...prizes];
        [next[index], next[index + 1]] = [next[index + 1], next[index]];
        setPrizes(next);
    };

    return (
        <View
            className="bg-stone-50 rounded-[40px] border border-stone-200"
            style={{ padding: isTablet ? 32 : 20, marginBottom: 24 }}
        >
            {/* Section header */}
            <View className="flex-row items-center justify-between mb-2">
                <Text className="font-headline-bold" style={{ fontSize: isTablet ? 28 : 19, color: '#1c1c18' }}>
                    Game Milestones
                </Text>
                <TouchableOpacity
                    onPress={onAdd}
                    className="flex-row items-center rounded-full px-4 py-2"
                    style={{ backgroundColor: '#b30069', gap: 4 }}
                >
                    <MaterialIcons name="add" size={isTablet ? 22 : 17} color="white" />
                    <Text className="font-body-bold text-white" style={{ fontSize: isTablet ? 15 : 13 }}>Add</Text>
                </TouchableOpacity>
            </View>

            <Text className="font-body-regular text-stone-400 mb-3" style={{ fontSize: isTablet ? 13 : 11 }}>
                Use ↑ ↓ buttons inside each row to reorder prizes.
            </Text>

            {/* Rows */}
            <View style={{ gap: 10 }}>
                {prizes.map((prize, index) => (
                    <MilestoneRow
                        key={prize.id}
                        prize={prize}
                        index={index}
                        total={prizes.length}
                        isExpanded={expandedId === prize.id}
                        onToggle={() => setExpandedId(expandedId === prize.id ? null : prize.id)}
                        onChangeName={(v) => setPrizes(prizes.map(p => p.id === prize.id ? { ...p, name: v } : p))}
                        onChangeAmount={(v) => setPrizes(prizes.map(p => p.id === prize.id ? { ...p, amount: v } : p))}
                        onDelete={() => { setPrizes(prizes.filter(p => p.id !== prize.id)); setExpandedId(null); }}
                        onMoveUp={() => moveUp(index)}
                        onMoveDown={() => moveDown(index)}
                        isTablet={isTablet}
                        canEditName={callingMode === 'manual'}
                    />
                ))}
            </View>
        </View>
    );
};

export default MilestonesList;
