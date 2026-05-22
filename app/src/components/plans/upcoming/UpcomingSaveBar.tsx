import React from 'react';
import { Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';

const barStyle = {
    shadowColor: '#b30069',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
};

interface UpcomingSaveBarProps {
    bottom: number;
    isHost: boolean;
    rsvpLocked: boolean;
    onPress: () => void;
    loading?: boolean;
}

const UpcomingSaveBar = ({ bottom, isHost, rsvpLocked, onPress, loading }: UpcomingSaveBarProps) => {
    if (!isHost && rsvpLocked) return null;

    const label = isHost ? 'Cancel plan' : 'Save RSVP';
    const isDestructive = isHost;

    return (
        <View className="absolute left-0 right-0 bg-[#fdf9f3] border-t border-stone-100/80 px-6 pt-3" style={{ bottom: 0, paddingBottom: bottom, ...barStyle }}>
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={onPress}
                disabled={loading}
                className={`rounded-[24px] items-center justify-center min-h-[54px] ${isDestructive ? 'bg-stone-800' : 'bg-[#b30069]'}`}
                style={{ opacity: loading ? 0.7 : 1 }}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text className="font-headline-bold text-white text-lg">{label}</Text>
                )}
            </TouchableOpacity>
        </View>
    );
};

export default UpcomingSaveBar;
