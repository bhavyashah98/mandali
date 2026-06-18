import React from 'react';
import { Text, View } from 'react-native';

interface Props {
    icon: string;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
}

export default function HypeCard({ icon, title, subtitle, children }: Props) {
    return (
        <View className="mb-5 rounded-[24px] border border-[#f1dbe7] bg-white p-5">
            <View className="mb-4 flex-row items-center">
                <View className="mr-3 h-11 w-11 items-center justify-center rounded-2xl bg-[#fff0f7]">
                    <Text className="text-xl">{icon}</Text>
                </View>
                <View className="flex-1">
                    <Text className="font-headline-bold text-lg text-[#1c1c18]">{title}</Text>
                    {!!subtitle && <Text className="mt-0.5 font-body-medium text-xs text-[#8a7a80]">{subtitle}</Text>}
                </View>
            </View>
            {children}
        </View>
    );
}
