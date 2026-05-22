import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { PlanActivity } from '../../types/plans';
import { getActivityIcon, PLAN_ACTIVITY_SUGGESTIONS } from '../../constants/planActivityIcons';
import { usePlanActivities } from '../../hooks/plans/usePlanActivities';
import PlanAsyncSelect, { AsyncSelectItem } from './PlanAsyncSelect';

export type SelectedPlanActivity = PlanActivity;

const SUGGESTION_PREFIX = 'suggestion:';

interface PlanActivitySelectorProps {
    groupId: string | null;
    selected: SelectedPlanActivity | null;
    onSelect: (activity: SelectedPlanActivity | null) => void;
    isTablet: boolean;
}

const PlanActivitySelector = ({ groupId, selected, onSelect, isTablet }: PlanActivitySelectorProps) => {
    const [search, setSearch] = useState('');
    const [customName, setCustomName] = useState('');
    const [showCustomInput, setShowCustomInput] = useState(false);

    const { activities, isLoading, isFetching, createActivity, isCreating } = usePlanActivities(
        groupId,
        groupId ? search : ''
    );

    const savedItems: AsyncSelectItem[] = activities.map((a) => ({
        id: a.id,
        name: a.name,
        icon: getActivityIcon(a.name),
    }));

    const suggestionItems: AsyncSelectItem[] = useMemo(() => {
        if (!groupId || search.trim()) return [];
        const existing = new Set(activities.map((a) => a.name.trim().toLowerCase()));
        return PLAN_ACTIVITY_SUGGESTIONS.filter((name) => !existing.has(name.toLowerCase())).map((name) => ({
            id: `${SUGGESTION_PREFIX}${name}`,
            name,
            icon: getActivityIcon(name),
        }));
    }, [groupId, search, activities]);

    const items: AsyncSelectItem[] = useMemo(
        () => [...savedItems, ...suggestionItems],
        [savedItems, suggestionItems]
    );

    const selectedItem: AsyncSelectItem | null = selected
        ? { id: selected.id, name: selected.name, icon: getActivityIcon(selected.name) }
        : null;

    const handleAddByName = async (name: string) => {
        if (!groupId) return;
        try {
            const { activity } = await createActivity({ name });
            onSelect(activity);
            setCustomName('');
            setShowCustomInput(false);
            setSearch('');
        } catch {
            // parent may show alert
        }
    };

    const handleAddCustom = async () => {
        const trimmed = customName.trim();
        if (!trimmed) return;
        await handleAddByName(trimmed);
    };

    const handleSelect = async (item: AsyncSelectItem | null) => {
        if (!item) {
            onSelect(null);
            return;
        }
        if (item.id.startsWith(SUGGESTION_PREFIX)) {
            await handleAddByName(item.name);
            return;
        }
        onSelect({ id: item.id, name: item.name });
    };

    const dropdownFooter = groupId ? (
        <View>
            {!showCustomInput ? (
                <TouchableOpacity
                    onPress={() => setShowCustomInput(true)}
                    className="flex-row items-center py-2"
                >
                    <MaterialIcons name="add-circle-outline" size={22} color="#b30069" />
                    <Text className="font-body-bold text-[#b30069] ml-2 text-base">Custom activity</Text>
                </TouchableOpacity>
            ) : (
                <View>
                    <TextInput
                        value={customName}
                        onChangeText={setCustomName}
                        placeholder="Enter activity name"
                        placeholderTextColor="#d6d3d1"
                        className="font-body-medium text-[#1c1c18] bg-stone-50 rounded-2xl px-4 py-3 mb-2"
                        autoFocus={Platform.OS === 'ios'}
                        style={
                            Platform.OS === 'android'
                                ? { includeFontPadding: false, textAlignVertical: 'center' }
                                : undefined
                        }
                    />
                    <View className="flex-row gap-2">
                        <TouchableOpacity
                            onPress={() => {
                                setShowCustomInput(false);
                                setCustomName('');
                            }}
                            className="flex-1 py-3 rounded-2xl bg-stone-100 items-center"
                        >
                            <Text className="font-body-bold text-stone-500">Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleAddCustom}
                            disabled={!customName.trim() || isCreating}
                            className="flex-1 py-3 rounded-2xl bg-[#b30069] items-center"
                            style={{ opacity: !customName.trim() || isCreating ? 0.5 : 1 }}
                        >
                            {isCreating ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text className="font-body-bold text-white">Add</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    ) : null;

    return (
        <PlanAsyncSelect
            label="Choose Activity"
            icon="event"
            placeholder="Select activity"
            searchPlaceholder="Search activities..."
            items={items}
            selected={selectedItem}
            onSelect={handleSelect}
            search={search}
            onSearchChange={setSearch}
            isLoading={isLoading}
            isFetching={isFetching}
            disabled={!groupId}
            disabledHint="Select a Mandali first"
            isTablet={isTablet}
            dropdownFooter={dropdownFooter}
            getItemIcon={(item) => getActivityIcon(item.name)}
        />
    );
};

export default PlanActivitySelector;
