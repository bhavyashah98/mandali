import React from 'react';
import { View, Text } from 'react-native';

const TambolaScreen = () => {
    return (
        <View className="flex-1 bg-background items-center justify-center p-6">
            <Text className="text-primary text-4xl mb-4 font-bold">Tambola</Text>
            <View className="bg-surface-container-lowest rounded-3xl p-8 items-center shadow-lg">
                <Text className="text-on-surface text-2xl font-bold mb-2">Coming Soon!</Text>
                <Text className="text-on-surface-variant text-center">Get ready for full-house fun with your kitty group.</Text>
            </View>
        </View>
    );
};

export default TambolaScreen;
