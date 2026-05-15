import React, { useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    LayoutAnimation,
    Platform,
    ScrollView
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface SettleMemberSelectorProps {
    members: any[];
    selectedUserId: string | null;
    setSelectedUserId: (id: string) => void;
    isTablet: boolean;
}

const SettleMemberSelector = ({ members, selectedUserId, setSelectedUserId, isTablet }: SettleMemberSelectorProps) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const inputRef = useRef<TextInput>(null);

    const selectedMember = members.find(m => m.id === selectedUserId);
    const selectedLabel = selectedMember ? selectedMember.name : 'Select a member...';

    const filtered = members.filter(m =>
        m.name.toLowerCase().includes(search.toLowerCase())
    );

    const onFocus = useCallback(() => {
        if (!open) {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setOpen(true);
        }
    }, [open]);

    const handleSelect = useCallback((id: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        if (selectedUserId === id) {
            // Deselect
            setSelectedUserId(null as any); // Type cast if necessary, usually null is fine
        } else {
            setSelectedUserId(id);
        }
        setOpen(false);
        setSearch('');
        inputRef.current?.blur();
    }, [setSelectedUserId, selectedUserId]);

    const handleClear = useCallback(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSelectedUserId(null as any);
        setOpen(false);
        setSearch('');
        inputRef.current?.blur();
    }, [setSelectedUserId]);

    const handleClose = useCallback(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setOpen(false);
        setSearch('');
        inputRef.current?.blur();
    }, []);

    return (
        <View>
            <Text className={`font-body-bold text-[#594048] uppercase tracking-wider mb-2 ml-1 ${isTablet ? 'text-xl' : 'text-[12px]'}`}>
                Who are you settling with?
            </Text>

            <View
                className={`flex-row items-center justify-between bg-white border border-stone-100 rounded-[32px] ${isTablet ? 'px-10 py-7' : 'px-6 py-5'}`}
                style={{
                    elevation: open ? 3 : 8,
                    shadowColor: '#b30069',
                    shadowOffset: { width: 0, height: open ? 2 : 6 },
                    shadowOpacity: open ? 0.05 : 0.12,
                    shadowRadius: open ? 8 : 16
                }}
            >
                <View className="flex-row items-center flex-1">
                    <View className={`rounded-[20px] items-center justify-center mr-5 ${isTablet ? 'w-16 h-16' : 'w-12 h-12'} ${selectedMember && !open ? 'bg-[#b30069]/10' : 'bg-stone-50'}`}>
                        <MaterialIcons
                            name={selectedMember && !open ? "person" : "search"}
                            size={isTablet ? 32 : 24}
                            color={selectedMember && !open ? '#b30069' : '#a8a29e'}
                        />
                    </View>
                    <View className="flex-1 justify-center">
                        {selectedMember && !open && (
                            <Text className={`font-body-bold text-[#b30069] uppercase tracking-[2px] mb-1 ${isTablet ? 'text-sm' : 'text-[10px]'}`}>
                                Selected Member
                            </Text>
                        )}
                        <TextInput
                            ref={inputRef}
                            value={open ? search : (selectedMember ? selectedMember.name : '')}
                            onChangeText={(val) => {
                                if (!open) {
                                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                    setOpen(true);
                                }
                                setSearch(val);
                            }}
                            onFocus={onFocus}
                            placeholder="Type to search..."
                            placeholderTextColor="#d6d3d1"
                            className={`font-headline-bold p-0 ${isTablet ? 'text-4xl' : 'text-2xl'} ${selectedMember && !open ? 'text-[#1c1c18]' : 'text-stone-400'}`}
                            style={{ includeFontPadding: false, textAlignVertical: 'center' }}
                        />
                    </View>
                </View>
                <TouchableOpacity
                    onPress={open ? handleClose : (selectedMember ? handleClear : onFocus)}
                    className={`w-12 h-12 rounded-full items-center justify-center ${open || selectedMember ? 'bg-[#b30069]/10' : 'bg-stone-50'}`}
                >
                    <MaterialIcons
                        name={open || selectedMember ? "close" : "keyboard-arrow-down"}
                        size={28}
                        color={open || selectedMember ? "#b30069" : "#a8a29e"}
                    />
                </TouchableOpacity>
            </View>

            {open && (
                <View
                    className="mt-4 bg-white rounded-[40px] border border-stone-50 shadow-2xl overflow-hidden"
                    style={{ elevation: 15, shadowColor: '#b30069', shadowOpacity: 0.15, shadowRadius: 30 }}
                >
                    {/* Member List Inline */}
                    <View className="max-h-[400px] py-6">
                        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                            {filtered.length > 0 ? (
                                filtered.map((item, index) => {
                                    console.log("items", item);
                                    const isSelected = item.id === selectedUserId;
                                    const balance = item.balance || 0;
                                    const isOwed = balance < 0; // Negative balance means they OWE money
                                    const isBorrowing = balance > 0; // Positive balance means you OWE them

                                    return (
                                        <TouchableOpacity
                                            key={item.id}
                                            onPress={() => handleSelect(item.id)}
                                            activeOpacity={0.8}
                                            className={`flex-row items-center px-6 py-5 mx-4 mb-3 rounded-[32px] ${isSelected ? 'bg-[#b30069]' : 'bg-[#fdf9f3]/40'}`}
                                            style={!isSelected ? {
                                                borderWidth: 1,
                                                borderColor: '#f5f5f4',
                                                elevation: 1,
                                                shadowColor: '#000',
                                                shadowOffset: { width: 0, height: 2 },
                                                shadowOpacity: 0.03,
                                                shadowRadius: 4
                                            } : {}}
                                        >
                                            <View className={`rounded-2xl items-center justify-center mr-4 ${isTablet ? 'w-14 h-14' : 'w-11 h-11'} ${isSelected ? 'bg-white/20' : 'bg-white shadow-sm'}`}>
                                                <Text className={`font-headline-bold ${isTablet ? 'text-2xl' : 'text-lg'} ${isSelected ? 'text-white' : 'text-[#b30069]'}`}>
                                                    {item.name[0].toUpperCase()}
                                                </Text>
                                            </View>
                                            <View className="flex-1">
                                                <Text className={`font-headline-bold ${isTablet ? 'text-3xl' : 'text-xl'} ${isSelected ? 'text-white' : 'text-[#1c1c18]'}`}>
                                                    {item.name}
                                                </Text>
                                                <View className="flex-row items-center mt-1">
                                                    <View className={`w-2 h-2 rounded-full mr-2 ${isSelected ? 'bg-white/60' : isOwed ? 'bg-emerald-500' : isBorrowing ? 'bg-rose-500' : 'bg-stone-300'}`} />
                                                    <Text className={`font-body-bold uppercase tracking-widest ${isTablet ? 'text-sm' : 'text-[10px]'} ${isSelected ? 'text-white/80' : isOwed ? 'text-emerald-600' : isBorrowing ? 'text-rose-500' : 'text-stone-400'}`}>
                                                        {isOwed ? `Owes you ₹${Math.abs(balance).toLocaleString()}` : isBorrowing ? `You owe ₹${Math.abs(balance).toLocaleString()}` : 'No balance'}
                                                    </Text>
                                                </View>
                                            </View>
                                            {isSelected && (
                                                <View className="bg-white/20 p-2 rounded-full">
                                                    <MaterialIcons name="check" size={24} color="white" />
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })
                            ) : (
                                <View className="items-center py-12">
                                    <View className="w-20 h-20 bg-stone-50 rounded-full items-center justify-center mb-4">
                                        <MaterialIcons name="person-search" size={40} color="#d6d3d1" />
                                    </View>
                                    <Text className="text-stone-400 font-body-bold text-base uppercase tracking-widest">No members found</Text>
                                    <Text className="text-stone-300 font-body-medium text-sm mt-1">Try a different search term</Text>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </View>
            )}
        </View>
    );
};

export default SettleMemberSelector;
