import React from 'react';
import { View } from 'react-native';
import PlanLocationPicker, { PlanLocationValue } from '../PlanLocationPicker';

interface CreateLocationSectionProps {
    location: PlanLocationValue;
    onChange: (location: PlanLocationValue) => void;
    isTablet: boolean;
}

const CreateLocationSection = ({ location, onChange, isTablet }: CreateLocationSectionProps) => (
    <View className="mb-5">
        <PlanLocationPicker value={location} onChange={onChange} isTablet={isTablet} />
    </View>
);

export default CreateLocationSection;
