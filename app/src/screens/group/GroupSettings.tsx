import React from 'react';
import { View, Text, ScrollView } from 'react-native';

const GroupSettings = () => {
    return (
        <ScrollView className="flex-1 bg-background">
            <View className="p-6">
                <Text className="text-on-surface text-3xl font-bold mb-4">Mandali Settings</Text>
                <View className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm mb-6">
                    <Text className="text-on-surface font-bold text-xl mb-4">South Delhi Kitties</Text>
                    <View className="h-px bg-surface-container mb-4" />
                    <View className="flex-row items-center justify-between mb-4">
                        <Text className="text-on-surface font-semibold">Members</Text>
                        <Text className="text-primary">8 Members</Text>
                    </View>
                    <View className="flex-row items-center justify-between mb-4">
                        <Text className="text-on-surface font-semibold">Notifications</Text>
                        <Text className="text-on-surface-variant">On</Text>
                    </View>
                    <View className="flex-row items-center justify-between">
                        <Text className="text-on-surface font-semibold text-error">Leave Mandali</Text>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
};

export default GroupSettings;
