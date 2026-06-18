import React from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { PlanRsvpUser } from '../../../types/plans';

interface Props {
    visible: boolean;
    going: PlanRsvpUser[];
    goingCount: number;
    totalMembers: number;
    keyWaitingName?: string | null;
    onClose: () => void;
}

const statusLine = (person: PlanRsvpUser) => {
    if (person.status === 'going') return person.note || 'Confirmed for this plan';
    if (person.status === 'maybe') return person.note || 'Still deciding';
    return person.note || 'Not coming this time';
};

export default function RsvpSocialModal({ visible, going, goingCount, totalMembers, keyWaitingName, onClose }: Props) {
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View className="flex-1 justify-center bg-black/45 px-5">
                <View className="max-h-[78%] rounded-[30px] bg-white p-5">
                    <View className="mb-4 flex-row items-center justify-between">
                        <View>
                            <Text className="font-headline-bold text-xl text-[#1c1c18]">{goingCount} people are in</Text>
                            <Text className="mt-1 font-body-medium text-xs text-[#8a7a80]">{goingCount} of {totalMembers} have said yes</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} className="h-10 w-10 items-center justify-center rounded-full bg-[#fff0f7]">
                            <MaterialIcons name="close" size={20} color="#b30069" />
                        </TouchableOpacity>
                    </View>
                    {!!keyWaitingName && (
                        <View className="mb-4 rounded-2xl bg-[#fff8fb] px-4 py-3">
                            <Text className="font-body-bold text-sm text-[#b30069]">Waiting for {keyWaitingName}...</Text>
                        </View>
                    )}
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {going.map((person, index) => (
                            <View key={person.userId} className="mb-3 flex-row items-center rounded-2xl bg-[#fdf9f3] px-4 py-3">
                                <View className="mr-3 h-11 w-11 items-center justify-center rounded-2xl bg-[#b30069]/10">
                                    <Text className="font-headline-bold text-lg text-[#b30069]">{person.name.charAt(0).toUpperCase()}</Text>
                                </View>
                                <View className="flex-1">
                                    <Text className="font-body-bold text-sm text-[#1c1c18]">{person.name}</Text>
                                    <Text className="mt-0.5 font-body-medium text-xs text-[#8a7a80]">{statusLine(person)}</Text>
                                </View>
                                {index >= 3 && (
                                    <View className="rounded-full bg-[#fff0f7] px-3 py-1">
                                        <Text className="font-body-bold text-[10px] text-[#b30069]">fashionably late</Text>
                                    </View>
                                )}
                            </View>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}
