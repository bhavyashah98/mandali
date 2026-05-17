import { supabase } from '../lib/supabase';

export interface InMemoryBlinkPlayer {
    userId: string;
    name: string;
    currentCardId: string;
    currentCardSymbols: number[];
    cardsRemaining: number;
}

export interface InMemoryBlinkGame {
    id: string;
    groupId: string;
    gameCode: string;
    status: string;
    symbolsPerCard: number;
    cardsPerPlayer: number;
    prizes: any[];
    currentCenterCardId: string;
    currentCenterCardSymbols: number[];
    players: Map<string, InMemoryBlinkPlayer>;
    deck: Array<{ id: string; symbols: number[] }>;
    winnersCount: number;
}

// Global active games repository in RAM
export const activeBlinkGames = new Map<string, InMemoryBlinkGame>();

/**
 * Gets the game details from RAM memory cache, or reconstructs it from the Supabase database
 * if the server has crashed or restarted (providing reliable crash recovery).
 */
export const getOrRestoreGame = async (gameCode: string): Promise<InMemoryBlinkGame | null> => {
    const code = gameCode.toUpperCase();
    let game = activeBlinkGames.get(code);
    if (game) {
        return game;
    }

    console.log(`[Blink Memory] Restoring game "${code}" from Supabase database (Crash Recovery)...`);
    
    try {
        // 1. Fetch game and players
        const { data: dbGame, error: gameError } = await supabase
            .from('blink_games')
            .select(`
                *,
                blink_players(
                    user_id, 
                    current_card_id, 
                    cards_remaining, 
                    users(name)
                )
            `)
            .eq('game_code', code)
            .single();

        if (gameError || !dbGame) {
            console.error(`[Blink Memory] Error fetching game for restore:`, gameError?.message);
            return null;
        }

        if (dbGame.status !== 'active') {
            console.log(`[Blink Memory] Restored game status is not active: "${dbGame.status}". Skipping RAM load.`);
            return null;
        }

        // 2. Fetch all cards for this symbols_per_card to reconstruct the deck and card symbols
        const { data: allCards, error: cardsError } = await supabase
            .from('blink_cards')
            .select('id, symbols')
            .eq('symbols_per_card', dbGame.symbols_per_card);

        if (cardsError || !allCards || allCards.length === 0) {
            console.error(`[Blink Memory] Error fetching cards for restore:`, cardsError?.message);
            return null;
        }

        const cardsMap = new Map<string, number[]>();
        allCards.forEach(c => cardsMap.set(c.id, c.symbols));

        // Get center card details
        const centerSymbols = cardsMap.get(dbGame.current_center_card) || [];

        // Parse players
        const playersMap = new Map<string, InMemoryBlinkPlayer>();
        const dbPlayers = (dbGame as any).blink_players || [];
        
        const activeCardIds = new Set<string>([dbGame.current_center_card]);

        dbPlayers.forEach((p: any) => {
            const currentCardSymbols = cardsMap.get(p.current_card_id) || [];
            if (p.current_card_id) {
                activeCardIds.add(p.current_card_id);
            }
            playersMap.set(p.user_id, {
                userId: p.user_id,
                name: p.users?.name || 'Player',
                currentCardId: p.current_card_id,
                currentCardSymbols,
                cardsRemaining: p.cards_remaining
            });
        });

        // Reconstruct the remaining deck by excluding card IDs currently held by players or the center card
        const deck = allCards
            .filter(c => !activeCardIds.has(c.id))
            .map(c => ({ id: c.id, symbols: c.symbols }));

        // Count how many people finished (we count from existing results)
        const { data: results } = await supabase
            .from('game_results')
            .select('id')
            .eq('game_id', dbGame.id);
        const winnersCount = results?.length || 0;

        const restoredGame: InMemoryBlinkGame = {
            id: dbGame.id,
            groupId: dbGame.group_id,
            gameCode: code,
            status: dbGame.status,
            symbolsPerCard: dbGame.symbols_per_card,
            cardsPerPlayer: dbGame.cards_per_player,
            prizes: dbGame.prizes || [],
            currentCenterCardId: dbGame.current_center_card,
            currentCenterCardSymbols: centerSymbols,
            players: playersMap,
            deck,
            winnersCount
        };

        activeBlinkGames.set(code, restoredGame);
        console.log(`[Blink Memory] Successfully restored game ${code} in memory with ${restoredGame.deck.length} deck cards remaining.`);
        return restoredGame;
    } catch (e: any) {
        console.error(`[Blink Memory] Failed to restore game from DB:`, e.message || e);
        return null;
    }
};
