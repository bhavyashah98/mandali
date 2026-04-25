import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { Ticket } from './Ticket';

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

                        <Ticket
                            ticketData={verifyingTicket?.ticket_data || []}
                            markedNumbers={activeClaim?.markedNumbers || []}
                            calledNumbers={calledNumbers}
                            showVerificationColors={true}
                            isTablet={isTablet}
                            containerStyle={{ width: isTablet ? '80%' : '100%', alignSelf: 'center', marginBottom: 40 }}
                        />

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
