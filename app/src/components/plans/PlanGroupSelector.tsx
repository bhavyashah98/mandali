import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchGroups } from '../../lib/api';
import PlanAsyncSelect, { AsyncSelectItem } from './PlanAsyncSelect';

interface PlanGroupSelectorProps {
    selected: AsyncSelectItem | null;
    onSelect: (group: AsyncSelectItem | null) => void;
    isTablet: boolean;
}

const PlanGroupSelector = ({ selected, onSelect, isTablet }: PlanGroupSelectorProps) => {
    const [search, setSearch] = useState('');

    const { data: groups = [], isLoading, isFetching } = useQuery({
        queryKey: ['groups'],
        queryFn: fetchGroups,
    });

    const items: AsyncSelectItem[] = useMemo(() => {
        const term = search.trim().toLowerCase();
        const mapped = (groups as any[]).map((g) => ({ id: g.id, name: g.name }));
        if (!term) return mapped;
        return mapped.filter((g) => g.name.toLowerCase().includes(term));
    }, [groups, search]);

    return (
        <PlanAsyncSelect
            label="Choose Mandali"
            icon="groups"
            placeholder="Select Mandali"
            searchPlaceholder="Search Mandalis..."
            items={items}
            selected={selected}
            onSelect={onSelect}
            search={search}
            onSearchChange={setSearch}
            isLoading={isLoading}
            isFetching={isFetching}
            isTablet={isTablet}
        />
    );
};

export default PlanGroupSelector;
