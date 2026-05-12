import { Server, Socket } from 'socket.io';
import { supabase } from '../lib/supabase';
import { checkPrize } from '../utils/tambola';
import { pauseAutoHost, resetAutoHostTimer } from '../services/housieAutoHost';

export const registerHousieHandlers = (io: Server, socket: Socket) => {

    socket.on('join_game', (gameCode, ack) => {
        socket.join(gameCode);
        if (typeof ack === 'function') {
            ack({ success: true, room: gameCode });
        }
    });

    socket.on('join_group', (groupId, ack) => {
        socket.join(`group_${groupId}`);
        if (typeof ack === 'function') {
            ack({ success: true, room: `group_${groupId}` });
        }
    });

    // Player signals they've opened the prize selection modal
    socket.on('claiming_open', async ({ gameCode, userId }) => {
        try {
            const { data: game } = await supabase.from('housie_games').select('winners').eq('game_code', gameCode).single();
            if (!game) return;

            const winners = game.winners || {};
            const pending = winners['__pending'] || [];

            if (!pending.some((p: any) => p.userId === userId && p.type === 'pre_claim')) {
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
            const { data: game } = await supabase.from('housie_games').select('winners').eq('game_code', gameCode).single();
            if (!game) return;

            const winners = game.winners || {};
            const pending = winners['__pending'] || [];
            const updatedPending = pending.filter((p: any) => !(p.userId === userId && p.type === 'pre_claim'));

            if (updatedPending.length !== pending.length) {
                winners['__pending'] = updatedPending;
                await supabase.from('housie_games').update({ winners }).eq('game_code', gameCode);

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
            // Fetch game data
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

            const winners = game.winners || {};
            const pending = winners['__pending'] || [];
            
            // Clean up pre_claim and add real claim
            const filteredPending = pending.filter((p: any) => !(p.userId === userId && p.type === 'pre_claim'));
            winners['__pending'] = [...filteredPending, claimPayload];

            // Perform simple update (no optimistic lock to avoid race conditions with same-user events)
            await supabase.from('housie_games').update({ winners }).eq('game_code', gameCode);

            io.to(gameCode).emit('new_claim', claimPayload);

            // Auto-Verification
            if (game.settings?.callingMode === 'auto') {
                const { data: ticket } = await supabase.from('housie_tickets').select('ticket_data').eq('id', ticketId).single();
                const isCorrect = ticket && checkPrize(prizeId, ticket.ticket_data, currentCalledNumbers, game.settings?.gameStyle);
                
                await processClaimResolution(io, gameCode, {
                    gameCode, prizeId, userId, ticketId, 
                    status: isCorrect ? 'accepted' : 'denied',
                    claimedOnIndex: currentNumberIndex
                });
            }
        } catch (e) {
            console.error("Claim processing error:", e);
        }
    });

    socket.on('verify_claim', async (data) => {
        await processClaimResolution(io, data.gameCode, data);
    });

    async function processClaimResolution(io: Server, gameCode: string, data: any) {
        const { prizeId, userId, ticketId, status, claimedOnIndex } = data;

        try {
            const { data: game } = await supabase.from('housie_games').select('*').eq('game_code', gameCode).single();
            if (!game) return;

            const winners = game.winners || {};
            const currentCalledCount = game.called_numbers?.length || 0;
            const prize = (game.prizes || []).find((p: any) => p.id === prizeId);
            const prizeTotalAmount = prize ? (prize.amount || 0) : 0;

            const existingWinners: any[] = Array.isArray(winners[prizeId])
                ? winners[prizeId]
                : (winners[prizeId] ? [winners[prizeId]] : []);

            const effectiveIndex = claimedOnIndex || currentCalledCount;

            if (status === 'accepted') {
                const alreadyAccepted = existingWinners.some((w: any) => w.ticketId === ticketId);
                if (!alreadyAccepted) {
                    const newWinner = { userId, ticketId, claimedAt: new Date().toISOString(), claimedOnIndex: effectiveIndex };
                    const updatedList = [...existingWinners, newWinner];
                    winners[prizeId] = updatedList;

                    const splitAmount = Math.floor(prizeTotalAmount / updatedList.length);
                    await Promise.all(updatedList.map((win) => 
                        supabase.from('game_results').upsert({
                            game_id: game.id, group_id: game.group_id, user_id: win.userId,
                            prize_name: prize ? prize.name : prizeId, prize_amount: splitAmount
                        }, { onConflict: 'game_id,user_id,prize_name' })
                    ));
                }
            } else {
                const deniedMap = winners['__denied'] || {};
                const ticketDeniedInfo = deniedMap[ticketId] || [];
                if (!ticketDeniedInfo.includes(prizeId)) ticketDeniedInfo.push(prizeId);
                deniedMap[ticketId] = ticketDeniedInfo;
                winners['__denied'] = deniedMap;
            }

            // Remove from pending
            const prevPending = winners['__pending'] || [];
            const updatedPending = prevPending.filter((c: any) => !(c.ticketId === ticketId && c.prizeId === prizeId));
            winners['__pending'] = updatedPending;

            await supabase.from('housie_games').update({ winners }).eq('game_code', gameCode);

            if (updatedPending.length === 0) {
                await resetAutoHostTimer(gameCode);
            }

            // Fetch user info for broadcast
            const { data: userData } = await supabase.from('users').select('name, avatar_url').eq('id', userId).single();
            
            io.to(gameCode).emit('claim_result', {
                prizeId, userId, ticketId, status,
                playerName: userData?.name || 'Player',
                avatarUrl: userData?.avatar_url || '',
                prizeName: prize ? prize.name : prizeId
            });

        } catch (err) {
            console.error("Error resolving claim:", err);
        }
    }

    socket.on('sync_marks', async (data) => {
        const { ticketId, markedNumbers } = data;
        try {
            await supabase.from('housie_tickets').update({ marked_numbers: markedNumbers }).eq('id', ticketId);
        } catch (e) {
            console.error("[Socket] Failed to sync marks:", e);
        }
    });
};
