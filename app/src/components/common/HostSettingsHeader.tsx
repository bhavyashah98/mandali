import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { fetchGroupDetail } from '../../lib/api';

interface HostSettingsHeaderProps {
    onBack: () => void;
    isTablet: boolean;
    groupId?: string;
}

export const HostSettingsHeader = ({ onBack, isTablet, groupId }: HostSettingsHeaderProps) => {
    const { data: groupData } = useQuery({
        queryKey: ['group', groupId],
        queryFn: () => fetchGroupDetail(groupId!),
        enabled: !!groupId,
    });

    const groupName = groupData?.group?.name;

    return (
        <View className="flex-row items-center px-6 py-4 border-b border-stone-100">
            <TouchableOpacity
                onPress={onBack}
                className="w-10 h-10 items-center justify-center rounded-full bg-white border border-stone-100"
                style={{ elevation: 2 }}
            >
                <MaterialIcons name="arrow-back-ios" size={20} color="#b30069" style={{ marginLeft: 5 }} />
            </TouchableOpacity>
            <View className="flex-1 items-center" style={{ marginRight: 40 }}>
                {groupName ? (
                    <Text className="font-body-bold text-stone-400 text-[10px] uppercase tracking-wider mb-0.5" numberOfLines={1}>
                        {groupName}
                    </Text>
                ) : null}
                <Text className="font-headline-bold text-[#1c1c18]" style={{ fontSize: isTablet ? 32 : 22 }}>
                    New Room
                </Text>
            </View>
        </View>
    );
};
