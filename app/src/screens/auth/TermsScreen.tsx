import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    BackHandler,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useIsTablet } from '../../hooks/useIsTablet';

interface TermsScreenProps {
    onAccept: () => void;
    onDecline?: () => void;
}

const SECTIONS = [
    {
        icon: 'shield-checkmark-outline' as const,
        title: '1. Community Standards',
        body: 'Mandali does not tolerate objectionable content of any kind, including but not limited to hate speech, harassment, nudity, violence, or abusive behavior. Violations will result in immediate removal from the platform.',
    },
    {
        icon: 'eye-outline' as const,
        title: '2. Content Moderation',
        body: 'All user-generated content is subject to review. Mandali employs automated and manual moderation to filter objectionable content before and after publication.',
    },
    {
        icon: 'flag-outline' as const,
        title: '3. Reporting Objectionable Content',
        body: 'Users may flag any content they find objectionable using the "Report" option available on all posts, photos, and comments. Reports are reviewed promptly.',
    },
    {
        icon: 'person-remove-outline' as const,
        title: '4. Blocking Abusive Users',
        body: "Users may block any other user at any time. Blocking immediately removes the user's content from your feed and notifies the Mandali team to review the reported account.",
    },
    {
        icon: 'time-outline' as const,
        title: '5. Developer Response Policy',
        body: 'Mandali commits to acting on all reports of objectionable content within 24 hours — including content removal and account ejection where warranted.',
    },
];

const TermsScreen: React.FC<TermsScreenProps> = ({ onAccept, onDecline }) => {
    const isTablet = useIsTablet();
    const [agreed, setAgreed] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleAccept = async () => {
        if (!agreed) return;
        setLoading(true);
        try {
            await onAccept();
        } catch (error) {
            Alert.alert('Error', 'Failed to save terms acceptance. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDecline = () => {
        Alert.alert(
            'Decline Terms',
            'You must agree to the Terms of Use & Community Guidelines to use Mandali. Declining will prevent access to the app.',
            [
                { text: 'Go Back', style: 'cancel' },
                {
                    text: 'Decline & Exit',
                    style: 'destructive',
                    onPress: () => {
                        if (onDecline) {
                            onDecline();
                        } else if (Platform.OS === 'android') {
                            BackHandler.exitApp();
                        } else {
                            // iOS does not allow apps to exit programmatically.
                            // The Terms screen already blocks all app content —
                            // instruct the user to close the app manually.
                            Alert.alert(
                                'Close the App',
                                'Please swipe up or press the Home button to close Mandali. You will need to agree to continue using the app.',
                                [{ text: 'OK', style: 'default' }]
                            );
                        }
                    },
                },
            ]
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-[#FDF9F3]" edges={['top', 'bottom']}>
            <View className="flex-1 items-center">
                <View className="flex-1 w-full" style={{ maxWidth: isTablet ? 600 : undefined }}>

                    {/* Header */}
                    <View className={`items-center ${isTablet ? 'mt-10 px-16' : 'mt-6 px-6'}`}>
                        <View className="w-16 h-16 rounded-full bg-[#b30069]/10 items-center justify-center mb-4">
                            <Ionicons name="document-text" size={32} color="#b30069" />
                        </View>
                        <Text className={`font-headline-bold text-[#1c1c18] text-center ${isTablet ? 'text-4xl' : 'text-2xl'}`}>
                            {'Terms of Use &\nCommunity Guidelines'}
                        </Text>
                        <Text className={`text-stone-400 font-body-medium text-center mt-2 ${isTablet ? 'text-lg' : 'text-[13px]'}`}>
                            Please read and agree to these terms before continuing.
                        </Text>
                    </View>

                    {/* Scrollable Sections */}
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        className={`flex-1 ${isTablet ? 'mx-16 my-8' : 'mx-6 my-6'}`}
                        contentContainerStyle={{ paddingBottom: 8 }}
                    >
                        <View className="bg-white rounded-[28px] border border-stone-100 overflow-hidden">
                            {SECTIONS.map((section, index) => (
                                <View
                                    key={index}
                                    className={`px-5 py-4 ${index < SECTIONS.length - 1 ? 'border-b border-stone-100' : ''}`}
                                >
                                    <View className="flex-row items-center mb-2">
                                        <View className="w-7 h-7 rounded-full bg-[#b30069]/10 items-center justify-center mr-2.5">
                                            <Ionicons name={section.icon} size={14} color="#b30069" />
                                        </View>
                                        <Text className={`font-headline-bold text-[#1c1c18] flex-1 ${isTablet ? 'text-base' : 'text-[13px]'}`}>
                                            {section.title}
                                        </Text>
                                    </View>
                                    <Text className={`text-stone-500 font-body-medium leading-relaxed ${isTablet ? 'text-base' : 'text-[12px]'}`}>
                                        {section.body}
                                    </Text>
                                </View>
                            ))}
                        </View>

                        <View className="bg-red-50 border border-red-100 p-4 rounded-2xl mt-4">
                            <Text className={`text-red-700 font-body-bold leading-relaxed ${isTablet ? 'text-sm' : 'text-[11px]'}`}>
                                ⚠️ Violating these guidelines may result in content removal and permanent account suspension.
                            </Text>
                        </View>
                    </ScrollView>

                    {/* Checkbox + Buttons */}
                    <View className={`gap-4 ${isTablet ? 'px-16 pb-10' : 'px-6 pb-6'}`}>
                        {/* Checkbox */}
                        <TouchableOpacity
                            onPress={() => setAgreed(!agreed)}
                            activeOpacity={0.8}
                            className="flex-row items-center px-1"
                        >
                            <View className="mr-3">
                                <Ionicons
                                    name={agreed ? 'checkbox' : 'square-outline'}
                                    size={isTablet ? 30 : 24}
                                    color={agreed ? '#b30069' : '#a8a29e'}
                                />
                            </View>
                            <Text className={`text-stone-600 font-body-bold leading-normal flex-1 ${isTablet ? 'text-lg' : 'text-[13px]'}`}>
                                I have read and agree to the Terms of Use & Community Guidelines
                            </Text>
                        </TouchableOpacity>

                        {/* I Agree button */}
                        <TouchableOpacity
                            onPress={handleAccept}
                            disabled={!agreed || loading}
                            style={{ height: isTablet ? 90 : 56 }}
                            className={`w-full rounded-[28px] items-center justify-center flex-row shadow-sm ${
                                agreed ? 'bg-[#b30069]' : 'bg-stone-200'
                            }`}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <>
                                    <Text className={`font-headline-bold text-white ${isTablet ? 'text-2xl' : 'text-base'}`}>
                                        I Agree & Continue
                                    </Text>
                                    <Ionicons name="arrow-forward" size={isTablet ? 24 : 18} color="white" style={{ marginLeft: 8 }} />
                                </>
                            )}
                        </TouchableOpacity>

                        {/* Decline button */}
                        <TouchableOpacity
                            onPress={handleDecline}
                            activeOpacity={0.7}
                            className="items-center py-2"
                        >
                            <Text className={`text-stone-400 font-body-medium ${isTablet ? 'text-base' : 'text-[13px]'}`}>
                                Decline
                            </Text>
                        </TouchableOpacity>
                    </View>

                </View>
            </View>
        </SafeAreaView>
    );
};

export default TermsScreen;
