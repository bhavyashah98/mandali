import { Server, Socket } from 'socket.io';
import { supabase } from '../lib/supabase';

export const registerBlinkHandlers = (io: Server, socket: Socket) => {

    socket.on('join_blink_game', async (gameCode) => {
        socket.join(gameCode);
        console.log(`[Blink] User joined game room: ${gameCode}`);
    });

    socket.on('blink_start_game', async ({ gameCode }) => {
        try {
            // 1. Fetch game settings
            const { data: game } = await supabase
                .from('blink_games')
                .select('*')
                .eq('game_code', gameCode)
                .single();

            if (!game) return;

            // 2. Fetch all participants from blink_players (or group members for now)
            // In a real flow, players "Join" and get added to a participants list
            // For now, let's fetch members of the group who are online or just everyone joined
            // Actually, let's assume we have a join mechanism that adds them to a 'participants' column
            // or we just start with whoever is in the waiting room.
            
            // For simplicity, let's use a hypothetical 'participants' list or fetch from group
            const { data: participants } = await supabase
                .from('group_members')
                .select('user_id, users(name, avatar_url)')
                .eq('group_id', game.group_id);

            if (!participants || participants.length < 2) {
                socket.emit('blink_error', { message: 'Need at least 2 players to start.' });
                return;
            }

            // 3. Fetch cards from blink_cards
            const { data: cards } = await supabase
                .from('blink_cards')
                .select('symbols')
                .eq('difficulty_level', game.difficulty_level);

            if (!cards || cards.length === 0) {
                socket.emit('blink_error', { message: 'No cards found for this difficulty.' });
                return;
            }

            // 4. Shuffle and distribute
            const shuffledCards = [...cards].sort(() => Math.random() - 0.5);
            
            const centerCard = shuffledCards.pop()!.symbols;
            const players = participants.map(p => {
                const hand: number[][] = [];
                for (let i = 0; i < game.cards_per_player; i++) {
                    if (shuffledCards.length > 0) {
                        hand.push(shuffledCards.pop()!.symbols);
                    }
                }
                return {
                    userId: p.user_id,
                    name: (p.users as any).name,
                    avatarUrl: (p.users as any).avatar_url,
                    hand: hand,
                    cardsLeft: hand.length
                };
            });

            // 5. Update game state
            await supabase
                .from('blink_games')
                .update({
                    status: 'active',
                    center_card: centerCard,
                    players_state: players, // Store everything in one JSONB for now
                    started_at: new Date().toISOString()
                })
                .eq('game_code', gameCode);

            io.to(gameCode).emit('blink_game_started', { gameCode });
            io.to(gameCode).emit('blink_state_update', { centerCard, players });

        } catch (error) {
            console.error('[Blink] Start Game Error:', error);
        }
    });

    socket.on('blink_match_attempt', async ({ gameCode, symbolId, cardIndex }) => {
        const userId = (socket as any).userId;
        if (!userId) return;

        try {
            // 1. Fetch game state
            const { data: game } = await supabase
                .from('blink_games')
                .select('*')
                .eq('game_code', gameCode)
                .single();

            if (!game || game.status !== 'active') return;

            const centerCard = game.center_card as number[];
            const players = game.players_state as any[];
            const playerIndex = players.findIndex(p => p.userId === userId);

            if (playerIndex === -1) return;

            const player = players[playerIndex];
            const currentHand = player.hand as number[][];
            
            if (currentHand.length === 0) return;

            const myCard = currentHand[0];

            // 2. Validate match
            // Symbol must exist in both my top card and the center card
            const hasInMyCard = myCard.includes(symbolId);
            const hasInCenter = centerCard.includes(symbolId);

            if (hasInMyCard && hasInCenter) {
                // SUCCESS!
                const newCenterCard = myCard;
                const newHand = currentHand.slice(1);
                
                player.hand = newHand;
                player.cardsLeft = newHand.length;
                players[playerIndex] = player;

                // 3. Check for win
                let winner = null;
                let newStatus = 'active';
                if (newHand.length === 0) {
                    winner = { userId: player.userId, name: player.name };
                    newStatus = 'ended';
                }

                // 4. Update DB
                await supabase
                    .from('blink_games')
                    .update({
                        center_card: newCenterCard,
                        players_state: players,
                        status: newStatus,
                        winner_id: winner ? winner.userId : null
                    })
                    .eq('game_code', gameCode);

                // 5. Broadcast
                io.to(gameCode).emit('blink_state_update', { 
                    centerCard: newCenterCard, 
                    players: players.map(p => ({ 
                        userId: p.userId, 
                        name: p.name, 
                        cardsLeft: p.cardsLeft 
                    })) 
                });

                if (winner) {
                    io.to(gameCode).emit('blink_game_ended', { winner });
                } else {
                    socket.emit('blink_match_success', { symbolId });
                }
            } else {
                // FAIL
                socket.emit('blink_match_fail', { reason: 'No match found' });
            }

        } catch (error) {
            console.error('[Blink] Match Attempt Error:', error);
        }
    });
};
