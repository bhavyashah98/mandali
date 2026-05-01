import React, { memo } from 'react';
import { View, Text } from 'react-native';

interface LobbyHeaderCardProps {
    groupName: string;
    isTablet: boolean;
}

const LobbyHeaderCard = ({ groupName, isTablet }: LobbyHeaderCardProps) => {
    return (
        <View className="items-center w-full">
            <Text className={`text-[#b30069] font-body-bold tracking-[2px] mb-4 uppercase ${isTablet ? 'text-lg' : 'text-xs'}`}>
                {groupName}
            </Text>

            <Text
                className={`text-[#31302d] font-headline-bold text-center mb-6 ${isTablet ? 'text-[64px] leading-[72px]' : 'text-[42px] leading-[48px]'}`}
            >
                {"Housie\nGathering"}
            </Text>

            <Text className={`text-stone-400 text-center font-body-medium leading-6 mb-12 ${isTablet ? 'text-2xl px-10' : 'text-lg'}`}>
                Grab your tickets and get ready for a night of numbers, laughter, and high-reward excitement.
            </Text>
        </View>
    );
};

export default memo(LobbyHeaderCard);
