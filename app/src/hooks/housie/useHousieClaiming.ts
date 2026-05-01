import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../useSocket';
import { canClaimPrize, registerSessionClaim } from '../../utils/housieValidator';

interface ClaimingProps {
    gameCode: string;
    userId?: string;
    game: any;
    markedTickets: Record<string, number[]>;
}

export const useHousieClaiming = ({ gameCode, userId, game, markedTickets }: ClaimingProps) => {
    const socket = useSocket();
    const [prizesModalVisible, setPrizesModalVisible] = useState(false);
    const [claimingTicketId, setClaimingTicketId] = useState<string | null>(null);
    const [claimConfirmVisible, setClaimConfirmVisible] = useState(false);
    const [pendingClaimPrizeId, setPendingClaimPrizeId] = useState<string | null>(null);
    const [claimCountdown, setClaimCountdown] = useState(10);
    const [deniedClaims, setDeniedClaims] = useState<Record<string, string[]>>({});
    const [isClaimLoading, setIsClaimLoading] = useState(false);

    const claimCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const openPrizesModal = useCallback((ticketId: string) => {
        setClaimingTicketId(ticketId);
        setClaimCountdown(10);
        setPrizesModalVisible(true);
        if (socket) socket.emit('claiming_open', { gameCode, userId });
    }, [gameCode, userId, socket]);

    const closePrizesModal = useCallback(() => {
        setPrizesModalVisible(false);
        setClaimConfirmVisible(false);
        setPendingClaimPrizeId(null);
        if (socket) socket.emit('claiming_closed', { gameCode, userId });
        if (claimCountdownRef.current) clearInterval(claimCountdownRef.current);
    }, [gameCode, userId, socket]);

    const openClaimConfirm = useCallback((prizeId: string) => {
        setPendingClaimPrizeId(prizeId);
        setClaimCountdown(10);
        setClaimConfirmVisible(true);
    }, []);

    const closeClaimConfirm = useCallback(() => {
        setClaimConfirmVisible(false);
        setPendingClaimPrizeId(null);
    }, []);

    const handleClaimPrize = useCallback((prizeId: string) => {
        if (!socket || !gameCode || !claimingTicketId) return;

        const currentNum = game?.called_numbers?.[game.called_numbers.length - 1] || 0;
        const currentNumIndex = game?.called_numbers?.length || 0;

        const dbDeniedList = game?.winners?.['__denied']?.[claimingTicketId] || [];
        const combinedDenied = {
            [claimingTicketId]: [...(deniedClaims[claimingTicketId] || []), ...dbDeniedList]
        };

        const { canClaim } = canClaimPrize(
            claimingTicketId,
            prizeId,
            currentNum,
            currentNumIndex,
            combinedDenied
        );

        if (!canClaim) return;

        registerSessionClaim({
            ticketId: claimingTicketId,
            prizeId,
            claimedOnNumber: currentNum,
            claimedOnIndex: currentNumIndex
        });

        socket.emit('claim_prize', {
            gameCode,
            prizeId,
            userId,
            ticketId: claimingTicketId,
            markedNumbers: markedTickets[claimingTicketId] || []
        });

        closePrizesModal();
    }, [socket, gameCode, claimingTicketId, game, deniedClaims, markedTickets, closePrizesModal, userId]);

    // Timer logic
    useEffect(() => {
        if (!prizesModalVisible) {
            if (claimCountdownRef.current) clearInterval(claimCountdownRef.current);
            return;
        }

        // Timer runs continuously as long as prizesModalVisible is true
        claimCountdownRef.current = setInterval(() => {
            setClaimCountdown(prev => {
                if (prev <= 1) {
                    closePrizesModal();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => { if (claimCountdownRef.current) clearInterval(claimCountdownRef.current); };
    }, [prizesModalVisible, closePrizesModal]);

    return {
        prizesModalVisible,
        claimingTicketId,
        claimConfirmVisible,
        pendingClaimPrizeId,
        claimCountdown,
        deniedClaims,
        setDeniedClaims,
        isClaimLoading,
        setIsClaimLoading,
        openPrizesModal,
        closePrizesModal,
        openClaimConfirm,
        closeClaimConfirm,
        handleClaimPrize
    };
};
