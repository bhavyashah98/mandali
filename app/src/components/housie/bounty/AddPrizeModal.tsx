import React, { useState } from 'react';
import {
    View, Text, TouchableOpacity, TextInput,
    Modal, ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { MaterialIcons, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MandaliCoin from '../../MandaliCoin';
import { Prize } from './MilestonesList';

// ─── Helpers ──────────────────────────────────────────────────────────────────
export const ordinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const CATEGORY_LABELS: Record<string, string> = {
    standard: 'Row Prizes',
    fullhouse: 'Full House',
    bonus: 'Bonus Prizes',
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
    visible: boolean;
    onClose: () => void;
    catalogue: any[];
    allowCustom: boolean;
    prizes: Prize[];
    onAdd: (prize: Prize) => void;
    isTablet: boolean;
    callingMode: 'auto' | 'manual';
}

// ─── Component ────────────────────────────────────────────────────────────────
const AddPrizeModal: React.FC<Props> = ({
    visible, onClose, catalogue, allowCustom, prizes, onAdd, isTablet,
}) => {
    const insets = useSafeAreaInsets();
    const [step, setStep] = useState<'pick' | 'custom'>('pick');
    const [customName, setCustomName] = useState('');
    const [customDesc, setCustomDesc] = useState('');
    const [customAmount, setCustomAmount] = useState('');

    const close = () => { onClose(); setStep('pick'); };

    const addFromCatalogue = (item: any) => {
        if (!item.repeatable) {
            if (prizes.find(p => p.id === item.id)) {
                Alert.alert('Already added', `${item.name} is already in the list.`); return;
            }
            onAdd({ ...item, amount: '0', isHighlight: item.category === 'fullhouse' });
        } else {
            const n = prizes.filter(p => p.category === item.category).length + 1;
            onAdd({ ...item, id: `${item.id}_${n}`, name: `${ordinal(n)} ${item.name}`, amount: '0', isHighlight: true });
        }
        close();
    };

    const addCustom = () => {
        if (!customName.trim()) { Alert.alert('Required', 'Enter a reward name.'); return; }
        onAdd({
            id: `custom_${Date.now()}`, name: customName.trim(),
            description: customDesc.trim(), amount: customAmount || '0',
            icon: 'stars', isHighlight: false,
        });
        setCustomName(''); setCustomDesc(''); setCustomAmount('');
        close();
    };

    const categories = (['standard', 'fullhouse', 'bonus'] as const)
        .filter(cat => catalogue.some((p: any) => p.category === cat));

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <View
                        className="bg-white rounded-t-[40px]"
                        style={{ padding: isTablet ? 48 : 24, paddingBottom: Math.max(insets.bottom, 24) }}
                    >
                        {/* Header */}
                        <View className="flex-row items-center justify-between mb-5">
                            <View className="flex-row items-center" style={{ gap: 10 }}>
                                {step === 'custom' && (
                                    <TouchableOpacity onPress={() => setStep('pick')}>
                                        <MaterialIcons name="arrow-back-ios" size={isTablet ? 26 : 20} color="#594048" />
                                    </TouchableOpacity>
                                )}
                                <Text className="font-headline-bold" style={{ fontSize: isTablet ? 30 : 22, color: '#1c1c18' }}>
                                    {step === 'pick' ? 'Add Reward' : 'Create Custom'}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={close}>
                                <Ionicons name="close-circle" size={isTablet ? 38 : 28} color="#c4b9b0" />
                            </TouchableOpacity>
                        </View>

                        {step === 'pick' ? (
                            /* ── Grouped catalogue ── */
                            <ScrollView style={{ maxHeight: isTablet ? 520 : 420 }} showsVerticalScrollIndicator={false}>
                                {categories.map(cat => {
                                    const catItems = catalogue.filter((p: any) => p.category === cat);
                                    const isSpecialCat = cat === 'special';
                                    return (
                                        <View key={cat} className="mb-5">
                                            <Text className="font-body-bold text-stone-400 uppercase tracking-widest mb-2.5"
                                                style={{ fontSize: isTablet ? 13 : 10 }}>
                                                {CATEGORY_LABELS[cat]}
                                            </Text>
                                            <View style={{ gap: 8 }}>
                                                {catItems.map((item: any) => {
                                                     const alreadyAdded = !item.repeatable && !!prizes.find((p: any) => p.id === item.id);
                                                     const isRepeatable = item.repeatable;
                                                     
                                                     // Premium logic: Anything not standard or fullhouse is premium
                                                     const isPremium = item.category !== 'standard' && item.category !== 'fullhouse';

                                                     const repeatCount = isRepeatable
                                                         ? prizes.filter((p: any) => p.category === item.category).length
                                                         : 0;

                                                     return (
                                                         <TouchableOpacity
                                                             key={item.id}
                                                             onPress={() => addFromCatalogue(item)}
                                                             disabled={alreadyAdded}
                                                             className="flex-row items-center bg-stone-50 rounded-[18px] border border-stone-100"
                                                             style={{ padding: isTablet ? 14 : 11, gap: 12, opacity: alreadyAdded ? 0.4 : 1 }}
                                                         >
                                                             {/* Icon */}
                                                             <View
                                                                 className="rounded-full items-center justify-center"
                                                                 style={{
                                                                     width: isTablet ? 44 : 34,
                                                                     height: isTablet ? 44 : 34,
                                                                     backgroundColor: isPremium ? '#31302d' : '#fce7f3',
                                                                 }}
                                                             >
                                                                 <MaterialIcons
                                                                     name={item.icon as any}
                                                                     size={isTablet ? 22 : 17}
                                                                     color={isPremium ? '#fbbf24' : '#b30069'}
                                                                 />
                                                             </View>

                                                             {/* Text */}
                                                             <View className="flex-1">
                                                                 <View className="flex-row items-center">
                                                                    <Text className="font-headline-bold"
                                                                        style={{ fontSize: isTablet ? 17 : 14, color: '#1c1c18' }}>
                                                                        {isRepeatable ? `Add ${item.name}` : item.name}
                                                                    </Text>
                                                                    {isPremium && (
                                                                        <View 
                                                                            className="flex-row items-center px-2 py-0.5 rounded-lg ml-2"
                                                                            style={{ backgroundColor: '#31302d' }}
                                                                        >
                                                                            <MaterialCommunityIcons name="crown" size={isTablet ? 12 : 10} color="#fbbf24" />
                                                                            <Text className="font-body-bold text-[#fbbf24] uppercase ml-1" style={{ fontSize: isTablet ? 10 : 8 }}>
                                                                                PREMIUM
                                                                            </Text>
                                                                        </View>
                                                                    )}
                                                                 </View>
                                                                 <Text className="font-body-regular text-stone-400"
                                                                     style={{ fontSize: isTablet ? 12 : 11 }}>
                                                                     {isRepeatable && repeatCount > 0
                                                                         ? `${repeatCount} added — tap to add ${ordinal(repeatCount + 1)}`
                                                                         : item.description}
                                                                 </Text>
                                                             </View>

                                                             {/* Right action */}
                                                             {isRepeatable ? (
                                                                 <View className="flex-row items-center" style={{ gap: 6 }}>
                                                                     {repeatCount > 0 && (
                                                                         <View className="bg-pink-100 rounded-full px-2 py-0.5">
                                                                             <Text className="font-headline-bold"
                                                                                 style={{ color: '#b30069', fontSize: isTablet ? 13 : 11 }}>
                                                                                 {repeatCount}
                                                                             </Text>
                                                                         </View>
                                                                     )}
                                                                     <MaterialIcons name="add-circle-outline" size={isTablet ? 26 : 22} color="#b30069" />
                                                                 </View>
                                                             ) : alreadyAdded
                                                                 ? <MaterialIcons name="check-circle" size={isTablet ? 26 : 22} color="#22c55e" />
                                                                 : <MaterialIcons name="add-circle-outline" size={isTablet ? 26 : 22} color={isPremium ? '#fbbf24' : '#b30069'} />}
                                                         </TouchableOpacity>
                                                     );
                                                 })}
                                            </View>
                                        </View>
                                    );
                                })}

                                {/* Create your own */}
                                {allowCustom && (
                                    <TouchableOpacity
                                        onPress={() => setStep('custom')}
                                        className="flex-row items-center justify-center rounded-[18px] border-2 border-dashed border-stone-200 mb-2"
                                        style={{ height: isTablet ? 64 : 50 }}
                                    >
                                        <MaterialIcons name="edit" size={isTablet ? 22 : 17} color="#a8a29e" />
                                        <Text className="font-body-bold text-stone-400 ml-2"
                                            style={{ fontSize: isTablet ? 16 : 13 }}>
                                            Create Your Own
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </ScrollView>
                        ) : (
                            /* ── Custom form ── */
                            <View style={{ gap: 14 }}>
                                <View>
                                    <Text className="font-body-bold text-stone-400 uppercase tracking-widest mb-1.5"
                                        style={{ fontSize: isTablet ? 12 : 9 }}>
                                        Reward Name *
                                    </Text>
                                    <TextInput
                                        value={customName} onChangeText={setCustomName}
                                        placeholder="e.g. Unlucky One" placeholderTextColor="#c4b9b0"
                                        autoFocus
                                        className="bg-stone-100 rounded-xl px-4 font-headline-bold"
                                        style={{ height: isTablet ? 60 : 50, fontSize: isTablet ? 20 : 15, color: '#1c1c18' }}
                                    />
                                </View>
                                <View>
                                    <Text className="font-body-bold text-stone-400 uppercase tracking-widest mb-1.5"
                                        style={{ fontSize: isTablet ? 12 : 9 }}>
                                        Description
                                    </Text>
                                    <TextInput
                                        value={customDesc} onChangeText={setCustomDesc}
                                        placeholder="Short description..." placeholderTextColor="#c4b9b0"
                                        multiline
                                        className="bg-stone-100 rounded-xl px-4 py-3 font-body-regular"
                                        style={{ minHeight: isTablet ? 80 : 64, fontSize: isTablet ? 16 : 13, color: '#1c1c18' }}
                                    />
                                </View>
                                <View>
                                    <Text className="font-body-bold text-stone-400 uppercase tracking-widest mb-1.5"
                                        style={{ fontSize: isTablet ? 12 : 9 }}>
                                        Glory Amount (optional)
                                    </Text>
                                    <View className="flex-row items-center bg-stone-100 rounded-xl px-4"
                                        style={{ height: isTablet ? 60 : 50 }}>
                                        <TextInput
                                            value={customAmount} onChangeText={setCustomAmount}
                                            placeholder="0" placeholderTextColor="#c4b9b0"
                                            keyboardType="number-pad"
                                            className="flex-1 font-headline-bold"
                                            style={{ fontSize: isTablet ? 20 : 15, color: '#1c1c18', height: '100%' }}
                                        />
                                        <MandaliCoin size={isTablet ? 26 : 20} />
                                    </View>
                                </View>
                                <TouchableOpacity
                                    onPress={addCustom}
                                    className="rounded-full items-center justify-center"
                                    style={{ height: isTablet ? 72 : 56, backgroundColor: '#b30069' }}
                                >
                                    <Text className="font-headline-bold text-white"
                                        style={{ fontSize: isTablet ? 22 : 16 }}>
                                        Add Reward
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};

export default AddPrizeModal;
