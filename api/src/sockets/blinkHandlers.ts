import { Server, Socket } from 'socket.io';
import { supabase } from '../lib/supabase';
import { getOrRestoreGame, activeBlinkGames } from '../services/blinkMemory';

// Thread-safe lock registry to prevent concurrency race conditions during taps
const processingGames = new Set<string>();

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
        const startTime = Date.now();
        const userId = (socket as any).userId;
        console.log(`[Blink Perf] Received match_attempt at: ${startTime}`);

        if (!userId) {
            console.warn('[Blink] match_attempt: DROPPED — no userId on socket');
            return;
        }

        const code = gameCode.toUpperCase();
        
        // 1. Acquire Per-Game Concurrency Lock
        if (processingGames.has(code)) {
            console.log(`[Blink Perf Lock] match_attempt: DROPPED concurrent processing for game: ${code}`);
            return;
        }
        processingGames.add(code);

        try {
            // 2. Fetch Game from RAM memory with DB crash recovery fallback (NO DB reads if game is active in memory!)
            const game = await getOrRestoreGame(code);
            if (!game) {
                console.warn(`[Blink] match_attempt: DROPPED — game not found or inactive (code: ${code})`);
                return;
            }
            if (game.status !== 'active') {
                console.warn(`[Blink] match_attempt: DROPPED — game status is '${game.status}'`);
                return;
            }

            const player = game.players.get(userId);
            if (!player || !player.currentCardId) {
                console.warn(`[Blink] match_attempt: DROPPED — player invalid or has no current card`);
                return;
            }

            const centerSymbols = game.currentCenterCardSymbols;
            const mySymbols = player.currentCardSymbols;

            if (!centerSymbols || !mySymbols) {
                console.warn('[Blink] match_attempt: DROPPED — card symbols missing');
                return;
            }

            const centerHas = centerSymbols.includes(symbolId);
            const myHas = mySymbols.includes(symbolId);

            if (centerHas && myHas) {
                const playerCardId = player.currentCardId;
                const newCenterCardId = playerCardId;
                const newCenterCardSymbols = [...player.currentCardSymbols];
                const remaining = player.cardsRemaining;

                let nextCardId: string | null = null;
                let nextCardSymbols: number[] | null = null;

                if (remaining > 0) {
                    // Draw next card from the preloaded RAM deck
                    const next = game.deck.pop();
                    if (next) {
                        nextCardId = next.id;
                        nextCardSymbols = next.symbols;
                    }
                }

                // Recycle the old center card to the bottom of the deck
                game.deck.unshift({
                    id: game.currentCenterCardId as string,
                    symbols: [...game.currentCenterCardSymbols]
                });

                // 3. IMMEDIATELY UPDATE RAM STATE (Zero blocking/blocking DB wait!)
                game.currentCenterCardId = newCenterCardId;
                game.currentCenterCardSymbols = newCenterCardSymbols;

                player.currentCardId = nextCardId || '';
                player.currentCardSymbols = nextCardSymbols || [];
                if (remaining > 0) {
                    player.cardsRemaining = remaining - 1;
                }

                // 4. PERSIST TO DATABASE ASYNC (FIRE AND FORGET - DOES NOT BLOCK CLIENT!)
                Promise.all([
                    supabase.from('blink_games').update({ current_center_card: newCenterCardId }).eq('id', game.id),
                    supabase.from('blink_players').update({
                        current_card_id: nextCardId,
                        cards_remaining: remaining > 0 ? remaining - 1 : 0
                    }).eq('game_id', game.id).eq('user_id', userId)
                ]).catch(dbErr => {
                    console.error('[Blink Memory] DB Persistence Error:', dbErr);
                });

                console.log(`[Blink Memory] Match Success: CenterCard ${game.currentCenterCardId} -> ${newCenterCardId} (Remaining: ${remaining > 0 ? remaining - 1 : 0})`);

                const serverDuration = Date.now() - startTime;
                console.log(`[Blink Perf RAM] Match success processing took: ${serverDuration}ms`);

                // 5. IMMEDIATELY EMIT THE UPDATE
                io.to(code).emit('blink_state_update', {
                    c: newCenterCardSymbols,
                    u: userId,
                    l: remaining > 0 ? remaining - 1 : -1,
                    sd: serverDuration // Server processing time
                });

                if (nextCardSymbols) {
                    socket.emit('blink_personal_update', { p: nextCardSymbols });
                }

                // Check if this player finished all their cards (winner!)
                if (remaining === 0) {
                    console.log(`[Blink Memory] Player ${userId} finished all cards! Calculating rank...`);
                    
                    game.winnersCount += 1;
                    const winnerRank = game.winnersCount;
                    const prizes: any[] = game.prizes || [];
                    
                    // Use defined prize or a fallback
                    const prize = prizes[winnerRank - 1] || { 
                        name: `Blitz ${winnerRank}`, 
                        amount: 0 
                    };

                    const prizeName = prize.name || `Blitz_${winnerRank}`;
                    const prizeAmount = prize.amount ?? 0;

                    console.log(`[Blink Memory] Saving result for ${userId} (Rank ${winnerRank}, Prize: ${prizeName})`);

                    // Persist Winner Result to DB Async
                    supabase
                        .from('game_results')
                        .upsert({
                            game_id: game.id,
                            group_id: game.groupId,
                            user_id: userId,
                            prize_name: prizeName,
                            prize_amount: prizeAmount,
                            won_at: new Date().toISOString()
                        }, { onConflict: 'game_id,user_id,prize_name' })
                        .then(({ error: resultErr }) => {
                            if (resultErr) {
                                console.error(`[Blink Memory] ❌ FAILED to save game_result to DB:`, resultErr.message);
                            } else {
                                console.log(`[Blink Memory] 🏆 SUCCESS! Saved Rank ${winnerRank} for player ${userId}`);
                            }
                        });

                    io.to(code).emit('blink_winner', {
                        userId,
                        rank: winnerRank,
                        prizeName,
                        prizeAmount,
                    });

                    // End game when all prize slots are filled
                    const totalPrizeSlots = prizes.length;
                    if (winnerRank >= totalPrizeSlots) {
                        console.log(`[Blink Memory] 🎉 All ${totalPrizeSlots} winners found — ending game`);
                        
                        game.status = 'ended';
                        activeBlinkGames.delete(code); // Clean up RAM cache

                        // Persist game ending state to DB Async
                        supabase
                            .from('blink_games')
                            .update({ status: 'ended', ended_at: new Date().toISOString() })
                            .eq('id', game.id)
                            .then(({ error: endErr }) => {
                                if (endErr) console.error(`[Blink Memory] Failed to update game status ended in DB:`, endErr.message);
                            });

                        io.to(code).emit('blink_game_ended', { gameCode: code });
                        io.to(`group_${game.groupId}`).emit('blink_game_ended', { gameCode: code, groupId: game.groupId });
                    }
                }
            } else {
                console.log(`[Blink Perf RAM] match_attempt: ❌ NO MATCH (CenterCardID: ${game.currentCenterCardId})`);
                console.log(`  - Center Symbols: ${JSON.stringify(centerSymbols)}`);
                console.log(`  - Player Symbols: ${JSON.stringify(mySymbols)}`);
                console.log(`  - Tapped Symbol: ${symbolId}`);
                console.log(`  - centerHas: ${centerHas}, myHas: ${myHas}`);

                socket.emit('blink_match_fail', {
                    reason: 'No match found',
                    centerCardId: game.currentCenterCardId,
                    centerSymbols,
                    mySymbols,
                    tappedSymbol: symbolId
                });
            }
        } catch (error) {
            console.error('[Blink Memory] Match Attempt Error:', error);
        } finally {
            // 6. Release Per-Game Concurrency Lock
            processingGames.delete(code);
        }
    });
};
