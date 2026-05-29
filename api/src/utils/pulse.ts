import { supabase } from '../lib/supabase';

// Helper functions for Group Pulse math and metrics
export function getPulseRank(pulse: number): string {
    if (pulse >= 90) return 'Top 3%';
    if (pulse >= 80) return 'Top 10%';
    if (pulse >= 70) return 'Top 15%';
    if (pulse >= 50) return 'Top 30%';
    if (pulse >= 30) return 'Top 50%';
    return 'Top 80%';
}

export function getPulseRankPercentile(pulse: number): string {
    if (pulse >= 90) return '97%';
    if (pulse >= 80) return '90%';
    if (pulse >= 70) return '85%';
    if (pulse >= 50) return '70%';
    if (pulse >= 30) return '50%';
    return '20%';
}

function getWeekMonday(dateStr: string): string {
    const date = new Date(dateStr);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split('T')[0];
}

export function calculateMeetupStreak(pastPlans: any[]): number {
    if (!pastPlans || pastPlans.length === 0) return 0;

    const meetupWeeks = new Set<string>();
    for (const p of pastPlans) {
        if (p.starts_at) {
            meetupWeeks.add(getWeekMonday(p.starts_at));
        }
    }

    const currentWeekMonday = getWeekMonday(new Date().toISOString());
    const lastWeekMonday = new Date(new Date(currentWeekMonday).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (!meetupWeeks.has(currentWeekMonday) && !meetupWeeks.has(lastWeekMonday)) {
        return 0;
    }

    let streak = 0;
    let checkWeek = meetupWeeks.has(currentWeekMonday) ? currentWeekMonday : lastWeekMonday;
    while (meetupWeeks.has(checkWeek)) {
        streak++;
        const checkDate = new Date(checkWeek);
        checkDate.setDate(checkDate.getDate() - 7);
        checkWeek = checkDate.toISOString().split('T')[0];
    }

    return streak;
}

export async function calculateGroupPulseInternal(groupId: string, now: Date) {
    // 1. Fetch group members
    const { data: members } = await supabase
        .from('group_members')
        .select('user_id, joined_at, last_seen_memories_at')
        .eq('group_id', groupId);

    const total_members = members?.length || 0;

    // 2. Fetch plans
    const { data: plans } = await supabase
        .from('plans')
        .select('id, starts_at, status, created_at')
        .eq('group_id', groupId)
        .neq('status', 'cancelled');

    // 3. Fetch plan RSVPs
    let plan_rsvps: any[] = [];
    if (plans && plans.length > 0) {
        const planIds = plans.map(p => p.id);
        const { data: rsvps } = await supabase
            .from('plan_rsvps')
            .select('plan_id, user_id, status, created_at')
            .in('plan_id', planIds);
        plan_rsvps = rsvps || [];
    }

    // 4. Fetch blink games
    const { data: games } = await supabase
        .from('blink_games')
        .select('id, created_at, ended_at')
        .eq('group_id', groupId);

    // 5. Fetch blink players
    let blink_players: any[] = [];
    if (games && games.length > 0) {
        const gameIds = games.map(g => g.id);
        const { data: players } = await supabase
            .from('blink_players')
            .select('game_id, user_id, joined_at')
            .in('game_id', gameIds);
        blink_players = players || [];
    }

    // 6. Fetch memories
    const { data: memories } = await supabase
        .from('memories')
        .select('id, user_id, story, created_at')
        .eq('group_id', groupId)
        .eq('is_hidden', false);

    // 7. Fetch memory reactions
    let memory_reactions: any[] = [];
    if (memories && memories.length > 0) {
        const memoryIds = memories.map(m => m.id);
        const { data: reactions } = await supabase
            .from('memory_reactions')
            .select('memory_id, user_id, created_at')
            .in('memory_id', memoryIds);
        memory_reactions = reactions || [];
    }

    return computePulseFromFetchedData({
        members: members || [],
        plans: plans || [],
        plan_rsvps,
        games: games || [],
        blink_players,
        memories: memories || [],
        memory_reactions,
        now
    });
}

interface FetchedPulseData {
    members: any[];
    plans: any[];
    plan_rsvps: any[];
    games: any[];
    blink_players: any[];
    memories: any[];
    memory_reactions: any[];
    now: Date;
}

function computePulseFromFetchedData(data: FetchedPulseData) {
    const { members, plans, plan_rsvps, games, blink_players, memories, memory_reactions, now } = data;

    const total_members = members.length;
    const nowTime = now.getTime();

    const getDaysAgo = (dateStr: string) => {
        const diff = nowTime - new Date(dateStr).getTime();
        return Math.max(0, diff / (1000 * 60 * 60 * 24));
    };

    // 1. active_members_last_30d
    const activeUserIds = new Set<string>();
    const thirtyDaysAgo = nowTime - 30 * 24 * 60 * 60 * 1000;

    for (const m of members) {
        const joinedAt = new Date(m.joined_at).getTime();
        if (joinedAt >= thirtyDaysAgo && joinedAt <= nowTime) {
            activeUserIds.add(m.user_id);
        }
        if (m.last_seen_memories_at) {
            const lastSeen = new Date(m.last_seen_memories_at).getTime();
            if (lastSeen >= thirtyDaysAgo && lastSeen <= nowTime) {
                activeUserIds.add(m.user_id);
            }
        }
    }

    for (const r of plan_rsvps) {
        const createdAt = new Date(r.created_at).getTime();
        if (createdAt >= thirtyDaysAgo && createdAt <= nowTime) {
            activeUserIds.add(r.user_id);
        }
    }

    for (const p of blink_players) {
        const joinedAt = new Date(p.joined_at).getTime();
        if (joinedAt >= thirtyDaysAgo && joinedAt <= nowTime) {
            activeUserIds.add(p.user_id);
        }
    }

    for (const m of memories) {
        const createdAt = new Date(m.created_at).getTime();
        if (createdAt >= thirtyDaysAgo && createdAt <= nowTime) {
            activeUserIds.add(m.user_id);
        }
    }

    for (const r of memory_reactions) {
        const createdAt = new Date(r.created_at).getTime();
        if (createdAt >= thirtyDaysAgo && createdAt <= nowTime) {
            activeUserIds.add(r.user_id);
        }
    }

    const active_members_last_30d = activeUserIds.size;

    // 2. plans_raw
    let plans_raw = 0;
    const relevantPlans = plans.filter(p => new Date(p.starts_at).getTime() <= nowTime);

    for (const p of relevantPlans) {
        const startsAt = new Date(p.starts_at);
        const days_ago = getDaysAgo(p.starts_at);

        const plan_created = 1;
        const plan_completed = (p.status === 'past' || startsAt.getTime() < nowTime) ? 1 : 0;

        const rsvps = plan_rsvps.filter(r => r.plan_id === p.id && r.status === 'going' && new Date(r.created_at).getTime() <= nowTime);
        const rsvp_count = rsvps.length;

        const max_members_denom = Math.max(total_members, 4);
        const participation_ratio = Math.sqrt(rsvp_count / max_members_denom);

        const plan_score = (10 * plan_created + 5 * plan_completed) * participation_ratio + 3 * rsvp_count;
        plans_raw += plan_score * Math.exp(-0.03 * days_ago);
    }

    // 3. games_raw
    let games_raw = 0;
    const relevantGames = games.filter(g => new Date(g.created_at).getTime() <= nowTime);
    relevantGames.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    for (let i = 0; i < relevantGames.length; i++) {
        const g = relevantGames[i];
        const createdAt = new Date(g.created_at);
        const days_ago = getDaysAgo(g.created_at);

        const game_played = 1;
        const playersCount = blink_players.filter(p => p.game_id === g.id && new Date(p.joined_at).getTime() <= nowTime).length;

        let rematch = 0;
        if (i > 0) {
            const prevGame = relevantGames[i - 1];
            const timeDiff = createdAt.getTime() - new Date(prevGame.created_at).getTime();
            if (timeDiff > 0 && timeDiff <= 3 * 60 * 60 * 1000) {
                rematch = 1;
            }
        }

        const game_score = 8 * game_played + 2 * Math.max(0, playersCount - 2) + 3 * rematch;
        games_raw += game_score * Math.exp(-0.03 * days_ago);
    }

    // 4. memories_raw
    let memories_raw = 0;
    const relevantMemories = memories.filter(m => new Date(m.created_at).getTime() <= nowTime);

    for (const m of relevantMemories) {
        const days_ago = getDaysAgo(m.created_at);

        const unique_uploaders = 1;
        const reactions = memory_reactions.filter(r => r.memory_id === m.id && new Date(r.created_at).getTime() <= nowTime);
        const uniqueReactorsSet = new Set(reactions.map(r => r.user_id));
        const unique_reactors = uniqueReactorsSet.size;

        const hasCaption = (m.story && m.story.trim().length > 0) ? 1 : 0;

        const memory_score = 5 * unique_uploaders + 1 * unique_reactors + 2 * hasCaption;
        memories_raw += memory_score * Math.exp(-0.03 * days_ago);
    }

    // 5. weighted
    const weighted = 0.55 * plans_raw + 0.25 * games_raw + 0.20 * memories_raw;

    // 6. breadth
    const max_members_denom = Math.max(total_members, 4);
    const breadth = Math.sqrt(active_members_last_30d / max_members_denom);

    // 7. raw_pulse
    const raw_pulse = weighted * breadth;

    // 8. pulse
    const pulse = 100 * (1 - Math.exp(-raw_pulse / 100));

    return {
        pulse: Math.round(pulse),
        active_members_last_30d,
        total_members,
        plans,
        plan_rsvps,
        memories
    };
}
