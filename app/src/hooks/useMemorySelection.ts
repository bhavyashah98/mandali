import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteMemory } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

export const useMemorySelection = (groupId: string, onDeletionSuccess?: () => void) => {
    const { user: currentUser } = useAuthStore();
    const queryClient = useQueryClient();
    
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const isSelectionMode = selectedIds.size > 0;

    const toggleSelection = useCallback((memoryId: string, ownerId: string) => {
        if (ownerId !== currentUser?.id) {
            Alert.alert('Unable to Select', 'You can only select and delete photos uploaded by you.');
            return;
        }

        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(memoryId)) {
                next.delete(memoryId);
            } else {
                next.add(memoryId);
            }
            return next;
        });
    }, [currentUser]);

    const clearSelection = useCallback(() => {
        setSelectedIds(new Set());
    }, []);

    const deleteMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            // Delete all selected memories concurrently
            await Promise.all(ids.map(id => deleteMemory(id)));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['memories', groupId] });
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            clearSelection();
            if (onDeletionSuccess) {
                onDeletionSuccess();
            }
            Alert.alert('Success', 'Selected memories deleted successfully.');
        },
        onError: (err: any) => {
            Alert.alert('Error', err?.response?.data?.error || 'Failed to delete some memories.');
        }
    });

    const handleDelete = useCallback(() => {
        if (selectedIds.size === 0) return;

        Alert.alert(
            'Delete Memories',
            `Are you sure you want to delete the ${selectedIds.size} selected ${selectedIds.size === 1 ? 'memory' : 'memories'}? This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        deleteMutation.mutate(Array.from(selectedIds));
                    }
                }
            ]
        );
    }, [selectedIds, deleteMutation]);

    return {
        selectedIds,
        isSelectionMode,
        toggleSelection,
        clearSelection,
        handleDelete,
        isDeleting: deleteMutation.isPending,
    };
};
