import { Server, Socket } from 'socket.io';
import { supabase } from '../lib/supabase';

export const registerBlinkHandlers = (io: Server, socket: Socket) => {

    socket.on('join_blink_game', async (gameCode) => {
        socket.join(gameCode);
        console.log(`[Blink] User joined game room: ${gameCode}`);

        const userId = (socket as any).userId;
        if (!userId) return;

        try {
            const { data: game } = await supabase
                .from('blink_games')
                .select('id, status')
                .eq('game_code', gameCode)
                .single();

            if (!game || (game.status !== 'waiting' && game.status !== 'scheduled')) return;

            const { error: joinError } = await supabase
                .from('blink_players')
                .upsert({
                    game_id: game.id,
                    user_id: userId,
                }, { onConflict: 'game_id,user_id' });

            if (!joinError) {
                io.to(gameCode).emit('blink_player_joined', { gameCode });
            }
        } catch (error) {
            console.error('[Blink] Join Room Error:', error);
        }
    });

    socket.on('blink_match_attempt', async ({ gameCode, symbolId }) => {
        const userId = (socket as any).userId;
        console.log(`[Blink] match_attempt → userId=${userId} gameCode=${gameCode} symbolId=${symbolId}`);

        if (!userId) {
            console.warn('[Blink] match_attempt: DROPPED — no userId on socket');
            return;
        }

        try {
            const { data: game, error: gameError } = await supabase
                .from('blink_games')
                .select('*')
                .eq('game_code', gameCode.toUpperCase())
                .single();

            if (gameError) {
                console.error('[Blink] match_attempt: DB error fetching game:', gameError.message);
                return;
            }
            if (!game) {
                console.warn(`[Blink] match_attempt: DROPPED — game not found (${gameCode})`);
                return;
            }
            if (game.status !== 'active') {
                console.warn(`[Blink] match_attempt: DROPPED — game status is '${game.status}', not 'active'`);
                return;
            }

            const { data: dbPlayers, error: playersError } = await supabase
                .from('blink_players')
                .select('user_id, current_card_id, cards_remaining, users(name)')
                .eq('game_id', game.id);

            if (playersError) {
                console.error('[Blink] match_attempt: DB error fetching players:', playersError.message);
                return;
            }
            if (!dbPlayers) {
                console.warn('[Blink] match_attempt: DROPPED — no players found');
                return;
            }

            const player = dbPlayers.find(p => p.user_id === userId);
            if (!player) {
                console.warn(`[Blink] match_attempt: DROPPED — userId ${userId} not found in players`);
                return;
            }
            if (!player.current_card_id) {
                console.warn(`[Blink] match_attempt: DROPPED — player has no current_card_id`);
                return;
            }

            const centerCardId = game.current_center_card;
            const playerCardId = player.current_card_id;
            console.log(`[Blink] match_attempt: centerCardId=${centerCardId} playerCardId=${playerCardId}`);

            const { data: cardsData, error: cardsError } = await supabase
                .from('blink_cards')
                .select('id, symbols')
                .in('id', [centerCardId, playerCardId]);

            if (cardsError) {
                console.error('[Blink] match_attempt: DB error fetching cards:', cardsError.message);
                return;
            }

            const centerSymbols = cardsData?.find(c => c.id === centerCardId)?.symbols;
            const mySymbols = cardsData?.find(c => c.id === playerCardId)?.symbols;

            console.log(`[Blink] match_attempt: centerSymbols=${JSON.stringify(centerSymbols)} mySymbols=${JSON.stringify(mySymbols)} tappedSymbolId=${symbolId}`);

            if (!centerSymbols || !mySymbols) {
                console.warn('[Blink] match_attempt: DROPPED — could not resolve card symbols');
                return;
            }

            const centerHas = centerSymbols.includes(symbolId);
            const myHas = mySymbols.includes(symbolId);
            console.log(`[Blink] match_attempt: centerHas=${centerHas} myHas=${myHas}`);

            if (centerHas && myHas) {
                const newCenterCardId = playerCardId;
                const remaining = player.cards_remaining;

                let winner = null;
                let nextCardId = null;
                let nextCardSymbols: number[] | null = null;

                if (remaining === 0) {
                    winner = { userId, name: (player.users as any)?.name || 'Player' };
                    console.log(`[Blink] match_attempt: 🏆 WINNER → ${userId}`);
                } else {
                    const usedIds = new Set([newCenterCardId]);
                    dbPlayers.forEach(p => {
                        if (p.user_id !== userId && p.current_card_id) usedIds.add(p.current_card_id);
                    });

                    const { data: availableCards, error: availErr } = await supabase
                        .from('blink_cards')
                        .select('id, symbols')
                        .eq('symbols_per_card', game.symbols_per_card)
                        .not('id', 'in', `(${Array.from(usedIds).join(',')})`);

                    if (availErr) console.warn('[Blink] match_attempt: error fetching next card:', availErr.message);

                    if (availableCards && availableCards.length > 0) {
                        const next = availableCards[Math.floor(Math.random() * availableCards.length)];
                        nextCardId = next.id;
                        nextCardSymbols = next.symbols;
                        console.log(`[Blink] match_attempt: nextCardId=${nextCardId} cardsRemaining=${remaining - 1}`);
                    } else {
                        console.warn('[Blink] match_attempt: no available cards to assign next card!');
                    }
                }

                // Update DB — set new center card, keep game active
                const gameUpdatePayload: any = {
                    current_center_card: newCenterCardId,
                    status: 'active',
                };

                const { error: gameUpdateErr } = await supabase
                    .from('blink_games')
                    .update(gameUpdatePayload)
                    .eq('id', game.id);

                if (gameUpdateErr) console.error('[Blink] match_attempt: failed to update game:', gameUpdateErr.message);

                const { error: playerUpdateErr } = await supabase
                    .from('blink_players')
                    .update({
                        current_card_id: nextCardId,
                        cards_remaining: remaining > 0 ? remaining - 1 : 0
                    })
                    .eq('game_id', game.id)
                    .eq('user_id', userId);

                if (playerUpdateErr) console.error('[Blink] match_attempt: failed to update player:', playerUpdateErr.message);

                console.log(`[Blink] match_attempt: ✅ emitting blink_state_update to room ${gameCode.toUpperCase()}`);
                io.to(gameCode.toUpperCase()).emit('blink_state_update', {
                    c: mySymbols,
                    u: userId,
                    l: remaining > 0 ? remaining - 1 : 0
                });

                if (nextCardSymbols) {
                    console.log(`[Blink] match_attempt: 📤 emitting blink_personal_update to player`);
                    socket.emit('blink_personal_update', { p: nextCardSymbols });
                }

                // Check if this player finished all their cards (winner!)
                if (remaining === 0) {
                    // Determine winner rank from existing game_results for this game
                    const { data: existingResults } = await supabase
                        .from('game_results')
                        .select('id')
                        .eq('game_id', game.id);

                    const winnerRank = (existingResults?.length ?? 0) + 1;
                    const prizes: any[] = game.prizes || [];
                    const prize = prizes[winnerRank - 1];

                    if (prize) {
                        const prizeName = `Blitz_${winnerRank}`;
                        const prizeAmount = prize.amount ?? 0;

                        const { error: resultErr } = await supabase
                            .from('game_results')
                            .upsert({
                                game_id: game.id,
                                group_id: game.group_id,
                                user_id: userId,
                                prize_name: prizeName,
                                prize_amount: prizeAmount,
                            }, { onConflict: 'game_id,user_id,prize_name' });

                        if (resultErr) {
                            console.error(`[Blink] match_attempt: failed to save game_result:`, resultErr.message);
                        } else {
                            console.log(`[Blink] match_attempt: 🏆 Rank ${winnerRank} winner → ${userId} (${prizeName}: ${prizeAmount})`);
                        }

                        io.to(gameCode.toUpperCase()).emit('blink_winner', {
                            userId,
                            rank: winnerRank,
                            prizeName,
                            prizeAmount,
                        });

                        // End game when all prize slots are filled
                        const totalPrizeSlots = prizes.length;
                        if (winnerRank >= totalPrizeSlots) {
                            console.log(`[Blink] match_attempt: 🎉 All ${totalPrizeSlots} winners found — ending game`);
                            await supabase
                                .from('blink_games')
                                .update({ status: 'ended', ended_at: new Date().toISOString() })
                                .eq('id', game.id);

                            io.to(gameCode.toUpperCase()).emit('blink_game_ended', { gameCode: gameCode.toUpperCase() });
                            io.to(`group_${game.group_id}`).emit('blink_game_ended', { gameCode: gameCode.toUpperCase(), groupId: game.group_id });
                        }
                    } else {
                        console.warn(`[Blink] match_attempt: no prize defined for rank ${winnerRank}, game has ${prizes.length} prizes`);
                    }
                }
            } else {
                console.log(`[Blink] match_attempt: ❌ no match — emitting blink_match_fail`);
                socket.emit('blink_match_fail', { reason: 'No match found' });
            }
        } catch (error) {
            console.error('[Blink] Match Attempt Error:', error);
        }
    });
};
