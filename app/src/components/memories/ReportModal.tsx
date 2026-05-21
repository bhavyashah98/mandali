import React, { useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { reportContent } from '../../lib/api';

interface ReportModalProps {
    visible: boolean;
    reportingTarget: { id: string; groupId: string } | null;
    onClose: () => void;
}

const reportReasons = [
    { label: 'Spam', icon: 'mail-outline' },
    { label: 'Harassment', icon: 'hand-left-outline' },
    { label: 'Inappropriate Photo', icon: 'image-outline' },
    { label: 'Others', icon: 'ellipsis-horizontal-outline' }
];

const ReportModal: React.FC<ReportModalProps> = ({ visible, reportingTarget, onClose }) => {
    const submitReport = useCallback(async (reason: string) => {
        if (!reportingTarget) return;
        try {
            await reportContent({
                contentId: reportingTarget.id,
                groupId: reportingTarget.groupId,
                reason
            });
            onClose();
            Alert.alert('Report Submitted', "We'll review this content and take appropriate actions.");
        } catch {
            Alert.alert('Error', 'Could not submit report.');
        }
    }, [reportingTarget, onClose]);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View className="flex-1 justify-end bg-black/60">
                <TouchableOpacity
                    style={{ flex: 1 }}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <View className="bg-white border-t border-stone-200 rounded-t-[30px] px-8 pt-8 pb-12">
                    <View className="w-12 h-1 bg-stone-200 rounded-full self-center mb-8" />

                    <View className="mb-8">
                        <Text className="text-stone-900 text-xl font-headline-bold mb-2">Report Content</Text>
                        <Text className="text-stone-500 font-body-medium text-xs leading-normal">
                            Why are you reporting this photo? We'll review it within 24 hours.
                        </Text>
                    </View>

                    <View className="gap-3">
                        {reportReasons.map((reason) => (
                            <TouchableOpacity
                                key={reason.label}
                                onPress={() => submitReport(reason.label)}
                                className="flex-row items-center bg-stone-50 border border-stone-200 p-4 rounded-2xl active:bg-stone-100"
                            >
                                <View className="w-10 h-10 rounded-full bg-[#b30069]/10 items-center justify-center mr-4">
                                    <Ionicons name={reason.icon as any} size={20} color="#b30069" />
                                </View>
                                <Text className="text-stone-800 text-sm font-body-bold">{reason.label}</Text>
                                <View className="flex-1" />
                                <Ionicons name="chevron-forward" size={16} color="#594048" opacity={0.3} />
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity
                        onPress={onClose}
                        className="mt-8 p-2 items-center"
                    >
                        <Text className="text-stone-400 font-body-bold">Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

export default ReportModal;
