import React from 'react';
import { View, Text, ScrollView, Image } from 'react-native';

const MemoriesModule = () => {
    return (
        <ScrollView className="flex-1 bg-background">
            <View className="p-6">
                <Text className="text-on-surface text-3xl font-bold mb-4">Memories & Albums</Text>
                <View className="flex-row flex-wrap justify-between">
                    <View className="bg-surface-container-lowest rounded-3xl w-[48%] mb-4 p-4 shadow-sm items-center">
                        <View className="bg-surface-container w-full h-32 rounded-2xl mb-2 items-center justify-center">
                            <Text className="text-on-surface-variant">April 2024</Text>
                        </View>
                        <Text className="text-on-surface font-bold">April 2024</Text>
                        <Text className="text-on-surface-variant">12 Photos</Text>
                    </View>
                    <View className="bg-surface-container-lowest rounded-3xl w-[48%] mb-4 p-4 shadow-sm items-center">
                        <View className="bg-surface-container w-full h-32 rounded-2xl mb-2 items-center justify-center">
                            <Text className="text-on-surface-variant">March 2024</Text>
                        </View>
                        <Text className="text-on-surface font-bold">March 2024</Text>
                        <Text className="text-on-surface-variant">48 Photos</Text>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
};

export default MemoriesModule;
