import dotenv from 'dotenv';
import path from 'path';
// Load env vars from api/.env
dotenv.config({ path: path.join(__dirname, '../api/.env') });

import { supabase } from '../api/src/lib/supabase';

async function inspect() {
  console.log('Inspecting Supabase tables...');
  try {
    const { data: plans, error: err1 } = await supabase.from('plans').select('*').limit(1);
    console.log('--- plans ---');
    if (err1) console.error('Error plans:', err1);
    else console.log(plans && plans.length > 0 ? Object.keys(plans[0]) : 'Empty table');

    const { data: plan_rsvps, error: err2 } = await supabase.from('plan_rsvps').select('*').limit(1);
    console.log('--- plan_rsvps ---');
    if (err2) console.error('Error plan_rsvps:', err2);
    else console.log(plan_rsvps && plan_rsvps.length > 0 ? Object.keys(plan_rsvps[0]) : 'Empty table');

    const { data: group_members, error: err3 } = await supabase.from('group_members').select('*').limit(1);
    console.log('--- group_members ---');
    if (err3) console.error('Error group_members:', err3);
    else console.log(group_members && group_members.length > 0 ? Object.keys(group_members[0]) : 'Empty table');

    const { data: blink_games, error: err4 } = await supabase.from('blink_games').select('*').limit(1);
    console.log('--- blink_games ---');
    if (err4) console.error('Error blink_games:', err4);
    else console.log(blink_games && blink_games.length > 0 ? Object.keys(blink_games[0]) : 'Empty table');

    const { data: blink_players, error: err5 } = await supabase.from('blink_players').select('*').limit(1);
    console.log('--- blink_players ---');
    if (err5) console.error('Error blink_players:', err5);
    else console.log(blink_players && blink_players.length > 0 ? Object.keys(blink_players[0]) : 'Empty table');

    const { data: memories, error: err6 } = await supabase.from('memories').select('*').limit(1);
    console.log('--- memories ---');
    if (err6) console.error('Error memories:', err6);
    else console.log(memories && memories.length > 0 ? Object.keys(memories[0]) : 'Empty table');

    const { data: memory_reactions, error: err7 } = await supabase.from('memory_reactions').select('*').limit(1);
    console.log('--- memory_reactions ---');
    if (err7) console.error('Error memory_reactions:', err7);
    else console.log(memory_reactions && memory_reactions.length > 0 ? Object.keys(memory_reactions[0]) : 'Empty table');

  } catch (e) {
    console.error('Unexpected error:', e);
  }
}

inspect();
