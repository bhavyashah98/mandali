import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    TextInput,
    FlatList,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface AddExpensePaidBySelectorProps {
    actualMembers: any[];
    paidByUserId: string;
    setPaidByUserId: (id: string) => void;
    currentUserId: string;
    isTablet: boolean;
}

const AddExpensePaidBySelector = ({ actualMembers, paidByUserId, setPaidByUserId, currentUserId, isTablet }: AddExpensePaidBySelectorProps) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');

    const getDisplayName = useCallback((member: any) => {
        return member.id === currentUserId ? `You (${member.name})` : member.name;
    }, [currentUserId]);

    const selectedMember = actualMembers.find(m => m.id === paidByUserId);
    const selectedLabel = selectedMember ? getDisplayName(selectedMember) : 'Select payer';

    const filtered = actualMembers.filter(m =>
        getDisplayName(m).toLowerCase().includes(search.toLowerCase())
    );

    const handleSelect = useCallback((id: string) => {
        setPaidByUserId(id);
        setOpen(false);
        setSearch('');
    }, [setPaidByUserId]);

    const handleClose = useCallback(() => {
        setOpen(false);
        setSearch('');
    }, []);

    return (
        <View>
            <Text className={`font-body-bold text-stone-400 uppercase tracking-widest mb-3 ${isTablet ? 'text-xl' : 'text-[10px]'}`}>
                Paid By
            </Text>

            <TouchableOpacity
                onPress={() => setOpen(true)}
                activeOpacity={0.8}
                className={`flex-row items-center justify-between bg-white border border-stone-100 rounded-2xl ${isTablet ? 'px-6 py-5' : 'px-4 py-3.5'}`}
                style={{ elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 2 }}
            >
                <View className="flex-row items-center flex-1">
                    <View className="w-8 h-8 rounded-full bg-[#b30069]/10 items-center justify-center mr-3">
                        <MaterialIcons name="person" size={16} color="#b30069" />
                    </View>
                    <Text className={`font-body-bold text-[#1c1c18] ${isTablet ? 'text-2xl' : 'text-sm'}`}>
                        {selectedLabel}
                    </Text>
                </View>
                <MaterialIcons name="keyboard-arrow-down" size={isTablet ? 30 : 22} color="#a8a29e" />
            </TouchableOpacity>

            <Modal visible={open} transparent animationType="slide" onRequestClose={handleClose}>
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={handleClose}
                    className="flex-1 bg-black/40 justify-end"
                >
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    >
                        <TouchableOpacity activeOpacity={1} className="bg-[#fdf9f3] rounded-t-[32px] pt-6 pb-10">
                            <View className="w-10 h-1 bg-stone-200 rounded-full self-center mb-6" />

                            <Text className={`font-headline-bold text-[#1c1c18] mb-4 px-6 ${isTablet ? 'text-4xl' : 'text-xl'}`}>
                                Who Paid?
                            </Text>

                            <View className="mx-6 mb-4 flex-row items-center bg-white border border-stone-100 rounded-2xl px-4 py-3">
                                <MaterialIcons name="search" size={20} color="#a8a29e" />
                                <TextInput
                                    value={search}
                                    onChangeText={setSearch}
                                    placeholder="Search member..."
                                    placeholderTextColor="#d6d3d1"
                                    autoFocus
                                    className={`flex-1 ml-3 font-body-medium text-[#1c1c18] ${isTablet ? 'text-2xl' : 'text-sm'}`}
                                />
                                {search.length > 0 && (
                                    <TouchableOpacity onPress={() => setSearch('')}>
                                        <MaterialIcons name="close" size={18} color="#a8a29e" />
                                    </TouchableOpacity>
                                )}
                            </View>

                            <FlatList
                                data={filtered}
                                keyExtractor={item => item.id}
                                style={{ maxHeight: 280 }}
                                keyboardShouldPersistTaps="handled"
                                renderItem={({ item }) => {
                                    const isSelected = item.id === paidByUserId;
                                    return (
                                        <TouchableOpacity
                                            onPress={() => handleSelect(item.id)}
                                            activeOpacity={0.7}
                                            className={`flex-row items-center px-6 py-4 mx-4 mb-2 rounded-2xl ${isSelected ? 'bg-[#b30069]/8' : 'bg-white'}`}
                                            style={{ borderWidth: isSelected ? 1.5 : 1, borderColor: isSelected ? '#b30069' : '#f5f5f4' }}
                                        >
                                            <View className={`w-9 h-9 rounded-full items-center justify-center mr-3 ${isSelected ? 'bg-[#b30069]' : 'bg-stone-100'}`}>
                                                <MaterialIcons name="person" size={16} color={isSelected ? 'white' : '#a8a29e'} />
                                            </View>
                                            <Text className={`flex-1 font-body-bold ${isTablet ? 'text-2xl' : 'text-sm'} ${isSelected ? 'text-[#b30069]' : 'text-[#1c1c18]'}`}>
                                                {getDisplayName(item)}
                                            </Text>
                                            {isSelected && (
                                                <MaterialIcons name="check-circle" size={isTablet ? 26 : 20} color="#b30069" />
                                            )}
                                        </TouchableOpacity>
                                    );
                                }}
                                ListEmptyComponent={
                                    <View className="items-center py-8">
                                        <Text className="text-stone-400 font-body-medium text-sm">No members found</Text>
                                    </View>
                                }
                            />
                        </TouchableOpacity>
                    </KeyboardAvoidingView>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

export default AddExpensePaidBySelector;
