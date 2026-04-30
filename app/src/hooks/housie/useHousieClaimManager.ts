import React, { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '../useSocket';
import { fetchTicketById } from '../../lib/api';

export const useHousieClaimManager = (gameCode: string, game: any) => {
    const queryClient = useQueryClient();
    const socket = useSocket();
    const [claimsQueue, setClaimsQueue] = useState<any[]>([]);
    const initialHydrationRef = useRef(false);
    const [activeNotification, setActiveNotification] = useState<{
        type: 'win' | 'boggy';
        playerName: string;
        avatarUrl?: string;
        prizeName: string;
    } | null>(null);

    // Initial hydration of pending claims
    useEffect(() => {
        if (!game?.winners?.['__pending'] || initialHydrationRef.current) return;
        
        const pending: any[] = game.winners['__pending'];
        if (pending.length === 0) return;

        initialHydrationRef.current = true;

        Promise.all(
            pending.map(async (claim: any) => {
                try {
                    const ticket = await fetchTicketById(claim.ticketId);
                    return { ...claim, ticket };
                } catch {
                    return null;
                }
            })
        ).then(resolved => {
            const valid = resolved.filter(Boolean);
            if (valid.length > 0) {
                setClaimsQueue(prev => [...valid, ...prev]);
            }
        });
    }, [!!game]);

    // Socket listeners for claims
    useEffect(() => {
        if (!gameCode || !socket) return;
        socket.emit('join_game', gameCode);

        const onNewClaim = async (data: any) => {
            const ticket = await fetchTicketById(data.ticketId);
            if (ticket) {
                setClaimsQueue(current => {
                    const exists = current.some(c => c.ticketId === data.ticketId && c.prizeId === data.prizeId);
                    if (exists) return current;
                    return [...current, { ...data, ticket }];
                });
            }
        };

        const onClaimResult = (data: any) => {
            const { status, playerName, avatarUrl, prizeName } = data;
            queryClient.invalidateQueries({ queryKey: ['housieGame', gameCode] });

            if (status === 'accepted') {
                setActiveNotification({ type: 'win', playerName, avatarUrl, prizeName });
            } else if (status === 'denied' && data.message !== 'Prize already claimed') {
                setActiveNotification({ type: 'boggy', playerName, avatarUrl, prizeName });
            }
        };

        socket.on('new_claim', onNewClaim);
        socket.on('claim_result', onClaimResult);

        return () => {
            socket.off('new_claim', onNewClaim);
            socket.off('claim_result', onClaimResult);
        };
    }, [gameCode, queryClient]);

    const verifyClaim = (status: 'accepted' | 'denied') => {
        const activeClaim = claimsQueue[0];
        if (!activeClaim || !socket) return;
        socket.emit('verify_claim', {
            gameCode,
            prizeId: activeClaim.prizeId,
            userId: activeClaim.userId,
            ticketId: activeClaim.ticketId,
            claimedOnIndex: activeClaim.claimedOnIndex,
            status
        });

        setClaimsQueue(prev => prev.slice(1));
    };

    return {
        claimsQueue,
        activeClaim: claimsQueue[0] || null,
        pendingCount: claimsQueue.length,
        verifyClaim,
        activeNotification,
        clearNotification: () => setActiveNotification(null)
    };
};
