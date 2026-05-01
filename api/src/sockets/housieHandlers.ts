import { Server, Socket } from 'socket.io';
import { supabase } from '../lib/supabase';
import { checkPrize } from '../utils/tambola';
import { resetAutoHostTimer } from '../services/housieAutoHost';

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
            const alreadyIn = pending.some((p: any) => p.userId === userId && p.type === 'modal_open');
            if (!alreadyIn) {
                winners['__pending'] = [...pending, { userId, type: 'modal_open', at: new Date().toISOString() }];
                await supabase.from('housie_games').update({ winners }).eq('game_code', gameCode);
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
            const updatedPending = pending.filter((p: any) => !(p.userId === userId && p.type === 'modal_open'));
            if (updatedPending.length !== pending.length) {
                winners['__pending'] = updatedPending;
                await supabase
                    .from('housie_games')
                    .update({ 
                        winners,
                        last_activity_at: new Date().toISOString()
                    })
                    .eq('game_code', gameCode);
                
                resetAutoHostTimer(gameCode);
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
                claimedAt: new Date().toISOString()
            };

            const isAutoMode = game.settings?.callingMode === 'auto';
            const winners = game.winners || {};
            const pending = winners['__pending'] || [];
            
            // 1. Remove the "modal_open" virtual claim for this user if it exists
            // 2. Add the actual claim
            const updatedPending = pending.filter((p: any) => !(p.userId === userId && p.type === 'modal_open'));
            winners['__pending'] = [...updatedPending, claimPayload];

            await supabase
                .from('housie_games')
                .update({ winners })
                .eq('game_code', gameCode);
            
            io.to(gameCode).emit('new_claim', claimPayload);

            if (isAutoMode) {
                // ─── AUTO MODE: Instant verification ───
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
            const { data: game } = await supabase
                .from('housie_games')
                .select('id, group_id, winners, called_numbers, prizes')
                .eq('game_code', gameCode)
                .single();

            if (!game) return;

            const winners = game.winners || {};
            const currentCalledCount = game.called_numbers?.length || 0;
            const prizes = game.prizes || [];
            const prize = prizes.find((p: any) => p.id === prizeId);
            const prizeTotalAmount = prize ? (prize.amount || 0) : 0;

            if (status === 'accepted') {
                const existingWinners = Array.isArray(winners[prizeId]) ? winners[prizeId] : (winners[prizeId] ? [winners[prizeId]] : []);

                // Prevent late claims if someone already won this prize on an earlier number
                if (existingWinners.length > 0) {
                    const firstWinnerIndex = existingWinners[0].claimedOnIndex;
                    if (firstWinnerIndex && firstWinnerIndex < (claimedOnIndex || currentCalledCount)) {
                        broadcastResult('denied', 'Prize already claimed');
                        return;
                    }
                }

                const newWinner = {
                    userId,
                    ticketId,
                    claimedAt: new Date(),
                    claimedOnIndex: claimedOnIndex || currentCalledCount
                };

                const updatedWinnersList = [...existingWinners, newWinner];
                winners[prizeId] = updatedWinnersList;

                const splitAmount = Math.floor(prizeTotalAmount / updatedWinnersList.length);

                for (const winEntry of updatedWinnersList) {
                    await supabase
                        .from('game_results')
                        .upsert({
                            game_id: game.id,
                            group_id: game.group_id,
                            user_id: winEntry.userId,
                            prize_name: prize ? prize.name : prizeId,
                            prize_amount: splitAmount
                        }, {
                            onConflict: 'game_id,user_id,prize_name'
                        });
                }
            } else if (status === 'denied') {
                const deniedMap = winners['__denied'] || {};
                const ticketDeniedInfo = deniedMap[ticketId] || [];
                if (!ticketDeniedInfo.includes(prizeId)) {
                    ticketDeniedInfo.push(prizeId);
                }
                deniedMap[ticketId] = ticketDeniedInfo;
                winners['__denied'] = deniedMap;
            }

            // Remove from pending if it was there
            const updatedPending = (winners['__pending'] || []).filter(
                (c: any) => !(c.ticketId === ticketId && c.prizeId === prizeId)
            );
            winners['__pending'] = updatedPending;

            // Final update for winners and reset timer
            await supabase
                .from('housie_games')
                .update({ 
                    winners,
                    last_activity_at: new Date().toISOString()
                })
                .eq('game_code', gameCode);

            resetAutoHostTimer(gameCode);

            broadcastResult(status);

        } catch (err) {
            console.error("Error resolving claim:", err);
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
            } catch (e) {}

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
