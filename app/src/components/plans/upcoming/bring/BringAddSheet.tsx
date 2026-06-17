import React, { forwardRef, useState, useImperativeHandle } from 'react';
import { View, Text, TextInput, TouchableOpacity, Keyboard, Modal, KeyboardAvoidingView, Platform, TouchableWithoutFeedback } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export interface BringAddSheetRef {
    expand: () => void;
    close: () => void;
}

interface Props {
    onSubmit: (name: string, autoClaim: boolean) => void;
    isAdding: boolean;
}

const BringAddSheet = forwardRef<BringAddSheetRef, Props>(({ onSubmit, isAdding }, ref) => {
    const [visible, setVisible] = useState(false);
    const [name, setName] = useState('');
    const [autoClaim, setAutoClaim] = useState(false);

    useImperativeHandle(ref, () => ({
        expand: () => setVisible(true),
        close: () => {
            setVisible(false);
            setName('');
            setAutoClaim(false);
        }
    }));

    const handleSubmit = () => {
        if (!name.trim() || name.trim().length < 2) return;
        onSubmit(name, autoClaim);
        setVisible(false);
        setName('');
        setAutoClaim(false);
        Keyboard.dismiss();
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
                <TouchableWithoutFeedback onPress={() => setVisible(false)}>
                    <View className="flex-1 bg-black/40 justify-end">
                        <TouchableWithoutFeedback>
                            <View className="bg-white rounded-t-3xl px-6 pt-6 pb-10">
                                <View className="w-12 h-1.5 bg-stone-200 rounded-full self-center mb-6" />
                                <Text className="font-headline-bold text-[#1c1c18] text-xl mb-6">Suggest Item</Text>

                                <View className="bg-stone-100 rounded-2xl px-4 py-3 mb-6">
                                    <Text className="font-body-medium text-stone-500 text-xs uppercase tracking-wider mb-1">What should someone bring?</Text>
                                    <TextInput
                                        value={name}
                                        onChangeText={setName}
                                        placeholder="e.g. Playing cards, Snacks..."
                                        placeholderTextColor="#a8a29e"
                                        maxLength={40}
                                        className="font-body-bold text-[#1c1c18] text-base"
                                        autoFocus
                                    />
                                </View>

                                <TouchableOpacity
                                    onPress={() => setAutoClaim(!autoClaim)}
                                    activeOpacity={0.7}
                                    className={`flex-row items-center justify-between p-4 rounded-2xl mb-4 border ${autoClaim ? 'bg-[#10b981]/10 border-[#10b981]/20' : 'bg-white border-stone-200'}`}
                                >
                                    <View className="flex-row items-center">
                                        <View className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${autoClaim ? 'bg-[#10b981]/20' : 'bg-stone-100'}`}>
                                            <MaterialIcons name="person" size={20} color={autoClaim ? '#10b981' : '#a8a29e'} />
                                        </View>
                                        <View>
                                            <Text className={`font-body-bold text-base ${autoClaim ? 'text-[#10b981]' : 'text-[#1c1c18]'}`}>I'll bring this</Text>
                                            <Text className={`font-body-medium text-xs mt-0.5 ${autoClaim ? 'text-[#10b981]/80' : 'text-stone-400'}`}>Claim this item immediately</Text>
                                        </View>
                                    </View>
                                    <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${autoClaim ? 'bg-[#10b981] border-[#10b981]' : 'border-stone-300'}`}>
                                        {autoClaim && <MaterialIcons name="check" size={14} color="white" />}
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={handleSubmit}
                                    disabled={!name.trim() || name.trim().length < 2 || isAdding}
                                    className={`w-full py-4 rounded-2xl items-center ${!name.trim() || name.trim().length < 2 || isAdding ? 'bg-stone-200' : 'bg-[#b30069]'}`}
                                >
                                    <Text className={`font-body-bold text-base ${!name.trim() || name.trim().length < 2 || isAdding ? 'text-stone-400' : 'text-white'}`}>
                                        {isAdding ? 'Adding...' : 'Add to List'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </Modal>
    );
});

export default BringAddSheet;
