import React from 'react';
import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import { getOptimizedImageUrl } from '../../../lib/api';
import type { PlanRsvpUser } from '../../../types/plans';

interface PlanGoingAvatarsProps {
    going: PlanRsvpUser[];
    maxVisible?: number;
    size?: 'sm' | 'md';
}

const PlanGoingAvatars = ({ going, maxVisible = 5, size = 'sm' }: PlanGoingAvatarsProps) => {
    const visible = going.slice(0, maxVisible);
    const overflow = Math.max(going.length - visible.length, 0);
    const dim = size === 'md' ? 40 : 28;
    const fontSize = size === 'md' ? 16 : 11;

    if (going.length === 0) {
        return null;
    }

    return (
        <View className="flex-row items-center">
            {visible.map((person, index) => (
                person.avatarUrl ? (
                    <Image
                        key={person.userId}
                        source={{ uri: getOptimizedImageUrl(person.avatarUrl, 'w_120,q_auto,f_auto') }}
                        style={{
                            width: dim,
                            height: dim,
                            borderRadius: dim / 2,
                            marginLeft: index === 0 ? 0 : -8,
                            borderWidth: 2,
                            borderColor: '#fff',
                        }}
                        contentFit="cover"
                    />
                ) : (
                    <View
                        key={person.userId}
                        className="rounded-full border-2 border-white items-center justify-center bg-[#fdeaf4]"
                        style={{
                            width: dim,
                            height: dim,
                            marginLeft: index === 0 ? 0 : -8,
                        }}
                    >
                        <Text className="font-body-bold text-[#b30069]" style={{ fontSize: fontSize - 2 }}>
                            {person.name.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                )
            ))}
            {overflow > 0 && (
                <View
                    className="rounded-full border-2 border-white bg-stone-100 items-center justify-center"
                    style={{ width: dim, height: dim, marginLeft: -8 }}
                >
                    <Text className="font-body-bold text-[#594048]" style={{ fontSize: fontSize - 3 }}>
                        +{overflow}
                    </Text>
                </View>
            )}
        </View>
    );
};

export default PlanGoingAvatars;
