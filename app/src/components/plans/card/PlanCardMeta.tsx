import React from 'react';
import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { formatPlanDateTime } from './planCardFormat';

interface PlanCardMetaProps {
    startsAt: string;
    location?: string | null;
    locationDetail?: string | null;
    isTablet: boolean;
}

const PlanCardMeta = ({ startsAt, location, locationDetail, isTablet }: PlanCardMetaProps) => (
    <View>
        <View className="flex-row items-center mt-1">
            <MaterialIcons name="calendar-today" size={12} color="#a8a29e" />
            <Text className="font-body-medium text-[#594048] ml-1.5" style={{ fontSize: isTablet ? 15 : 12 }}>
                {formatPlanDateTime(startsAt)}
            </Text>
        </View>
        {!!location && (
            <View className="flex-row items-center mt-1">
                <MaterialIcons name="place" size={13} color="#a8a29e" />
                <Text
                    className="font-body-medium text-[#594048] ml-1.5 flex-1"
                    style={{ fontSize: isTablet ? 15 : 12 }}
                    numberOfLines={1}
                >
                    {location}
                    {locationDetail ? `, ${locationDetail}` : ''}
                </Text>
            </View>
        )}
    </View>
);

export default PlanCardMeta;
