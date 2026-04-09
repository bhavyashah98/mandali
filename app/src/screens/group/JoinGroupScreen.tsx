import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { joinGroup } from '../../lib/api';

const JoinGroupScreen = () => {
    const navigation = useNavigation();
    const queryClient = useQueryClient();
    const [inviteCode, setInviteCode] = useState('');

    const joinMutation = useMutation({
        mutationFn: (code: string) => joinGroup(code.trim().toUpperCase()),
        onSuccess: (data) => {
            // CRITICAL: Invalidate the groups list so the new group shows up!
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            
            Alert.alert('Success', `You have joined "${data.group.name}"!`, [
                { text: 'Great!', onPress: () => navigation.goBack() }
            ]);
        },
        onError: (err: any) => {
            console.error('[JoinGroup] Error:', err?.response?.data || err.message);
            Alert.alert('Error', err?.response?.data?.error || 'Failed to join group. Please check the code.');
        }
    });

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
            {/* Top Bar */}
            <View className="flex-row items-center px-4 py-4">
                <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 items-center justify-center">
                    <MaterialIcons name="arrow-back" size={24} color="#b30069" />
                </TouchableOpacity>
                <Text className="text-xl font-headline-bold text-on-surface ml-2">Join Mandali</Text>
            </View>

            <View className="flex-1 p-6">
                <Text className="font-headline-bold text-3xl mb-2 text-on-surface">Join a Mandali</Text>
                <Text className="font-body-regular text-on-surface-variant mb-8 text-[15px]">
                    Paste the 8-character invite code shared with you to join your digital gathering circle.
                </Text>
                
                <View className="bg-surface-container rounded-2xl px-5 justify-center border border-dashed border-primary/30 h-16">
                    <TextInput 
                        placeholder="e.g. AB12CD34"
                        placeholderTextColor="#a09d96"
                        className="font-body-medium text-lg text-primary"
                        autoCapitalize="characters"
                        value={inviteCode}
                        onChangeText={setInviteCode}
                        autoFocus
                    />
                </View>

                {/* Submit Action */}
                <TouchableOpacity 
                    className={`w-full h-14 mt-auto mb-10 rounded-full items-center justify-center flex-row ${inviteCode.trim() ? 'bg-primary' : 'bg-primary/50'}`}
                    disabled={!inviteCode.trim() || loading}
                    onPress={handleJoinGroup}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="font-headline-bold text-lg text-white">Verify & Join</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

export default JoinGroupScreen;
