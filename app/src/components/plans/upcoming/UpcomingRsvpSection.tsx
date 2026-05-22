import React from 'react';
import { View, Text, TextInput } from 'react-native';
import RsvpOptionCard from './RsvpOptionCard';
import { upcomingRsvpOptions, UpcomingRsvp } from './useUpcomingRsvp';

interface UpcomingRsvpSectionProps {
    rsvp: UpcomingRsvp;
    setRsvp: (value: UpcomingRsvp) => void;
    note: string;
    setNote: (value: string) => void;
    locked?: boolean;
    lockedStatus?: UpcomingRsvp;
}

const UpcomingRsvpSection = ({ rsvp, setRsvp, note, setNote, locked, lockedStatus }: UpcomingRsvpSectionProps) => {
    const displayRsvp = locked && lockedStatus ? lockedStatus : rsvp;

    return (
        <View className="px-6 mt-7">
            <Text className="font-body-bold text-[#1c1c18] mb-3">Your RSVP</Text>
            {locked ? (
                <Text className="font-body-medium text-stone-400 mb-3 text-sm">
                    You&apos;ve already responded to this plan.
                </Text>
            ) : null}
            {upcomingRsvpOptions.map((option) => (
                <RsvpOptionCard
                    key={option.key}
                    option={option}
                    selected={displayRsvp === option.key}
                    onPress={() => setRsvp(option.key)}
                    disabled={locked}
                />
            ))}
            <Text className="font-body-bold text-[#1c1c18] mt-3 mb-3">Add a Note (Optional)</Text>
            <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Anything to add?"
                placeholderTextColor="#c7c2bd"
                multiline
                editable={!locked}
                className="bg-white border border-stone-100 rounded-[18px] px-4 py-4 font-body-medium text-[#1c1c18]"
                style={{ minHeight: 82, textAlignVertical: 'top', opacity: locked ? 0.7 : 1 }}
            />
        </View>
    );
};

export default UpcomingRsvpSection;
