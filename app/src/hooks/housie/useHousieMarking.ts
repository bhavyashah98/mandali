import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../useSocket';

export const useHousieMarking = (tickets: any[]) => {
    const [markedTickets, setMarkedTickets] = useState<Record<string, number[]>>({});
    const socket = useSocket();

    // Initialize marks from server data
    useEffect(() => {
        if (tickets) {
            setMarkedTickets(prev => {
                const next = { ...prev };
                tickets.forEach((t: any) => {
                    if (!(t.id in next)) {
                        next[t.id] = t.marked_numbers || [];
                    }
                });
                return next;
            });
        }
    }, [tickets]);

    const toggleMark = useCallback((ticketId: string, num: number, isGameEnded: boolean) => {
        if (isGameEnded) return;

        setMarkedTickets(prev => {
            const currentMarks = prev[ticketId] || [];
            const newMarks = currentMarks.includes(num)
                ? currentMarks.filter(n => n !== num)
                : [...currentMarks, num];
            
            const next = { ...prev, [ticketId]: newMarks };

            if (socket) {
                socket.emit('sync_marks', {
                    ticketId,
                    markedNumbers: newMarks
                });
            }

            return next;
        });
    }, [socket]);

    return {
        markedTickets,
        toggleMark
    };
};
