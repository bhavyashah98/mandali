import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useIsTablet } from '../../../hooks/useIsTablet';

export const EmptyState: React.FC = () => {
    const navigation = useNavigation<any>();
    const isTablet = useIsTablet();

    return (
        <View className="items-center w-full mb-12 mt-16 px-6">
            <View 
                style={{ backgroundColor: 'rgba(179, 0, 105, 0.05)' }}
                className={`rounded-full items-center justify-center mb-8 ${isTablet ? 'w-40 h-40' : 'w-20 h-20'}`}
            >
                <MaterialIcons name="videogame-asset" size={isTablet ? 80 : 40} color="#b30069" />
            </View>
            <Text className={`font-headline-bold text-on-surface text-center mb-4 ${isTablet ? 'text-5xl' : 'text-2xl'}`}>No Mandali Found!</Text>
            <Text className={`text-on-surface-variant text-center font-body-medium leading-relaxed mb-12 ${isTablet ? 'text-2xl px-20' : 'text-[15px]'}`}>
                Games are better with friends and family. Create or join a Mandali to start playing!
            </Text>

            <View className="w-full gap-6">
                <TouchableOpacity
                    onPress={() => navigation.navigate('Groups', {
                        screen: 'CreateGroup',
                        params: {
                            returnTo: {
                                parent: 'Games',
                                screen: 'GameSelectGroup',
                            }
                        }
                    })}
                    style={{ height: isTablet ? 110 : 64, elevation: 8, shadowColor: '#b30069', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 }}
                    className="rounded-[32px] bg-[#b30069] flex-row items-center justify-center px-8"
                >
                    <Ionicons name="add-circle" size={isTablet ? 36 : 24} color="white" />
                    <Text
                        className="text-white font-headline-bold ml-4"
                        style={{ fontSize: isTablet ? 32 : 20 }}
                    >Create New Mandali</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => navigation.navigate('Groups', {
                        screen: 'JoinGroup',
                        params: {
                            returnTo: {
                                parent: 'Games',
                                screen: 'GameSelectGroup',
                            }
                        }
                    })}
                    style={{ height: isTablet ? 110 : 64, borderColor: 'rgba(179, 0, 105, 0.1)' }}
                    className="rounded-[32px] bg-[#fcecf2] flex-row items-center justify-center px-8 border"
                >
                    <Ionicons name="enter" size={isTablet ? 36 : 24} color="#b30069" />
                    <Text
                        className="text-[#b30069] font-headline-bold ml-4"
                        style={{ fontSize: isTablet ? 32 : 20 }}
                    >Join Existing Mandali</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};
