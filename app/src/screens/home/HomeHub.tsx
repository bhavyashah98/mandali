import React from 'react';
import { View, Text, ScrollView } from 'react-native';

const HomeHub = () => {
    return (
        <ScrollView className="flex-1 bg-background">
            <View className="p-6">
                <Text className="text-on-surface text-3xl font-bold mb-4">Good Evening, Anjali!</Text>
                <View className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm mb-6">
                    <Text className="text-on-surface-variant text-lg font-semibold mb-2">Next Gathering</Text>
                    <Text className="text-on-surface text-2xl font-bold">Lodi Garden Picnic</Text>
                    <Text className="text-on-surface-variant">Sunday, 4th May at 11:30 AM</Text>
                </View>
                
                <Text className="text-on-surface text-xl font-bold mb-4">Your Mandalis</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                   <View className="bg-surface-container w-64 h-32 rounded-3xl mr-4 p-4 justify-between">
                       <Text className="text-on-surface font-bold text-lg">South Delhi Kitties</Text>
                       <Text className="text-primary">8 Members</Text>
                   </View>
                   <View className="bg-surface-container w-64 h-32 rounded-3xl mr-4 p-4 justify-between">
                       <Text className="text-on-surface font-bold text-lg">Family Circle</Text>
                       <Text className="text-primary">12 Members</Text>
                   </View>
                </ScrollView>
            </View>
        </ScrollView>
    );
};

export default HomeHub;
