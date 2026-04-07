import React from 'react';
import { View, Text, ScrollView } from 'react-native';

const MoreScreen = () => {
    return (
        <ScrollView className="flex-1 bg-background">
            <View className="p-6">
                <Text className="text-on-surface text-3xl font-bold mb-4">Profile & More</Text>
                <View className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm mb-6">
                   <View className="w-20 h-20 bg-surface-container rounded-full mb-4 self-center items-center justify-center">
                       <Text className="text-3xl">👩</Text>
                   </View>
                   <Text className="text-on-surface font-bold text-center text-xl">Anjali Mehra</Text>
                   <Text className="text-on-surface-variant text-center mb-4">+91 98765 43210</Text>
                   <View className="bg-primary h-12 rounded-full items-center justify-center">
                       <Text className="text-on-primary font-semibold">Edit Profile</Text>
                   </View>
                </View>
                
                <View className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm">
                    <Text className="text-on-surface font-semibold mb-4 text-lg">App Settings</Text>
                    <View className="h-px bg-surface-container mb-4" />
                    <View className="flex-row items-center justify-between mb-4">
                        <Text className="text-on-surface">Privacy</Text>
                        <Text className="text-on-surface-variant">Locked</Text>
                    </View>
                    <View className="flex-row items-center justify-between">
                        <Text className="text-on-surface">Logout</Text>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
};

export default MoreScreen;
