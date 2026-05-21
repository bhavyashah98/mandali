import React, { useState } from 'react';
import { useIsTablet } from '../../hooks/useIsTablet';
import { View, Text, TouchableOpacity, TextInput, Alert, ActivityIndicator, useWindowDimensions, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { joinGroup } from '../../lib/api';

const JoinGroupScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const queryClient = useQueryClient();
    const { width } = useWindowDimensions();
    const isTablet = useIsTablet();
    const returnTo = route.params?.returnTo;
    const [inviteCode, setInviteCode] = useState(route.params?.inviteCode || '');


    const joinMutation = useMutation({
        mutationFn: (code: string) => joinGroup(code.trim().toUpperCase()),
        onSuccess: (data) => {
            // CRITICAL: Invalidate the groups list so the new group shows up!
            queryClient.invalidateQueries({ queryKey: ['groups'] });

            Alert.alert('Success', `You have joined "${data.group.name}"!`, [
                {
                    text: 'Great!',
                    onPress: () => {
                        const finalParams = { ...returnTo?.params, groupId: data.group.id };
                        if (returnTo?.parent) {
                            navigation.replace(returnTo.parent, { screen: returnTo.screen, params: finalParams });
                        } else {
                            navigation.replace(returnTo?.screen || 'GroupDetail', finalParams);
                        }
                    }
                }
            ]);
        },
        onError: (err: any) => {
            console.error('[JoinGroup] Error:', err?.response?.data || err.message);
            Alert.alert('Error', err?.response?.data?.error || 'Failed to join group. Please check the code.');
        }
    });

    // Auto-trigger if we came from a deep link
    React.useEffect(() => {
        if (route.params?.inviteCode) {
            setInviteCode(route.params.inviteCode);
            // Auto-join if user is already logged in (which they are if they see this screen)
            joinMutation.mutate(route.params.inviteCode);
        }
    }, [route.params?.inviteCode]);

    const handleJoinGroup = () => {
        if (!inviteCode.trim()) {
            Alert.alert('Error', 'Please enter an invite code');
            return;
        }
        joinMutation.mutate(inviteCode);
    };

    const loading = joinMutation.isPending;

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
                {/* Top Bar */}
                <View className={`flex-row items-center px-${isTablet ? '10' : '4'} py-${isTablet ? '8' : '4'}`}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        className={`${isTablet ? 'w-16 h-16' : 'w-10 h-10'} items-center justify-center rounded-full bg-stone-50`}
                    >
                        <MaterialIcons name="arrow-back" size={isTablet ? 32 : 24} color="#b30069" />
                    </TouchableOpacity>
                    <Text className={`${isTablet ? 'text-4xl' : 'text-xl'} font-headline-bold text-on-surface ml-4`}>Join Mandali</Text>
                </View>

                <View className={`flex-1 ${isTablet ? 'px-16' : 'p-6'}`}>
                    {/* Restored Description */}
                    <View className={`mb-${isTablet ? '12' : '6'}`}>
                        <Text
                            className="font-body-medium text-on-surface-variant opacity-60"
                            style={{ fontSize: isTablet ? 24 : 15, lineHeight: isTablet ? 36 : 22 }}
                        >
                            Paste the 8-character invite code shared with you to join your digital gathering circle.
                        </Text>
                    </View>

                    <View className={`bg-stone-50 rounded-[32px] px-8 justify-center border border-dashed border-primary/30 ${isTablet ? 'h-30 mb-16' : 'h-16 mb-8'} w-full`}>
                        <TextInput
                            placeholder="e.g. AB12CD34"
                            placeholderTextColor="#a09d96"
                            className="font-body-medium text-primary"
                            style={{
                                height: isTablet ? 120 : 64,
                                fontSize: isTablet ? 32 : 20,
                                letterSpacing: isTablet ? 4 : 2,
                                textAlignVertical: 'center',
                                lineHeight: isTablet ? 44 : 24,
                                padding: 0
                            }}
                            autoCapitalize="characters"
                            value={inviteCode}
                            onChangeText={setInviteCode}
                            autoFocus
                        />
                    </View>

                    {/* Info Cards - MATCHING CINEMATIC SCALING */}
                    <View className={`w-full ${isTablet ? 'gap-10 mb-16' : 'gap-4 mb-8 flex-1'}`}>
                        <View className={`bg-primary/5 rounded-[32px] border border-primary/10 ${isTablet ? 'p-12' : 'p-5'}`}>
                            <MaterialIcons name="vpn-key" size={isTablet ? 48 : 24} color="#b30069" className="mb-4" />
                            <Text
                                className="font-headline-bold text-[#1c1c18]"
                                style={{ fontSize: isTablet ? 36 : 18, marginBottom: isTablet ? 16 : 4 }}
                            >Private Access</Text>
                            <Text
                                className="font-body-medium text-stone-500"
                                style={{ fontSize: isTablet ? 22 : 13, lineHeight: isTablet ? 36 : 20 }}
                            >
                                Mandalis are private spaces accessible exclusively via valid 8-character invite codes.
                            </Text>
                        </View>
                        <View className={`bg-primary/5 rounded-[32px] border border-primary/10 ${isTablet ? 'p-12' : 'p-5'}`}>
                            <MaterialIcons name="auto-awesome-mosaic" size={isTablet ? 48 : 24} color="#b30069" className="mb-4" />
                            <Text
                                className="font-headline-bold text-[#1c1c18]"
                                style={{ fontSize: isTablet ? 36 : 18, marginBottom: isTablet ? 16 : 4 }}
                            >Shared Journeys</Text>
                            <Text
                                className="font-body-medium text-stone-500"
                                style={{ fontSize: isTablet ? 22 : 13, lineHeight: isTablet ? 36 : 20 }}
                            >
                                Once joined, you will unlock all past memories, gatherings, and group events.
                            </Text>
                        </View>
                        <View className={`bg-primary/5 rounded-[32px] border border-primary/10 ${isTablet ? 'p-12' : 'p-5'}`}>
                            <MaterialIcons name="shield" size={isTablet ? 48 : 24} color="#b30069" className="mb-4" />
                            <Text
                                className="font-headline-bold text-[#1c1c18]"
                                style={{ fontSize: isTablet ? 36 : 18, marginBottom: isTablet ? 16 : 4 }}
                            >Safe Space</Text>
                            <Text
                                className="font-body-medium text-stone-500"
                                style={{ fontSize: isTablet ? 22 : 13, lineHeight: isTablet ? 36 : 20 }}
                            >
                                Your connections and memories remain completely secure within your protected circle.
                            </Text>
                        </View>
                    </View>

                    {/* Submit Action */}
                    <TouchableOpacity
                        className={`rounded-full items-center justify-center flex-row ${inviteCode.trim() ? 'bg-primary' : 'bg-primary/50'} ${isTablet ? 'h-24 w-full mb-20' : 'w-full h-14 mt-auto mb-10'}`}
                        disabled={!inviteCode.trim() || loading}
                        onPress={handleJoinGroup}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" size={isTablet ? 'large' : 'small'} />
                        ) : (
                            <Text
                                className="font-headline-bold text-white"
                                style={{ fontSize: isTablet ? 32 : 20 }}
                            >Verify & Join</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default JoinGroupScreen;
