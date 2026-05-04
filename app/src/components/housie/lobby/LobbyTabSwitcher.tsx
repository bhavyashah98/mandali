import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LobbyTabSwitcherProps {
    activeTab: 'active' | 'scheduled';
    setActiveTab: (tab: 'active' | 'scheduled') => void;
    activeCount: number;
}

export const LobbyTabSwitcher = ({ activeTab, setActiveTab, activeCount }: LobbyTabSwitcherProps) => {
    return (
        <View className="mb-8">
            <View className="flex-row bg-stone-200/50 rounded-[32px] relative h-16 items-center overflow-hidden">
                <TouchableOpacity 
                    onPress={() => setActiveTab('active')}
                    className="flex-1 h-full items-center justify-center z-10"
                >
                    <View className="flex-row items-center">
                        <Ionicons name="flash" size={18} color={activeTab === 'active' ? '#b30069' : '#a09d96'} />
                        <Text className={`font-headline-bold ml-2 text-lg ${activeTab === 'active' ? 'text-stone-800' : 'text-stone-400'}`}>Active</Text>
                        {activeCount > 0 && (
                            <View className="ml-2 bg-[#b30069] px-2 py-0.5 rounded-full">
                                <Text className="text-white text-[10px] font-headline-bold">{activeCount}</Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
                
                <TouchableOpacity 
                    onPress={() => setActiveTab('scheduled')}
                    className="flex-1 h-full items-center justify-center z-10"
                >
                    <View className="flex-row items-center">
                        <Ionicons name="calendar" size={18} color={activeTab === 'scheduled' ? '#b30069' : '#a09d96'} />
                        <Text className={`font-headline-bold ml-2 text-lg ${activeTab === 'scheduled' ? 'text-stone-800' : 'text-stone-400'}`}>Upcoming</Text>
                    </View>
                </TouchableOpacity>

                {/* Perfect Slide Background */}
                <View 
                    style={{ 
                        position: 'absolute',
                        left: activeTab === 'active' ? 0 : '50%',
                        width: '50%',
                        height: '100%',
                        backgroundColor: 'white',
                        borderRadius: 30,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 5,
                        elevation: 3
                    }}
                />
            </View>
        </View>
    );
};
