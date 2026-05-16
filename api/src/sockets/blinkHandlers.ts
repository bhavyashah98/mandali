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
        if (!userId) return;

        try {
            const { data: game } = await supabase
                .from('blink_games')
                .select('*')
                .eq('game_code', gameCode.toUpperCase())
                .single();

            if (!game || game.status !== 'active') return;

            const { data: dbPlayers } = await supabase
                .from('blink_players')
                .select('user_id, current_card_id, cards_remaining, users(name)')
                .eq('game_id', game.id);

            if (!dbPlayers) return;

            const player = dbPlayers.find(p => p.user_id === userId);
            if (!player || !player.current_card_id) return;

            const centerCardId = game.current_center_card;
            const playerCardId = player.current_card_id;

            const { data: cardsData } = await supabase
                .from('blink_cards')
                .select('id, symbols')
                .in('id', [centerCardId, playerCardId]);

            const centerSymbols = cardsData?.find(c => c.id === centerCardId)?.symbols;
            const mySymbols = cardsData?.find(c => c.id === playerCardId)?.symbols;

            if (!centerSymbols || !mySymbols) return;

            if (centerSymbols.includes(symbolId) && mySymbols.includes(symbolId)) {
                const newCenterCardId = playerCardId;
                const remaining = player.cards_remaining;

                let winner = null;
                let nextCardId = null;
                let nextCardSymbols: number[] | null = null;

                if (remaining === 0) {
                    winner = { userId, name: (player.users as any)?.name || 'Player' };
                } else {
                    // Pick a new card for the player
                    // Logic: Get all currently used card IDs (center + all players' current cards)
                    const usedIds = new Set([newCenterCardId]);
                    dbPlayers.forEach(p => {
                        if (p.user_id !== userId && p.current_card_id) usedIds.add(p.current_card_id);
                    });

                    const { data: availableCards } = await supabase
                        .from('blink_cards')
                        .select('id, symbols')
                        .eq('symbols_per_card', game.symbols_per_card)
                        .not('id', 'in', `(${Array.from(usedIds).join(',')})`);

                    if (availableCards && availableCards.length > 0) {
                        const next = availableCards[Math.floor(Math.random() * availableCards.length)];
                        nextCardId = next.id;
                        nextCardSymbols = next.symbols;
                    }
                }

                // 4. Update DB
                await supabase
                    .from('blink_games')
                    .update({
                        current_center_card: newCenterCardId,
                        status: winner ? 'ended' : 'active',
                        winner_id: winner ? winner.userId : null
                    })
                    .eq('id', game.id);

                await supabase
                    .from('blink_players')
                    .update({
                        current_card_id: nextCardId,
                        cards_remaining: remaining > 0 ? remaining - 1 : 0
                    })
                    .eq('game_id', game.id)
                    .eq('user_id', userId);


                console.log("heereee", mySymbols);

                io.to(gameCode.toUpperCase()).emit('blink_state_update', {
                    c: mySymbols, // The card that was matched becomes the new center card
                    u: userId,
                    l: remaining > 0 ? remaining : 0
                });

                // Then send the new card symbols ONLY to the player who moved
                if (nextCardSymbols) {
                    // Find the specific socket for this user in the room or just use the current socket if they are the one who moved
                    socket.emit('blink_personal_update', { p: nextCardSymbols });
                }

                if (winner) {
                    io.to(gameCode.toUpperCase()).emit('blink_game_ended', { winner });
                }
            } else {
                socket.emit('blink_match_fail', { reason: 'No match found' });
            }
        } catch (error) {
            console.error('[Blink] Match Attempt Error:', error);
        }
    });
};
