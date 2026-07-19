import React from 'react';
import { View } from 'react-native';
import PlanActivitySelector, { SelectedPlanActivity } from '../PlanActivitySelector';
import PlanGroupSelector from '../PlanGroupSelector';
import type { AsyncSelectItem } from '../PlanAsyncSelect';

interface CreatePlanSelectorsProps {
    selectedGroup: AsyncSelectItem | null;
    activity: SelectedPlanActivity | null;
    onGroupSelect: (group: AsyncSelectItem | null) => void;
    onActivitySelect: (activity: SelectedPlanActivity | null) => void;
    isTablet: boolean;
    lockGroup?: boolean;
}

const CreatePlanSelectors = ({
    selectedGroup,
    activity,
    onGroupSelect,
    onActivitySelect,
    isTablet,
    lockGroup,
}: CreatePlanSelectorsProps) => (
    <>
        <View className="mb-5">
            <PlanGroupSelector
                selected={selectedGroup}
                onSelect={onGroupSelect}
                isTablet={isTablet}
                disabled={lockGroup}
                disabledHint="Mandali locked for edit"
            />
        </View>
        <View className="mb-5">
            <PlanActivitySelector
                groupId={selectedGroup?.id ?? null}
                selected={activity}
                onSelect={onActivitySelect}
                isTablet={isTablet}
            />
        </View>
    </>
);

export default CreatePlanSelectors;
