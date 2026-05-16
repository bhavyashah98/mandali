import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export interface BaseLobbyCardProps {
    title: string;
    hostName: string;
    status: 'active' | 'starting' | 'waiting' | 'scheduled';
    memberCount: number;
    participantCount: number;
    activeColor: string;
    onPress: () => void;
    buttonLabel: string;
    buttonIcon: string;
    headerBadge?: React.ReactNode;
    additionalStats?: React.ReactNode;
}

export const BaseLobbyCard = ({
    title,
    hostName,
    status,
    memberCount,
    participantCount,
    activeColor,
    onPress,
    buttonLabel,
    buttonIcon,
    headerBadge,
    additionalStats
}: BaseLobbyCardProps) => {
    const isLive = status === 'active';
    const isStarting = status === 'starting';

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.9}
            style={{
                backgroundColor: 'white',
                shadowColor: activeColor,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: isLive ? 0.08 : 0.03,
                shadowRadius: 15,
                elevation: 4,
                borderColor: isLive ? `${activeColor}33` : '#f1f1f1'
            }}
            className={`w-full rounded-[32px] p-6 mb-5 border ${isLive ? 'border-primary/20' : 'border-stone-100'}`}
        >
            <View className="flex-row items-start justify-between mb-4">
                <View className="flex-1 mr-4">
                    <View className="flex-row items-center mb-1">
                        <Text className="text-stone-800 font-headline-bold text-xl flex-shrink" numberOfLines={1}>
                            {title}
                        </Text>
                        {headerBadge}
                    </View>
                    <Text className="text-stone-500 font-body text-sm">by {hostName}</Text>
                </View>

                {isLive ? (
                    <View className="bg-red-500 px-3 py-1.5 rounded-full flex-row items-center">
                        <View className="w-2 h-2 bg-white rounded-full mr-2" />
                        <Text className="text-white font-headline-bold text-[10px] tracking-widest">LIVE</Text>
                    </View>
                ) : isStarting ? (
                    <View className="bg-orange-500 px-3 py-1.5 rounded-full">
                        <Text className="text-white font-headline-bold text-[10px] tracking-widest">STARTING</Text>
                    </View>
                ) : (
                    <View className="bg-blue-50 px-3 py-1.5 rounded-full">
                        <Text className="text-blue-600 font-headline-bold text-[10px] tracking-widest">OPEN</Text>
                    </View>
                )}
            </View>

            <View className="flex-row items-center justify-between mt-2">
                <View className="flex-row items-center">
                    <View className="flex-row items-center mr-4">
                        <Ionicons name="people" size={16} color="#a09d96" />
                        <Text className="text-stone-400 font-body-bold text-xs ml-1">
                            {participantCount || 0}/{memberCount}
                        </Text>
                    </View>
                    {additionalStats}
                </View>

                <LinearGradient
                    colors={[activeColor, activeColor + 'dd']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    className="rounded-2xl"
                >
                    <View className="px-5 py-2.5 flex-row items-center">
                        <FontAwesome5 name={buttonIcon as any} size={14} color="white" />
                        <Text className="text-white font-headline-bold ml-2 text-sm">{buttonLabel}</Text>
                    </View>
                </LinearGradient>
            </View>
        </TouchableOpacity>
    );
};
