import { Server, Socket } from 'socket.io';
import { supabase } from '../lib/supabase';
import { checkPrize } from '../utils/tambola';
import { pauseAutoHost, resetAutoHostTimer } from '../services/housieAutoHost';

export const registerHousieHandlers = (io: Server, socket: Socket) => {

    socket.on('join_game', (gameCode) => {
        socket.join(gameCode);
    });

    socket.on('join_group', (groupId) => {
        socket.join(`group_${groupId}`);
    });

    // Player signals they've opened the prize selection modal (host should pause calling numbers)
    socket.on('claiming_open', async ({ gameCode, userId }) => {
        try {
            const { data: game } = await supabase
                .from('housie_games')
                .select('winners')
                .eq('game_code', gameCode)
                .single();

            if (!game) return;

            const winners = game.winners || {};
            const pending = winners['__pending'] || [];

            // Add a "virtual" claim to force the auto-host to pause
            const alreadyIn = pending.some((p: any) => p.userId === userId && p.type === 'pre_claim');
            if (!alreadyIn) {
                winners['__pending'] = [...pending, { userId, type: 'pre_claim', at: new Date().toISOString() }];
                await supabase.from('housie_games').update({ winners }).eq('game_code', gameCode);
                if (pending.length === 0) {
                    await pauseAutoHost(gameCode);
                }
            }

            socket.to(gameCode).emit('player_claiming_open', { userId });
        } catch (e) {
            console.error("Error in claiming_open:", e);
        }
    });

    // Player signals they've closed/resolved the prize modal
    socket.on('claiming_closed', async ({ gameCode, userId }) => {
        try {
            const { data: game } = await supabase
                .from('housie_games')
                .select('winners')
                .eq('game_code', gameCode)
                .single();

            if (!game) return;

            const winners = game.winners || {};
            const pending = winners['__pending'] || [];

            // Remove the "virtual" claim
            const updatedPending = pending.filter((p: any) => !(p.userId === userId && p.type === 'pre_claim'));

            if (updatedPending.length !== pending.length) {
                winners['__pending'] = updatedPending;
                await supabase
                    .from('housie_games')
                    .update({
                        winners,
                        last_activity_at: new Date().toISOString()
                    })
                    .eq('game_code', gameCode);

                if (updatedPending.length === 0) {
                    await resetAutoHostTimer(gameCode);
                }
            }

            socket.to(gameCode).emit('player_claiming_closed', { userId });
        } catch (e) {
            console.error("Error in claiming_closed:", e);
        }
    });

    socket.on('claim_prize', async (data) => {
        const { gameCode, prizeId, userId, ticketId, markedNumbers } = data;

        try {
            const { data: game } = await supabase
                .from('housie_games')
                .select('id, group_id, called_numbers, winners, prizes, settings')
                .eq('game_code', gameCode)
                .single();

            if (!game) return;

            const currentCalledNumbers = game.called_numbers || [];
            const currentNumberIndex = currentCalledNumbers.length;
            const lastNumber = currentCalledNumbers[currentNumberIndex - 1];

            const claimPayload = {
                prizeId, userId, ticketId, markedNumbers,
                claimedOnNumber: lastNumber,
                claimedOnIndex: currentNumberIndex,
                claimedAt: new Date().toISOString(),
                type: 'claim'
            };

            const isAutoMode = game.settings?.callingMode === 'auto';
            const winners = game.winners || {};
            const pending = winners['__pending'] || [];

            // 1. Remove the "modal_open" virtual claim for this user if it exists
            // 2. Add the actual claim
            const updatedPending = pending.filter((p: any) => !(p.userId === userId && p.type === 'pre_claim'));
            const newPending = [...updatedPending, claimPayload];

            const { data: updatedGame } = await supabase
                .from('housie_games')
                .update({ winners: { ...winners, __pending: newPending } })
                .eq('game_code', gameCode).eq('winners', winners)
                .select()
                .single();

            if (!updatedGame) {
                console.log('[claim_prize] race condition, retry later');
                return;
            }

            io.to(gameCode).emit('new_claim', claimPayload);

            if (isAutoMode) {
                try {
                    const { data: ticket } = await supabase
                        .from('housie_tickets')
                        .select('ticket_data')
                        .eq('id', ticketId)
                        .single();

                    const isCorrect = ticket && checkPrize(prizeId, ticket.ticket_data, currentCalledNumbers, game.settings?.gameStyle);
                    const status = isCorrect ? 'accepted' : 'denied';

                    await processClaimResolution(io, gameCode, {
                        gameCode, prizeId, userId, ticketId, status,
                        claimedOnIndex: currentNumberIndex
                    });
                } catch (err) {
                    console.error("[AutoVerify] Verification failed:", err);
                }
            }
        } catch (e) {
            console.error("Claim processing error:", e);
        }
    });

    socket.on('verify_claim', async (data) => {
        await processClaimResolution(io, data.gameCode, data);
    });

    /**
     * Shared logic for resolving a claim (either via manual host action or auto-host)
     */
    async function processClaimResolution(io: Server, gameCode: string, data: any) {
        const { prizeId, userId, ticketId, status, claimedOnIndex } = data;

        try {
            const now = new Date().toISOString();

            // 1) Fetch current game snapshot
            const { data: game } = await supabase
                .from('housie_games')
                .select('id, group_id, winners, called_numbers, prizes')
                .eq('game_code', gameCode)
                .single();

            if (!game) return;

            const prevWinners = game.winners || {};
            const winners = { ...prevWinners }; // work on a copy

            const currentCalledCount = game.called_numbers?.length || 0;
            const prizesData = game.prizes || [];
            const prize = prizesData.find((p: any) => p.id === prizeId);
            const prizeTotalAmount = prize ? (prize.amount || 0) : 0;

            const existingWinners: any[] = Array.isArray(winners[prizeId])
                ? winners[prizeId]
                : (winners[prizeId] ? [winners[prizeId]] : []);

            const effectiveIndex = claimedOnIndex || currentCalledCount;

            // 2) Decide outcome
            if (status === 'accepted') {
                // (a) Prevent duplicate accept for same ticket+prize
                const alreadyAccepted = existingWinners.some(
                    (w: any) => w.ticketId === ticketId
                );
                if (alreadyAccepted) {
                    await finalizeAndBroadcast('denied', 'Duplicate claim for same ticket');
                    return;
                }

                // (b) Enforce earliest index rule
                if (existingWinners.length > 0) {
                    const firstWinnerIndex = existingWinners[0].claimedOnIndex;
                    if (firstWinnerIndex < effectiveIndex) {
                        await finalizeAndBroadcast('denied', 'Prize already claimed earlier');
                        return;
                    }
                }

                // (c) Accept and append
                const newWinner = {
                    userId,
                    ticketId,
                    claimedAt: now,
                    claimedOnIndex: effectiveIndex
                };

                const updatedWinnersList = [...existingWinners, newWinner];
                winners[prizeId] = updatedWinnersList;

                // (d) Split prize (same-index winners share)
                const splitAmount = Math.floor(prizeTotalAmount / updatedWinnersList.length);

                // Upsert results for all winners (idempotent)
                await Promise.all(updatedWinnersList.map((winEntry) =>
                    supabase.from('game_results').upsert({
                        game_id: game.id,
                        group_id: game.group_id,
                        user_id: winEntry.userId,
                        prize_name: prize ? prize.name : prizeId,
                        prize_amount: splitAmount
                    }, {
                        onConflict: 'game_id,user_id,prize_name'
                    })
                ));

            } else {
                // denied path
                const deniedMap = winners['__denied'] || {};
                const ticketDeniedInfo = deniedMap[ticketId] || [];
                if (!ticketDeniedInfo.includes(prizeId)) {
                    ticketDeniedInfo.push(prizeId);
                }
                deniedMap[ticketId] = ticketDeniedInfo;
                winners['__denied'] = deniedMap;
            }

            // 3) Remove this claim from pending (precise match)
            const prevPending = winners['__pending'] || [];
            const updatedPending = prevPending.filter(
                (c: any) => !(c.ticketId === ticketId && c.prizeId === prizeId)
            );
            winners['__pending'] = updatedPending;

            // 4) ATOMIC update (prevents overwrites)
            const { data: updatedGame } = await supabase
                .from('housie_games')
                .update({
                    winners,
                    last_activity_at: now
                })
                .eq('game_code', gameCode)
                .eq('winners', prevWinners) // 🔥 atomic guard
                .select()
                .single();

            if (!updatedGame) {
                console.log('[processClaimResolution] race detected, skipping write');
                return;
            }

            // 5) Resume ONLY when no pending remains
            if (updatedPending.length === 0) {
                await resetAutoHostTimer(gameCode);
            }

            // 6) Broadcast result
            await broadcastResult(status);

        } catch (err) {
            console.error("Error resolving claim:", err);
        }

        // ---- helpers ----

        async function finalizeAndBroadcast(finalStatus: string, message?: string) {
            const now = new Date().toISOString();

            const { data: game } = await supabase
                .from('housie_games')
                .select('winners')
                .eq('game_code', gameCode)
                .single();

            if (!game) return;

            const prevWinners = game.winners || {};
            const winners = { ...prevWinners };

            const prevPending = winners['__pending'] || [];
            const updatedPending = prevPending.filter(
                (c: any) => !(c.ticketId === ticketId && c.prizeId === prizeId)
            );
            winners['__pending'] = updatedPending;

            const { data: updatedGame } = await supabase
                .from('housie_games')
                .update({
                    winners,
                    last_activity_at: now
                })
                .eq('game_code', gameCode)
                .eq('winners', prevWinners)
                .select()
                .single();

            if (updatedGame && updatedPending.length === 0) {
                await resetAutoHostTimer(gameCode);
            }

            await broadcastResult(finalStatus, message);
        }

        async function broadcastResult(finalStatus: string, message?: string) {
            let playerName = 'Player';
            let avatarUrl = '';
            let prizeName = 'Prize';

            try {
                const [{ data: userData }, { data: gData }] = await Promise.all([
                    supabase.from('users').select('name, avatar_url').eq('id', userId).single(),
                    supabase.from('housie_games').select('prizes').eq('game_code', gameCode).single()
                ]);

                if (userData) {
                    playerName = userData.name;
                    avatarUrl = userData.avatar_url;
                }
                if (gData?.prizes) {
                    const prize = gData.prizes.find((p: any) => p.id === prizeId);
                    if (prize) prizeName = prize.name;
                }
            } catch (e) { }

            io.to(gameCode).emit('claim_result', {
                prizeId, userId, ticketId, status: finalStatus,
                playerName, avatarUrl, prizeName, message
            });
        }
    }

    socket.on('sync_marks', async (data) => {
        const { ticketId, markedNumbers } = data;
        try {
            await supabase
                .from('housie_tickets')
                .update({ marked_numbers: markedNumbers })
                .eq('id', ticketId);
        } catch (e) {
            console.error("[Socket] Failed to sync marks:", e);
        }
    });
};
