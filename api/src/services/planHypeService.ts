import { supabase } from '../lib/supabase';

const MAX_SHOUTOUT = 60;
const MAX_OUTFIT = 60;
const EMOJIS = ['🔥', '🎉', '😄', '❤️', '👀', '✨'];
const DEFAULT_QUESTION = {
    id: 'cancel_last_minute',
    question: 'Who cancels at last minute?',
    selectionType: 'multi_select',
};

const userSelect = 'id, name, avatar_url';

function userName(user: any) {
    return user?.name || 'Member';
}

async function loadUsers(ids: string[]) {
    const unique = Array.from(new Set(ids.filter(Boolean)));
    if (!unique.length) return new Map<string, any>();
    const { data } = await supabase.from('users').select(userSelect).in('id', unique);
    return new Map((data || []).map((u) => [u.id, u]));
}

function trimText(value: string, max: number) {
    const text = String(value || '').trim().replace(/\s+/g, ' ');
    if (text.length < 2) throw Object.assign(new Error('Text is too short'), { status: 400 });
    return text.slice(0, max);
}

export async function fetchPlanHype(planId: string, groupId: string, userId: string) {
    const [membersRes, settingsRes, questionsRes, predictionRes, outfitsRes, shoutoutsRes, reactionsRes, showRes, cancelRes, rsvpsRes, bringRes] =
        await Promise.all([
            supabase.from('group_members').select(`user_id, user:users(${userSelect})`).eq('group_id', groupId),
            supabase.from('plan_hype_settings').select('dress_code').eq('plan_id', planId).maybeSingle(),
            supabase.from('plan_hype_prediction_questions').select('*').eq('is_active', true).order('sort_order'),
            supabase.from('plan_hype_prediction_votes').select('*').eq('plan_id', planId),
            supabase.from('plan_hype_outfits').select('*').eq('plan_id', planId).order('updated_at'),
            supabase.from('plan_hype_shoutouts').select('*').eq('plan_id', planId).order('created_at'),
            supabase.from('plan_hype_shoutout_reactions').select('*').eq('plan_id', planId),
            supabase.from('plan_hype_show_votes').select('*').eq('plan_id', planId),
            supabase.from('plan_hype_cancel_bets').select('*').eq('plan_id', planId),
            supabase.from('plan_rsvps').select('user_id, status, created_at').eq('plan_id', planId),
            supabase.from('plan_bring_items').select('name, claimed_by, created_at').eq('plan_id', planId),
        ]);

    const userIds = [
        ...(outfitsRes.data || []).map((r) => r.user_id),
        ...(shoutoutsRes.data || []).map((r) => r.user_id),
        ...(showRes.data || []).flatMap((r) => [r.voter_id, r.target_user_id]),
        ...(cancelRes.data || []).flatMap((r) => [r.voter_id, r.target_user_id]),
        ...(predictionRes.data || []).flatMap((r) => [r.voter_id, r.target_user_id]),
        ...(rsvpsRes.data || []).map((r) => r.user_id),
        ...(bringRes.data || []).map((r) => r.claimed_by),
    ];
    const users = await loadUsers(userIds);
    const reactions = reactionsRes.data || [];

    return {
        dressCode: settingsRes.data?.dress_code || null,
        predictionQuestions: mapQuestions(questionsRes.data || []),
        predictionVotes: (predictionRes.data || []).map((v: any) => ({
            questionId: v.question_id,
            voterId: v.voter_id,
            voterName: userName(users.get(v.voter_id)),
            targetUserId: v.target_user_id,
            targetName: userName(users.get(v.target_user_id)),
        })),
        members: (membersRes.data || []).map((m: any) => ({
            id: m.user_id,
            name: userName(m.user),
            avatarUrl: m.user?.avatar_url || null,
        })),
        outfits: (outfitsRes.data || []).map((o: any) => ({
            userId: o.user_id,
            name: userName(users.get(o.user_id)),
            text: o.outfit_text,
        })),
        shoutouts: (shoutoutsRes.data || []).map((s: any) => ({
            id: s.id,
            userId: s.user_id,
            name: userName(users.get(s.user_id)),
            message: s.message,
            myReaction: reactions.find((r: any) => r.shoutout_id === s.id && r.user_id === userId)?.emoji || null,
            reactions: EMOJIS.map((emoji) => ({
                emoji,
                count: reactions.filter((r: any) => r.shoutout_id === s.id && r.emoji === emoji).length,
            })).filter((r) => r.count > 0),
        })),
        showVotes: showRes.data || [],
        cancelBets: (cancelRes.data || []).map((b: any) => ({
            voterId: b.voter_id,
            voterName: userName(users.get(b.voter_id)),
            targetUserId: b.target_user_id,
            targetName: userName(users.get(b.target_user_id)),
        })),
        feed: buildFeed(rsvpsRes.data || [], bringRes.data || [], outfitsRes.data || [], users),
    };
}

