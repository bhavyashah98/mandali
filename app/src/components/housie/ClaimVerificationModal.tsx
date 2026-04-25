import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

interface ClaimVerificationModalProps {
    visible: boolean;
    activeClaim: any;
    verifyingTicket: any;
    pendingCount: number;
    calledNumbers: number[];
    onResolve: (status: 'accepted' | 'denied') => void;
    renderBoard: () => React.ReactNode;
    isTablet: boolean;
    prizeName: string;
}

export const ClaimVerificationModal: React.FC<ClaimVerificationModalProps> = ({
    visible,
    activeClaim,
    verifyingTicket,
    pendingCount,
    calledNumbers,
    onResolve,
    renderBoard,
    isTablet,
    prizeName
}) => {
    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View className={`flex-1 justify-center bg-[#594048]/90 ${isTablet ? 'px-20 py-20' : 'px-4 py-16'}`}>
                <View className={`bg-[#FDF9F3] rounded-[40px] shadow-2xl border border-white/20 max-h-[100%] ${isTablet ? 'p-12' : 'p-6'}`}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View className="items-center mb-10">
                            <View className={`${isTablet ? 'w-24 h-24 mb-6' : 'w-16 h-16 mb-4'} rounded-full bg-white items-center justify-center shadow-sm`}>
                                <FontAwesome5 name="trophy" size={isTablet ? 40 : 24} color="#b30069" />
                            </View>
                            <Text className={`text-stone-400 font-body-bold uppercase tracking-widest mb-2 ${isTablet ? 'text-xl' : 'text-[10px]'}`}>Claim Verification</Text>
                            {pendingCount > 1 && (
                                <View className={`bg-orange-100 rounded-full mb-4 ${isTablet ? 'px-6 py-2' : 'px-3 py-1'}`}>
                                    <Text className={`text-orange-700 font-body-bold ${isTablet ? 'text-lg' : 'text-xs'}`}>{pendingCount - 1} more claim{pendingCount - 1 > 1 ? 's' : ''} waiting</Text>
                                </View>
                            )}
                            <Text className={`font-headline-bold text-[#594048] text-center ${isTablet ? 'text-5xl' : 'text-2xl'}`}>{verifyingTicket?.user?.name}</Text>
                            <Text className={`text-[#b30069] font-body-bold text-center mt-2 ${isTablet ? 'text-2xl' : 'text-sm'}`}>
                                {prizeName} • Ticket #{activeClaim?.ticketId?.slice(-4).toUpperCase()}
                            </Text>
                        </View>

                        <View style={{ width: isTablet ? '80%' : '100%', alignSelf: 'center' }} className="bg-white rounded-[32px] p-4 shadow-lg shadow-black/5 border border-black/5 mb-10">
                            {verifyingTicket?.ticket_data?.map((row: any[], ridx: number) => (
                                <View key={ridx} className="flex-row">
                                    {row.map((num, cidx) => {
                                        const isMarked = num && activeClaim?.markedNumbers?.includes(num);
                                        const isCalled = num && calledNumbers.includes(num);
                                        let cellBg = 'bg-stone-50';
                                        let borderColor = 'border-stone-100';
                                        let textColor = 'text-[#594048]';

                                        if (num && isMarked) {
                                            if (isCalled) {
                                                cellBg = 'bg-[#b30069]';
                                                borderColor = 'border-[#b30069]';
                                                textColor = 'text-white';
                                            } else {
                                                cellBg = 'bg-red-500';
                                                borderColor = 'border-red-500';
                                                textColor = 'text-white';
                                            }
                                        }

                                        return (
                                            <View key={cidx} className="flex-1 aspect-square p-1">
                                                {num ? (
                                                    <View className={`w-full h-full rounded-xl items-center justify-center border ${cellBg} ${borderColor}`}>
                                                        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.3} className={`font-headline-bold text-center ${isTablet ? 'text-2xl' : 'text-[10px]'} ${textColor}`}>
                                                            {num}
                                                        </Text>
                                                    </View>
                                                ) : (
                                                    <View className="w-full h-full rounded-xl bg-stone-50/10" />
                                                )}
                                            </View>
                                        );
                                    })}
                                </View>
                            ))}
                        </View>

                        <View className="mb-4">
                            <Text className={`text-center text-stone-400 font-body-bold uppercase tracking-[3px] mb-4 ${isTablet ? 'text-xl' : 'text-[10px]'}`}>Master Board Reference</Text>
                            <View style={{ width: isTablet ? '90%' : '100%', alignSelf: 'center' }} className="items-center bg-white p-2 rounded-[24px] shadow-sm border border-stone-100">
                                {renderBoard()}
                            </View>
                        </View>

                        <View className={`flex-row gap-6 mb-4 ${isTablet ? 'px-12' : ''}`}>
                            <TouchableOpacity onPress={() => onResolve('denied')} className={`flex-1 rounded-[32px] bg-white border border-stone-200 items-center justify-center ${isTablet ? 'h-28' : 'h-14'}`}>
                                <Text className={`text-stone-400 font-headline-bold ${isTablet ? 'text-4xl' : 'text-lg'}`}>Deny</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => onResolve('accepted')} className={`flex-[1.5] rounded-[32px] bg-[#b30069] items-center justify-center shadow-lg shadow-[#b30069]/30 ${isTablet ? 'h-28' : 'h-14'}`}>
                                <Text className={`text-white font-headline-bold ${isTablet ? 'text-4xl' : 'text-lg'}`}>Approve Reward</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};
