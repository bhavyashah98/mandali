import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

interface CallingModeSectionProps {
    callingMode: 'manual' | 'auto';
    setCallingMode: (mode: 'manual' | 'auto') => void;
    autoCallSeconds: number;
    setAutoCallSeconds: React.Dispatch<React.SetStateAction<number>>;
    isTablet: boolean;
}

export const CallingModeSection: React.FC<CallingModeSectionProps> = React.memo(({
    callingMode,
    setCallingMode,
    autoCallSeconds,
    setAutoCallSeconds,
    isTablet,
}) => {
    const progressPct = Math.max(0, Math.min(100, ((autoCallSeconds - 6) / 14) * 100));
    const isManual = callingMode === 'manual';
    const isAuto = callingMode === 'auto';

    return (
        <View className="mb-6">

            {/* Section title */}
            <Text
                className="font-body-bold uppercase tracking-widest mb-3 ml-2"
                style={{ fontSize: isTablet ? 20 : 12, color: '#594048' }}
            >
                Calling Mode
            </Text>

            {/* Mode cards */}
            <View className="flex-row gap-3 mb-2">

                {/* Automatic */}
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setCallingMode('auto')}
                    className="flex-1 items-center justify-center py-4 border shadow-sm"
                    style={{
                        borderRadius: 24,
                        backgroundColor: isAuto ? '#fce7f3' : '#ffffff',
                        borderColor: isAuto ? '#b30069' : '#e7e5e4',
                        borderWidth: isAuto ? 1.5 : 1,
                    }}
                >
                    <MaterialCommunityIcons
                        name="robot-outline"
                        size={isTablet ? 44 : 30}
                        color={isAuto ? '#b30069' : '#a09d96'}
                    />
                    <Text
                        className="font-headline-bold mt-2"
                        style={{ fontSize: isTablet ? 20 : 15, color: isAuto ? '#b30069' : '#1c1c18' }}
                    >
                        Automatic
                    </Text>
                    <Text
                        className="font-body-regular text-center mt-0.5"
                        style={{ fontSize: isTablet ? 13 : 11, color: '#a09d96' }}
                    >
                        Timer picks numbers
                    </Text>
                </TouchableOpacity>

                {/* Manual */}
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setCallingMode('manual')}
                    className="flex-1 items-center justify-center py-4 border shadow-sm overflow-hidden"
                    style={{
                        borderRadius: 24,
                        backgroundColor: isManual ? '#fce7f3' : '#ffffff',
                        borderColor: isManual ? '#b30069' : '#e7e5e4',
                        borderWidth: isManual ? 1.5 : 1,
                    }}
                >
                    <View 
                        className="absolute top-2 right-2 bg-[#31302d] px-2 py-1 rounded-lg flex-row items-center"
                        style={{ elevation: 2 }}
                    >
                        <MaterialCommunityIcons name="crown" size={isTablet ? 14 : 10} color="#fbbf24" />
                        <Text className="text-[8px] font-headline-bold text-[#fbbf24] uppercase ml-1 tracking-wider">Premium</Text>
                    </View>

                    <MaterialCommunityIcons
                        name="account-voice"
                        size={isTablet ? 44 : 30}
                        color={isManual ? '#b30069' : '#a09d96'}
                    />
                    <Text
                        className="font-headline-bold mt-2"
                        style={{ fontSize: isTablet ? 20 : 15, color: isManual ? '#b30069' : '#1c1c18' }}
                    >
                        Manual
                    </Text>
                    <Text
                        className="font-body-regular text-center mt-0.5"
                        style={{ fontSize: isTablet ? 13 : 11, color: '#a09d96' }}
                    >
                        You call at your pace
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Auto timer controls */}
            {isAuto && (
                <View
                    className="border shadow-sm mt-3 px-5 py-4"
                    style={{ borderRadius: 24, backgroundColor: '#ffffff', borderColor: '#f0ece8' }}
                >
                    <View className="flex-row justify-between items-center mb-4">
                        <Text
                            className="font-body-bold"
                            style={{ fontSize: isTablet ? 18 : 14, color: '#1c1c18' }}
                        >
                            Time per number
                        </Text>
                        <View className="flex-row items-center">
                            {autoCallSeconds !== 7 && (
                                <View className="bg-[#31302d] rounded-full px-2 py-1 mr-2 flex-row items-center shadow-sm">
                                    <MaterialCommunityIcons name="crown" size={10} color="#fbbf24" />
                                    <Text className="text-[8px] font-headline-bold text-[#fbbf24] uppercase ml-1">Premium</Text>
                                </View>
                            )}
                            <View
                                className="rounded-full px-3 py-1"
                                style={{ backgroundColor: '#fce7f3' }}
                            >
                                <Text
                                    className="font-headline-bold"
                                    style={{ fontSize: isTablet ? 20 : 15, color: '#b30069' }}
                                >
                                    {autoCallSeconds}s
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View className="flex-row items-center">
                        <TouchableOpacity
                            disabled={autoCallSeconds <= 6}
                            onPress={() => setAutoCallSeconds(p => Math.max(6, p - 1))}
                            className="w-10 h-10 rounded-full items-center justify-center"
                            style={{ backgroundColor: autoCallSeconds <= 6 ? '#f5f5f4' : '#e7e5e4' }}
                        >
                            <MaterialIcons
                                name="remove"
                                size={20}
                                color={autoCallSeconds <= 6 ? '#d6d3d1' : '#594048'}
                            />
                        </TouchableOpacity>

                        <View
                            className="flex-1 mx-3 rounded-full overflow-hidden"
                            style={{ height: 6, backgroundColor: '#f0ece8' }}
                        >
                            <View
                                style={{
                                    height: 6,
                                    width: `${progressPct}%`,
                                    backgroundColor: '#b30069',
                                    borderRadius: 3,
                                }}
                            />
                        </View>

                        <TouchableOpacity
                            disabled={autoCallSeconds >= 20}
                            onPress={() => setAutoCallSeconds(p => Math.min(20, p + 1))}
                            className="w-10 h-10 rounded-full items-center justify-center"
                            style={{ backgroundColor: autoCallSeconds >= 20 ? '#f5f5f4' : '#e7e5e4' }}
                        >
                            <MaterialIcons
                                name="add"
                                size={20}
                                color={autoCallSeconds >= 20 ? '#d6d3d1' : '#594048'}
                            />
                        </TouchableOpacity>
                    </View>

                    <Text
                        className="font-body-regular text-center mt-3"
                        style={{ fontSize: 12, color: '#a09d96' }}
                    >
                        Default 7s · Min 6s · Max 20s
                    </Text>
                </View>
            )}
        </View>
    );
});
