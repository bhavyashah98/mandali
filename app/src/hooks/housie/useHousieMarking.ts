import { useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '../useSocket';

export const useHousieMarking = (tickets: any[], gameCode: string) => {
    const socket = useSocket();
    const queryClient = useQueryClient();

    // Derived marked tickets directly from server data (which is kept updated via optimistic updates)
    const markedTickets = useMemo(() => {
        const result: Record<string, number[]> = {};
        if (!tickets) return result;

        tickets.forEach((t: any) => {
            result[t.id] = t.marked_numbers || [];
        });
        return result;
    }, [tickets]);

    const toggleMark = useCallback((ticketId: string, num: number, isGameEnded: boolean) => {
        if (isGameEnded || !gameCode) return;

        // Optimistically update the cache
        queryClient.setQueryData(['housieTickets', gameCode], (old: any) => {
            if (!old || !old.tickets) return old;
            
            return {
                ...old,
                tickets: old.tickets.map((t: any) => {
                    if (t.id === ticketId) {
                        const currentMarks = t.marked_numbers || [];
                        const newMarks = currentMarks.includes(num)
                            ? currentMarks.filter((n: number) => n !== num)
                            : [...currentMarks, num];
                        
                        // Emit sync to server
                        if (socket) {
                            socket.emit('sync_marks', {
                                ticketId,
                                markedNumbers: newMarks
                            });
                        }
                        
                        return { ...t, marked_numbers: newMarks };
                    }
                    return t;
                })
            };
        });
    }, [gameCode, socket, queryClient]);

    return {
        markedTickets,
        toggleMark
    };
};
