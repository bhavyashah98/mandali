import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

const HousieScreen = () => {
    // Mock data for the board
    const calledNumbers = [1, 4, 5, 12, 18, 22, 34, 42, 45, 51, 60, 67, 72, 88];
    const recentNumbers = [
        { num: '12', time: '2 mins ago' },
        { num: '89', time: '4 mins ago' },
        { num: '05', time: '5 mins ago' }
    ];

    const prizes = [
        { name: 'Early Five', status: 'CLAIMED', color: 'bg-green-100', textColor: 'text-green-700', icon: 'looks-5' },
        { name: 'Top Line', status: 'VERIFY (1)', color: 'bg-pink-100', textColor: 'text-pink-700', icon: 'horizontal-rule' },
        { name: 'Full House', status: 'OPEN', color: 'bg-stone-100', textColor: 'text-stone-700', icon: 'grid-view' }
    ];

    const renderBoard = () => {
        const rows = [];
        for (let i = 0; i < 9; i++) {
            const row = [];
            for (let j = 1; j <= 10; j++) {
                const num = i * 10 + j;
                const isCalled = calledNumbers.includes(num);
                row.push(
                    <View 
                        key={num} 
                        className={`w-7 h-7 rounded-full items-center justify-center m-0.5 ${isCalled ? 'bg-primary' : 'bg-surface-container-low'}`}
                    >
                        <Text className={`text-[11px] font-body-bold ${isCalled ? 'text-white' : 'text-on-surface-variant'}`}>
                            {num}
                        </Text>
                    </View>
                );
            }
            rows.push(<View key={i} className="flex-row justify-center">{row}</View>);
        }
        return rows;
    };

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            {/* Header Placeholder - as per screenshot top bar */}
            <View className="flex-row items-center justify-between px-6 py-3">
                 <MaterialIcons name="menu" size={24} color="#594048" />
                 <Text className="text-2xl font-headline-bold text-primary">Mandali</Text>
                 <View className="w-10 h-10 rounded-full border-2 border-primary/20 overflow-hidden">
                    <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' }} className="w-full h-full" />
                 </View>
            </View>

            <ScrollView 
                className="flex-1" 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
            >
                {/* Now Calling Section */}
                <View className="items-center mt-6">
                    <Text className="text-stone-400 font-body-bold tracking-widest text-sm mb-4">NOW CALLING</Text>
                    
                    {/* Big Number Circle */}
                    <View className="w-48 h-48 rounded-full bg-primary items-center justify-center shadow-2xl shadow-primary/40 border-[8px] border-white">
                        <Text className="text-white text-8xl font-headline-bold">42</Text>
                    </View>

                    {/* Actions */}
                    <View className="mt-8 px-8 w-full gap-4">
                        <TouchableOpacity className="bg-primary h-14 rounded-full flex-row items-center justify-center shadow-lg shadow-primary/20">
                            <MaterialIcons name="play-arrow" size={24} color="white" className="mr-2" />
                            <Text className="text-white font-headline-bold text-lg">Call Next Number</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity className="bg-surface-container h-14 rounded-full flex-row items-center justify-center">
                            <Text className="text-on-surface font-headline-bold text-lg">Review Calls</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Recent Numbers */}
                <View className="mt-12 px-6">
                    <Text className="text-xl font-headline-bold text-on-surface mb-6">Recent Numbers</Text>
                    <View className="flex-row items-center justify-between px-2">
                        {recentNumbers.map((item, idx) => (
                            <View key={idx} className="items-center flex-1">
                                <View className="w-14 h-14 rounded-full border-2 border-stone-200 items-center justify-center mb-2 bg-white">
                                    <Text className="text-xl font-headline-bold text-on-surface">{item.num}</Text>
                                </View>
                                <Text className="text-[10px] text-stone-400 font-body-medium">{item.time}</Text>
                                {idx < recentNumbers.length - 1 && (
                                    <View className="absolute right-[-20%] top-6 w-1/2 h-[1px] bg-stone-100" />
                                )}
                            </View>
                        ))}
                    </View>
                </View>

                {/* Main Board */}
                <View className="mt-12 px-6">
                    <View className="flex-row items-center justify-between mb-6">
                        <Text className="text-2xl font-headline-bold text-on-surface">Main Board</Text>
                        <View className="flex-row gap-2">
                             <View className="bg-green-100 flex-row items-center px-2 py-1 rounded-full border border-green-200">
                                <MaterialIcons name="check-circle" size={14} color="#2e7d32" />
                                <Text className="text-[10px] font-body-bold text-green-800 ml-1">34 Called</Text>
                             </View>
                             <View className="bg-stone-100 flex-row items-center px-2 py-1 rounded-full border border-stone-200">
                                <MaterialIcons name="schedule" size={14} color="#594048" />
                                <Text className="text-[10px] font-body-bold text-stone-800 ml-1">56 Remaining</Text>
                             </View>
                        </View>
                    </View>

                    <View className="bg-white rounded-[40px] p-4 shadow-sm border border-stone-100">
                        {renderBoard()}
                    </View>
                </View>

                {/* Placeholder for "Active Members" as per user request */}
                <View className="mt-12 px-6">
                     <View className="bg-primary/5 h-40 rounded-[40px] border border-dashed border-primary/20 items-center justify-center p-8">
                        <Text className="text-primary font-headline-bold text-lg text-center mb-2">Members View Layer</Text>
                        <Text className="text-on-surface-variant font-body-regular text-center text-sm">
                            This area is reserved for the active game participants view.
                        </Text>
                     </View>
                </View>

                {/* Prizes */}
                <View className="mt-12 px-6">
                    <Text className="text-2xl font-headline-bold text-on-surface mb-6">Prizes</Text>
                    <View className="gap-3">
                        {prizes.map((prize, idx) => (
                            <View key={idx} className="bg-stone-50 rounded-[28px] p-4 flex-row items-center justify-between border border-stone-100">
                                <View className="flex-row items-center">
                                    <View className="w-10 h-10 rounded-2xl bg-white items-center justify-center mr-4 shadow-sm">
                                        <MaterialIcons name={prize.icon as any} size={20} color="#b30069" />
                                    </View>
                                    <Text className="text-base font-headline-bold text-on-surface">{prize.name}</Text>
                                </View>
                                <View className={`${prize.color} px-3 py-1 rounded-full`}>
                                    <Text className={`${prize.textColor} text-[10px] font-body-bold tracking-wider uppercase`}>{prize.status}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Game Footer Info */}
                <View className="mt-12 px-6 flex-row justify-between items-center opacity-40">
                     <Text className="text-xs font-body-bold text-on-surface">Game Code</Text>
                     <Text className="text-xs font-headline-bold text-primary tracking-widest">MB-2291</Text>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
};

export default HousieScreen;
