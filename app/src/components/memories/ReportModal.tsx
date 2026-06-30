import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    Alert,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    useWindowDimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { reportContent } from '../../lib/api';

interface ReportModalProps {
    visible: boolean;
    reportingTarget: { 
        id: string; 
        groupId: string; 
        contentType?: string; 
        contentOwnerId?: string;
    } | null;
    onClose: () => void;
    onSuccess?: () => void;
}

const reportReasons = [
    'Spam',
    'Harassment',
    'Hate Speech',
    'Violence',
    'Sexual Content',
    'False Information',
    'Illegal Activity',
    'Other'
];

const ReportModal: React.FC<ReportModalProps> = ({ visible, reportingTarget, onClose, onSuccess }) => {
    const { width } = useWindowDimensions();
    const [selectedReason, setSelectedReason] = useState<string | null>(null);
    const [additionalNotes, setAdditionalNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleClose = () => {
        setSelectedReason(null);
        setAdditionalNotes('');
        setSubmitted(false);
        onClose();
    };

    const submitReport = useCallback(async (reason: string, notes?: string) => {
        if (!reportingTarget) return;
        setLoading(true);
        try {
            await reportContent({
                contentId: reportingTarget.id,
                groupId: reportingTarget.groupId,
                reason,
                contentType: reportingTarget.contentType || 'memory',
                contentOwnerId: reportingTarget.contentOwnerId,
                additionalNotes: notes
            });
            setSubmitted(true);
            onSuccess?.();
        } catch (error: any) {
            Alert.alert('Error', error?.response?.data?.error || 'Could not submit report.');
        } finally {
            setLoading(false);
        }
    }, [reportingTarget, onSuccess]);

    const handleSelectReason = (reason: string) => {
        if (reason === 'Other') {
            setSelectedReason('Other');
        } else {
            submitReport(reason);
        }
    };

    const handleCustomSubmit = () => {
        if (!additionalNotes.trim()) {
            Alert.alert('Required', 'Please describe the issue.');
            return;
        }
        submitReport('Other', additionalNotes.trim());
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={handleClose}
        >
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                className="flex-1"
            >
                <View className="flex-1 justify-end bg-black/60">
                    <TouchableOpacity
                        style={{ flex: 1 }}
                        activeOpacity={1}
                        onPress={handleClose}
                    />
                    <View className="bg-white border-t border-stone-200 rounded-t-[40px] px-8 pt-8 pb-12 self-center w-full max-w-[600px]">
                        <View className="w-12 h-1.5 bg-stone-100 rounded-full self-center mb-8" />

                        {submitted ? (
                            /* Confirmation Screen */
                            <View className="items-center py-6">
                                <View className="w-20 h-20 rounded-full bg-emerald-50 items-center justify-center mb-6">
                                    <Ionicons name="checkmark-circle" size={54} color="#10b981" />
                                </View>
                                <Text className="text-[#1c1c18] text-2xl font-headline-bold text-center mb-2">
                                    Thanks.
                                </Text>
                                <Text className="text-stone-700 text-[16px] font-body-bold text-center mb-1">
                                    Your report has been submitted.
                                </Text>
                                <Text className="text-stone-400 text-sm font-body-medium text-center mb-8 px-4 leading-relaxed">
                                    Our moderation team will review it within 24 hours.
                                </Text>
                                <TouchableOpacity
                                    onPress={handleClose}
                                    className="bg-[#b30069] px-12 py-4 rounded-full shadow-sm"
                                >
                                    <Text className="text-white font-headline-bold text-base">Close</Text>
                                </TouchableOpacity>
                            </View>
                        ) : selectedReason === 'Other' ? (
                            /* Custom Notes Input Screen */
                            <View>
                                <View className="flex-row items-center mb-6">
                                    <TouchableOpacity onPress={() => setSelectedReason(null)} className="mr-3">
                                        <Ionicons name="arrow-back" size={24} color="#b30069" />
                                    </TouchableOpacity>
                                    <Text className="text-[#1c1c18] text-xl font-headline-bold">
                                        Report Details
                                    </Text>
                                </View>

                                <Text className="text-stone-500 font-body-medium text-sm mb-4">
                                    Please describe what is objectionable about this content:
                                </Text>

                                <TextInput
                                    placeholder="Enter additional details here..."
                                    placeholderTextColor="#a8a29e"
                                    value={additionalNotes}
                                    onChangeText={setAdditionalNotes}
                                    multiline
                                    numberOfLines={4}
                                    maxLength={300}
                                    selectionColor="#b30069"
                                    className="border border-stone-200 rounded-2xl p-4 text-stone-900 font-body-medium text-sm bg-stone-50 mb-6 min-h-[100px] text-start"
                                    style={{ textAlignVertical: 'top' }}
                                />

                                <TouchableOpacity
                                    onPress={handleCustomSubmit}
                                    disabled={loading}
                                    className="bg-[#b30069] w-full py-4 rounded-full items-center justify-center flex-row shadow-sm"
                                >
                                    {loading ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <Text className="text-white font-headline-bold text-base">Submit Report</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        ) : (
                            /* Reason Picker Screen */
                            <View>
                                <View className="mb-6">
                                    <Text className="text-[#1c1c18] text-xl font-headline-bold mb-1">
                                        Report Content
                                    </Text>
                                    <Text className="text-stone-400 font-body-medium text-xs leading-normal">
                                        Help us keep Mandali safe. Select a reason below.
                                    </Text>
                                </View>

                                {loading ? (
                                    <View className="py-20 items-center justify-center">
                                        <ActivityIndicator size="large" color="#b30069" />
                                    </View>
                                ) : (
                                    <View className="flex-row flex-wrap gap-2.5 justify-center">
                                        {reportReasons.map((reason) => (
                                            <TouchableOpacity
                                                key={reason}
                                                onPress={() => handleSelectReason(reason)}
                                                style={{ width: width < 600 ? '47%' : '31%' }}
                                                className="bg-[#FDF9F3]/60 border border-stone-200/60 p-4 rounded-2xl items-center justify-center active:bg-stone-100"
                                            >
                                                <Text className="text-stone-800 text-xs font-body-bold text-center">
                                                    {reason}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}

                                <TouchableOpacity
                                    onPress={handleClose}
                                    className="mt-8 py-2 items-center"
                                >
                                    <Text className="text-stone-300 font-headline-bold uppercase tracking-widest text-[11px]">
                                        Cancel
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

export default ReportModal;
