import React, { useEffect, useState } from 'react';
import { Modal, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Props {
    visible: boolean;
    title: string;
    placeholder: string;
    maxLength: number;
    initialValue?: string;
    saving?: boolean;
    onClose: () => void;
    onSubmit: (text: string) => void;
}

export default function HypeTextModal({ visible, title, placeholder, maxLength, initialValue = '', saving, onClose, onSubmit }: Props) {
    const [text, setText] = useState(initialValue);
    useEffect(() => setText(initialValue), [initialValue, visible]);
    const canSubmit = text.trim().length >= 2 && !saving;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View className="flex-1 justify-center bg-black/40 px-5">
                <View className="rounded-[28px] bg-white p-5">
                    <Text className="font-headline-bold text-xl text-[#1c1c18]">{title}</Text>
                    <View className="mt-4 rounded-2xl border border-[#eadde3] bg-[#fff8fb] px-4 py-3.5">
                        <TextInput
                            value={text}
                            onChangeText={setText}
                            placeholder={placeholder}
                            placeholderTextColor="#a69aa0"
                            maxLength={maxLength}
                            autoFocus
                            className="font-body-bold text-base text-[#1c1c18] p-0"
                            style={{ lineHeight: 22, paddingVertical: 0, ...(Platform.OS === 'android' ? { textAlignVertical: 'center' as const } : {}) }}
                        />
                    </View>
                    <Text className="mt-2 text-right font-body-medium text-xs text-[#8a7a80]">
                        {text.length}/{maxLength}
                    </Text>
                    <View className="mt-5 flex-row gap-3">
                        <TouchableOpacity onPress={onClose} className="flex-1 rounded-2xl bg-stone-100 py-3.5">
                            <Text className="text-center font-body-bold text-[#594048]">Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            disabled={!canSubmit}
                            onPress={() => canSubmit && onSubmit(text)}
                            className={`flex-1 rounded-2xl py-3.5 ${canSubmit ? 'bg-[#b30069]' : 'bg-stone-200'}`}
                        >
                            <Text className={`text-center font-body-bold ${canSubmit ? 'text-white' : 'text-stone-400'}`}>
                                {saving ? 'Saving...' : 'Save'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
