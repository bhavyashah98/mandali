import React from 'react';
import { View, Text } from 'react-native';

interface BlinkFinishedPanelProps {
    myPrize: {
        rank: number;
        prizeName: string;
        prizeAmount: number;
    } | null;
}

export const BlinkFinishedPanel = ({ myPrize }: BlinkFinishedPanelProps) => {
    return (
        <View className="flex-1 items-center justify-center px-6">
            <View 
                className="bg-white rounded-[32px] border border-stone-100 p-6 items-center justify-center w-full"
                style={{ elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }}
            >
                <View className="bg-[#b30069]/10 rounded-full flex-row items-center border border-[#b30069]/20 px-3 py-1 mb-4">
                    <View className="rounded-full bg-[#b30069] w-2 h-2 mr-2 animate-pulse" />
                    <Text className="text-[#b30069] font-body-bold uppercase tracking-widest text-[9px]">Finished</Text>
                </View>
                
                <Text className="text-[#594048] font-headline-bold text-center text-lg mb-2">
                    All Cards Matched! 🎉
                </Text>

                {myPrize ? (
                    <View className="bg-[#fdf9f3] border border-stone-100 rounded-2xl px-4 py-3 items-center mb-3 w-full">
                        <Text className="text-stone-400 font-body-bold text-[9px] uppercase tracking-widest mb-1">Your Reward</Text>
                        <Text className="text-[#b30069] font-headline-bold text-base text-center">
                            Rank #{myPrize.rank}: {myPrize.prizeName}
                        </Text>
                        {myPrize.prizeAmount > 0 && (
                            <Text className="text-stone-500 font-body-bold text-xs mt-1">
                                +{myPrize.prizeAmount} Mandali Coins
                            </Text>
                        )}
                    </View>
                ) : (
                    <View className="bg-[#fdf9f3] border border-stone-100 rounded-2xl px-4 py-3 items-center mb-3 w-full">
                        <Text className="text-[#594048] font-body-bold text-xs text-center">
                            Waiting for remaining players to finish...
                        </Text>
                    </View>
                )}

                <Text className="text-stone-400 font-body-medium text-center text-xs px-2 leading-5">
                    You have successfully finished all your cards! You are now in spectator mode. Watch the remaining players above race to complete their boards!
                </Text>
            </View>
        </View>
    );
};