function mapQuestions(rows: any[]) {
    const mapped = rows.map((q) => ({
        id: q.id,
        question: q.question,
        selectionType: q.selection_type === 'single_select' ? 'single_select' : 'multi_select',
    }));
    return mapped.length ? mapped : [DEFAULT_QUESTION];
}

function buildFeed(rsvps: any[], bring: any[], outfits: any[], users: Map<string, any>) {
    const items = [
        ...rsvps.map((r) => ({ at: r.created_at, text: `${userName(users.get(r.user_id))} said ${r.status === 'maybe' ? 'maybe' : r.status === 'going' ? 'yes' : 'not this time'} 👀` })),
        ...bring.filter((b) => b.claimed_by).map((b) => ({ at: b.created_at, text: `${userName(users.get(b.claimed_by))} is bringing ${b.name}` })),
        ...outfits.map((o) => ({ at: o.updated_at, text: `${userName(users.get(o.user_id))} set their look ✨` })),
    ];
    return items.sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, 8);
}

export async function upsertOutfit(planId: string, groupId: string, userId: string, text: string) {
    const outfit_text = trimText(text, MAX_OUTFIT);
    const { data, error } = await supabase.from('plan_hype_outfits').upsert({
        plan_id: planId, group_id: groupId, user_id: userId, outfit_text, updated_at: new Date().toISOString(),
    }, { onConflict: 'plan_id,user_id' }).select('*').single();
    if (error) throw error;
    return data;
}

export async function upsertDressCode(planId: string, groupId: string, dressCode: string) {
    const { data, error } = await supabase.from('plan_hype_settings').upsert({
        plan_id: planId,
        group_id: groupId,
        dress_code: trimText(dressCode, 40),
        updated_at: new Date().toISOString(),
    }, { onConflict: 'plan_id' }).select('*').single();
    if (error) throw error;
    return data;
}

export async function addShoutout(planId: string, groupId: string, userId: string, message: string) {
    const { data, error } = await supabase.from('plan_hype_shoutouts').insert({
        plan_id: planId, group_id: groupId, user_id: userId, message: trimText(message, MAX_SHOUTOUT),
    }).select('*').single();
    if (error?.code === '23505') throw Object.assign(new Error('You already added your shoutout'), { status: 409 });
    if (error) throw error;
    return data;
}

export async function toggleReaction(planId: string, shoutoutId: string, userId: string, emoji: string) {
    if (!EMOJIS.includes(emoji)) throw Object.assign(new Error('Invalid emoji'), { status: 400 });
    const match = { shoutout_id: shoutoutId, user_id: userId };
    const { data: existing } = await supabase.from('plan_hype_shoutout_reactions').select('emoji').match(match).maybeSingle();
    if (existing?.emoji === emoji) await supabase.from('plan_hype_shoutout_reactions').delete().match(match);
    else await supabase.from('plan_hype_shoutout_reactions').upsert({ ...match, plan_id: planId, emoji }, { onConflict: 'shoutout_id,user_id' });
}

export async function voteShow(planId: string, groupId: string, voterId: string, targetUserId: string, vote: boolean) {
    await supabase.from('plan_hype_show_votes').upsert({ plan_id: planId, group_id: groupId, voter_id: voterId, target_user_id: targetUserId, vote }, { onConflict: 'plan_id,voter_id,target_user_id' });
}

export async function betCancel(planId: string, groupId: string, voterId: string, targetUserId: string) {
    const match = { plan_id: planId, voter_id: voterId, target_user_id: targetUserId };
    const { data: existing } = await supabase.from('plan_hype_cancel_bets').select('id').match(match).maybeSingle();
    if (existing) await supabase.from('plan_hype_cancel_bets').delete().match(match);
    else await supabase.from('plan_hype_cancel_bets').insert({ ...match, group_id: groupId });
}

export async function votePrediction(planId: string, groupId: string, voterId: string, questionId: string, targetUserId: string) {
    const question = await resolvePredictionQuestion(questionId);
    const match = { plan_id: planId, question_id: question.id, voter_id: voterId, target_user_id: targetUserId };
    const { data: existing } = await supabase.from('plan_hype_prediction_votes').select('id').match(match).maybeSingle();
    if (existing) {
        await supabase.from('plan_hype_prediction_votes').delete().match(match);
        return;
    }
    if (question.selectionType === 'single_select') {
        await supabase.from('plan_hype_prediction_votes').delete().match({ plan_id: planId, question_id: question.id, voter_id: voterId });
    }
    await supabase.from('plan_hype_prediction_votes').insert({ ...match, group_id: groupId });
}

async function resolvePredictionQuestion(questionId: string) {
    if (questionId === DEFAULT_QUESTION.id) return DEFAULT_QUESTION;
    const { data } = await supabase
        .from('plan_hype_prediction_questions')
        .select('id, selection_type')
        .eq('id', questionId)
        .eq('is_active', true)
        .maybeSingle();
    if (!data) throw Object.assign(new Error('Prediction question not found'), { status: 404 });
    return { id: data.id, selectionType: data.selection_type };
}
