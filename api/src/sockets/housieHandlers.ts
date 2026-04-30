import { Server, Socket } from 'socket.io';
import { supabase } from '../lib/supabase';

export const registerHousieHandlers = (io: Server, socket: Socket) => {

    socket.on('join_game', (gameCode) => {
        socket.join(gameCode);
    });

    socket.on('join_group', (groupId) => {
        socket.join(`group_${groupId}`);
    });

    // Player signals they've opened the prize selection modal (host should pause calling numbers)
    socket.on('claiming_open', ({ gameCode, userId }) => {
        socket.to(gameCode).emit('player_claiming_open', { userId });
    });

    // Player signals they've closed/resolved the prize modal
    socket.on('claiming_closed', ({ gameCode, userId }) => {
        socket.to(gameCode).emit('player_claiming_closed', { userId });
    });

    socket.on('claim_prize', async (data) => {
        const { gameCode, prizeId, userId, ticketId, markedNumbers } = data;

        try {
            const { data: game } = await supabase
                .from('housie_games')
                .select('called_numbers, winners')
                .eq('game_code', gameCode)
                .single();

            const currentNumberIndex = game?.called_numbers?.length || 0;
            const lastNumber = game?.called_numbers?.[currentNumberIndex - 1];

            const claimPayload = {
                prizeId, userId, ticketId, markedNumbers,
                claimedOnNumber: lastNumber,
                claimedOnIndex: currentNumberIndex,
                claimedAt: new Date().toISOString()
            };

            const winners = game?.winners || {};
            const pending = winners['__pending'] || [];
            const alreadyPending = pending.some((c: any) => c.ticketId === ticketId && c.prizeId === prizeId);
            if (!alreadyPending) {
                winners['__pending'] = [...pending, claimPayload];
                await supabase
                    .from('housie_games')
                    .update({ winners })
                    .eq('game_code', gameCode);
            }

            io.to(gameCode).emit('new_claim', claimPayload);
        } catch (e) {
            console.error("Claim broadcast error:", e);
        }
    });

    socket.on('verify_claim', async (data) => {
        const { gameCode, prizeId, userId, ticketId, status, claimedOnIndex } = data;

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

                if (existingWinners.length > 0) {
                    const firstWinnerIndex = existingWinners[0].claimedOnIndex;
                    if (firstWinnerIndex && firstWinnerIndex < (claimedOnIndex || currentCalledCount)) {
                        io.to(gameCode).emit('claim_result', {
                            prizeId, userId, ticketId, status: 'denied', message: 'Prize already claimed'
                        });
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

                await supabase
                    .from('housie_games')
                    .update({ winners })
                    .eq('game_code', gameCode);

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

            const updatedPending = (winners['__pending'] || []).filter(
                (c: any) => !(c.ticketId === ticketId && c.prizeId === prizeId)
            );
            winners['__pending'] = updatedPending;

            await supabase
                .from('housie_games')
                .update({ winners })
                .eq('game_code', gameCode);
        } catch (err) {
            console.error("Error updating winners and results:", err);
        }

        // Fetch user and prize info for a rich broadcast notification
        let playerName = 'Player';
        let avatarUrl = '';
        let prizeName = 'Prize';

        try {
            const [{ data: userData }, { data: pData }] = await Promise.all([
                supabase.from('users').select('name, avatar_url').eq('id', userId).single(),
                supabase.from('housie_games').select('prizes').eq('game_code', gameCode).single()
            ]);

            if (userData) {
                playerName = userData.name;
                avatarUrl = userData.avatar_url;
            }
            if (pData?.prizes) {
                const prize = pData.prizes.find((p: any) => p.id === prizeId);
                if (prize) prizeName = prize.name;
            }
        } catch (infoErr) {
            console.error("Error fetching notification info:", infoErr);
        }

        io.to(gameCode).emit('claim_result', {
            prizeId,
            userId,
            ticketId,
            status,
            playerName,
            avatarUrl,
            prizeName
        });
    });

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
