import React from 'react';
import { View } from 'react-native';
import { livePlanActions } from '../../../hooks/plans/usePlanDetails';
import LiveActionRow from './LiveActionRow';

const cardStyle = {
    shadowColor: '#d1007a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
};

interface LivePlanActionsCardProps {
    onActionPress: (actionId: string) => void;
}

const LivePlanActionsCard = ({ onActionPress }: LivePlanActionsCardProps) => (
    <View className="mx-6 mt-6 rounded-[20px] border border-[#f7cfe3] bg-[#fff4fa] px-5 py-1" style={cardStyle}>
        {livePlanActions.map((action, index) => (
            <LiveActionRow
                key={action.id}
                title={action.title}
                subtitle={action.subtitle}
                icon={action.icon}
                isLast={index === livePlanActions.length - 1}
                onPress={() => onActionPress(action.id)}
            />
        ))}
    </View>
);

export default LivePlanActionsCard;
