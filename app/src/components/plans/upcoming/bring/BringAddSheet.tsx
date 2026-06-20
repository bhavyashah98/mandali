import React, { forwardRef, useState, useImperativeHandle, useRef, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Keyboard,
    Modal,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
} from 'react-native';
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
    const submittingRef = useRef(false);

    const resetForm = useCallback(() => {
        setName('');
        setAutoClaim(false);
        submittingRef.current = false;
    }, []);

    useImperativeHandle(ref, () => ({
        expand: () => {
            submittingRef.current = false;
            setVisible(true);
        },
        close: () => {
            setVisible(false);
            resetForm();
        },
    }));

    const handleClose = useCallback(() => {
        setVisible(false);
        resetForm();
    }, [resetForm]);

    const handleSubmit = useCallback(() => {
        const trimmed = name.trim();
        if (trimmed.length < 2 || isAdding || submittingRef.current) return;

        submittingRef.current = true;
        Keyboard.dismiss();
        onSubmit(trimmed, autoClaim);
        setVisible(false);
        resetForm();
    }, [name, autoClaim, isAdding, onSubmit, resetForm]);

    const canSubmit = name.trim().length >= 2 && !isAdding;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
                <Pressable className="flex-1 bg-black/40 justify-center px-4" onPress={handleClose}>
                    <ScrollView
                        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
                        keyboardShouldPersistTaps="handled"
                        bounces={false}
                    >
                        <Pressable onPress={(e) => e.stopPropagation()}>
                            <View
                                className="bg-white rounded-3xl px-6 py-8 shadow-xl"
                                onStartShouldSetResponder={() => true}
                            >
                                <Text className="font-headline-bold text-[#1c1c18] text-xl mb-6 text-center">Suggest Item</Text>

                                <View className="bg-stone-100 rounded-2xl px-4 py-3 mb-6">
                                    <Text className="font-body-medium text-stone-500 text-xs uppercase tracking-wider mb-1">
                                        What should someone bring?
                                    </Text>
                                    <TextInput
                                        value={name}
                                        onChangeText={setName}
                                        placeholder="e.g. Playing cards, Snacks..."
                                        placeholderTextColor="#a8a29e"
                                        maxLength={40}
                                        className="font-body-bold text-[#1c1c18] text-base"
                                        autoFocus
                                        returnKeyType="done"
                                        onSubmitEditing={handleSubmit}
                                    />
                                </View>

                                <TouchableOpacity
                                    onPress={() => setAutoClaim(!autoClaim)}
                                    activeOpacity={0.7}
                                    className={`flex-row items-center justify-between p-4 rounded-2xl mb-6 border ${autoClaim ? 'bg-[#10b981]/10 border-[#10b981]/20' : 'bg-white border-stone-200'}`}
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
                                    disabled={!canSubmit}
                                    activeOpacity={0.85}
                                    className={`w-full py-4 rounded-2xl items-center ${canSubmit ? 'bg-[#b30069]' : 'bg-stone-200'}`}
                                >
                                    <Text className={`font-body-bold text-base ${canSubmit ? 'text-white' : 'text-stone-400'}`}>
                                        {isAdding ? 'Adding...' : 'Add to List'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </Pressable>
                    </ScrollView>
                </Pressable>
            </KeyboardAvoidingView>
        </Modal>
    );
});

export default BringAddSheet;
