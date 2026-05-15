import { supabase } from '../lib/supabase';

function generateDobbleDeck(symbolsPerCard: number) {
  const n = symbolsPerCard - 1;

  // Only valid for prime n
  const isPrime = (num: number) => {
    if (num < 2) return false;
    for (let i = 2; i * i <= num; i++) {
      if (num % i === 0) return false;
    }
    return true;
  };

  if (!isPrime(n)) {
    throw new Error(
      `Invalid configuration. symbolsPerCard=${symbolsPerCard} requires n=${n}, which is not prime.`
    );
  }

  const totalSymbols = n * n + n + 1;
  const cards: number[][] = [];

  // --------------------------------------------------
  // First set of cards
  // --------------------------------------------------

  for (let i = 0; i < n + 1; i++) {
    const card = [1];

    for (let j = 0; j < n; j++) {
      card.push(n * i + j + 2);
    }

    cards.push(card);
  }

  // --------------------------------------------------
  // Remaining cards
  // --------------------------------------------------

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const card = [i + 2];

      for (let k = 0; k < n; k++) {
        const value =
          n + 2 +
          n * k +
          ((i * k + j) % n);

        card.push(value);
      }

      cards.push(card);
    }
  }

  return {
    symbolsPerCard,
    totalSymbols,
    totalCards: cards.length,
    cards,
  };
}

function validateDeck(cards: number[][]) {
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      const a = cards[i];
      const b = cards[j];

      const common = a.filter((x) => b.includes(x));

      if (common.length !== 1) {
        return {
          valid: false,
          cardA: i,
          cardB: j,
          common,
        };
      }
    }
  }

  return { valid: true };
}

export async function populateBlinkCards() {
  console.log('[Blink Generator] Starting to generate cards...');

  try {
    // Clear all existing cards
    console.log('[Blink Generator] Clearing existing cards from DB...');
    const { error: deleteError } = await supabase
      .from('blink_cards')
      .delete()
      .neq('id', -1); // Deletes all rows

    if (deleteError) {
      console.error('[Blink Generator] Failed to clear existing cards:', deleteError);
      return;
    }

    const decksToGenerate = [6, 8];

    for (const difficulty of decksToGenerate) {
      console.log(`[Blink Generator] Generating deck for difficulty: ${difficulty}`);
      const deck = generateDobbleDeck(difficulty);

      const validation = validateDeck(deck.cards);
      if (!validation.valid) {
        console.error(`[Blink Generator] Validation failed for difficulty ${difficulty}:`, validation);
        continue;
      }

      console.log(`[Blink Generator] Validation successful. Inserting ${deck.totalCards} cards...`);

      // Prepare for insertion, ensuring we are sending arrays of pure numbers
      const insertData = deck.cards.map(symbolsArray => ({
        difficulty_level: difficulty,
        symbols: symbolsArray.map(s => Number(s))
      }));

      // Insert in batches if necessary, but 6^2+6+1=43 and 8^2+8+1=73 cards are small enough for single bulk insert
      const { error } = await supabase.from('blink_cards').insert(insertData);

      if (error) {
        console.error(`[Blink Generator] Failed to insert cards for difficulty ${difficulty}:`, error);
      } else {
        console.log(`[Blink Generator] Successfully inserted cards for difficulty ${difficulty}`);
      }
    }
    console.log('[Blink Generator] Finished generating cards.');
  } catch (err) {
    console.error('[Blink Generator] Unexpected error:', err);
  }
}
