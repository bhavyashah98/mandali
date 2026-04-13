import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth';
import groupRoutes from './routes/groups';
import uploadRoutes from './routes/upload';
import housieRoutes from './routes/housie';
import memoriesRoutes from './routes/memories';
import legalRoutes from './routes/legal';
import { supabase } from './lib/supabase';

const app = express();
const port = process.env.PORT || 3000;
const httpServer = createServer(app);

export const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    },
    allowEIO3: true // Support older engine.io versions if necessary
});

// Attach io to app for use in routes
app.set('io', io);

app.use(cors());
app.use(express.json({ limit: '20mb' }));

app.use((req, res, next) => {
    console.log(`[API] ${req.method} ${req.url}`);
    next();
});

// Route Handlers
app.use('/auth', authRoutes);
app.use('/groups', groupRoutes);
app.use('/upload', uploadRoutes);
app.use('/housie', housieRoutes);
app.use('/memories', memoriesRoutes);
app.use('/', legalRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Mandali API is running' });
});

// Socket.io Connection Logic
io.on('connection', (socket) => {
    console.log(`[Socket] New user connected: ${socket.id}`);
    
    socket.on('join_game', (gameCode) => {
        socket.join(gameCode);
    });

    socket.on('join_group', (groupId) => {
        socket.join(groupId); // Lobby screens subscribe to group-level events
    });

    socket.on('claim_prize', async (data) => {
        const { gameCode, prizeId, userId, ticketId, markedNumbers } = data;
        
        try {
            // Get current game state
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

            // Persist pending claim to DB so host sees it even after re-opening
            const winners = game?.winners || {};
            const pending = winners['__pending'] || [];
            // Avoid duplicate pending claims for same ticket+prize
            const alreadyPending = pending.some((c: any) => c.ticketId === ticketId && c.prizeId === prizeId);
            if (!alreadyPending) {
                winners['__pending'] = [...pending, claimPayload];
                await supabase
                    .from('housie_games')
                    .update({ winners })
                    .eq('game_code', gameCode);
            }

            // Broadcast to host
            io.to(gameCode).emit('new_claim', claimPayload);
        } catch (e) {
            console.error("Claim broadcast error:", e);
        }
    });

    socket.on('verify_claim', async (data) => {
        const { gameCode, prizeId, userId, ticketId, status, claimedOnIndex } = data;
        
        try {
            // Fetch current winners and prizes
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

                // Check if prize was already taken on a PREVIOUS number
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

                // Add to the winners list (Shared prize logic)
                const newWinner = { 
                    userId, 
                    ticketId, 
                    claimedAt: new Date(),
                    claimedOnIndex: claimedOnIndex || currentCalledCount 
                };

                const updatedWinnersList = [...existingWinners, newWinner];
                winners[prizeId] = updatedWinnersList;

                // Update the game state in DB
                await supabase
                    .from('housie_games')
                    .update({ winners })
                    .eq('game_code', gameCode);

                // RECORD RESULTS: Calculate split amount
                const splitAmount = Math.floor(prizeTotalAmount / updatedWinnersList.length);

                // Update ALL winners of this prize for this game in game_results
                for (const winEntry of updatedWinnersList) {
                    const { error: upsertError } = await supabase
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
                    
                    if (upsertError) {
                        console.error('[Results] Upsert failure:', upsertError.message);
                    }
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

            // Remove from __pending queue regardless of outcome
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

        // Broadcast result to everyone in room
        io.to(gameCode).emit('claim_result', {
            prizeId,
            userId,
            ticketId,
            status 
        });
    });

    socket.on('disconnect', () => {
        console.log(`[Socket] User disconnected: ${socket.id}`);
    });
});

httpServer.listen(port, () => {
    console.log(`[Server] Mandali backend is listening on port ${port}`);
});
