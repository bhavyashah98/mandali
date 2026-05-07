import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import MandaliCoin from '../../MandaliCoin';

const { width } = Dimensions.get('window');

interface HousieNotification {
    id: string;
    gameCode: string;
    groupId: string;
    title: string;
}

interface Props {
    notification: HousieNotification;
    onClose: () => void;
}

export const HousieInAppBanner = ({ notification, onClose }: Props) => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const slideAnim = useRef(new Animated.Value(-200)).current;
    const progressAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Slide in
        Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 40,
            friction: 8
        }).start();

        // Progress bar countdown (5s)
        Animated.timing(progressAnim, {
            toValue: 0,
            duration: 5000,
            useNativeDriver: false
        }).start(({ finished }) => {
            if (finished) {
                handleDismiss();
            }
        });
    }, []);

    const handleDismiss = () => {
        Animated.timing(slideAnim, {
            toValue: -200,
            duration: 300,
            useNativeDriver: true
        }).start(() => {
            onClose();
        });
    };

    const handleJoin = () => {
        handleDismiss();
        // Open the game starting screen
        navigation.navigate('Main', {
            screen: 'Housie',
            params: {
                screen: 'HousieStarting',
                params: {
                    gameCode: notification.gameCode,
                    groupId: notification.groupId
                }
            }
        });
    };

    return (
        <Animated.View
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 9999,
                transform: [{ translateY: slideAnim }],
                paddingTop: insets.top + 10,
                paddingHorizontal: 16
            }}
        >
            <TouchableOpacity
                activeOpacity={0.95}
                onPress={handleJoin}
                className="bg-white rounded-[24px] border border-stone-100 flex-row items-center p-4 overflow-hidden"
                style={{
                    elevation: 10,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 12,
                }}
            >
                {/* Background Pattern or Gradient could go here */}
                <View
                    className="absolute top-0 left-0 bottom-0 bg-primary/5"
                    style={{ width: '100%' }}
                />

                {/* Progress Bar Background */}
                <View className="absolute bottom-0 left-0 right-0 h-1 bg-stone-50">
                    <Animated.View
                        style={{
                            height: '100%',
                            backgroundColor: '#b30069',
                            width: progressAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0%', '100%']
                            })
                        }}
                    />
                </View>

                {/* Icon */}
                <View className="w-12 h-12 rounded-2xl bg-primary items-center justify-center mr-3 shadow-sm shadow-primary/20">
                    <FontAwesome5 name="ticket-alt" size={20} color="white" />
                </View>

                {/* Content */}
                <View className="flex-1">
                    <View className="flex-row items-center">
                        <Text className="text-primary font-body-bold text-[10px] uppercase tracking-wider mb-0.5">Game Starting</Text>
                        <View className="w-1 h-1 rounded-full bg-stone-300 mx-1.5" />
                        <Text className="text-stone-400 font-body-medium text-[10px]">Join now</Text>
                    </View>
                    <Text className="text-[#594048] font-headline-bold text-[15px]" numberOfLines={1}>
                        {notification.title}
                    </Text>
                </View>

                {/* Action Button */}
                <TouchableOpacity
                    onPress={handleJoin}
                    className="bg-primary px-5 py-2.5 rounded-full mr-2"
                >
                    <Text className="text-white font-body-bold text-xs">Join</Text>
                </TouchableOpacity>

                {/* Close Button */}
                <TouchableOpacity
                    onPress={handleDismiss}
                    className="w-8 h-8 rounded-full bg-stone-50 items-center justify-center"
                >
                    <MaterialIcons name="close" size={18} color="#a09d96" />
                </TouchableOpacity>
            </TouchableOpacity>
        </Animated.View>
    );
};
