import { supabase } from '../lib/supabase';

export async function fetchBringItems(planId: string, userId: string) {
    const { data: items, error } = await supabase
        .from('plan_bring_items')
        .select(`
            id, plan_id, name, added_by, is_pinned, claimed_by, created_at,
            adder:users!added_by(id, name),
            claimer:users!claimed_by(id, name, avatar_url),
            upvotes:plan_bring_item_upvotes(user_id)
        `)
        .eq('plan_id', planId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: true });

    if (error) throw error;

    const formatted = (items || []).map((item: any) => ({
        id: item.id,
        planId: item.plan_id,
        name: item.name,
        addedBy: item.added_by,
        addedByName: item.adder?.name || 'Unknown',
        isPinned: item.is_pinned,
        claimedBy: item.claimed_by || null,
        claimedByName: item.claimer?.name || null,
        claimedByAvatar: item.claimer?.avatar_url || null,
        upvoteCount: (item.upvotes || []).length,
        hasUpvoted: (item.upvotes || []).some((u: any) => u.user_id === userId),
        createdAt: item.created_at,
    }));

    formatted.sort((a: any, b: any) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        const aClaimed = !!a.claimedBy;
        const bClaimed = !!b.claimedBy;
        if (aClaimed !== bClaimed) return aClaimed ? -1 : 1;
        return b.upvoteCount - a.upvoteCount;
    });

    return formatted;
}

export async function addBringItem(planId: string, groupId: string, userId: string, name: string, autoClaim?: boolean) {
    if (!name?.trim() || name.trim().length < 2) {
        throw Object.assign(new Error('Item name must be at least 2 characters'), { status: 400 });
    }

    const { data: item, error } = await supabase
        .from('plan_bring_items')
        .insert({
            plan_id: planId,
            group_id: groupId,
            name: name.trim().slice(0, 40),
            added_by: userId,
            claimed_by: autoClaim ? userId : null,
        })
        .select(`
            id, plan_id, name, added_by, is_pinned, claimed_by, created_at,
            adder:users!added_by(id, name),
            claimer:users!claimed_by(id, name, avatar_url)
        `)
        .single();

    if (error) throw error;

    return {
        id: item.id,
        planId: item.plan_id,
        name: item.name,
        addedBy: item.added_by,
        addedByName: (item as any).adder?.name || 'Unknown',
        isPinned: item.is_pinned,
        claimedBy: item.claimed_by || null,
        claimedByName: (item as any).claimer?.name || null,
        claimedByAvatar: (item as any).claimer?.avatar_url || null,
        upvoteCount: 0,
        hasUpvoted: false,
        createdAt: item.created_at,
    };
}

export async function claimBringItem(planId: string, itemId: string, userId: string) {
    const { data: existing } = await supabase
        .from('plan_bring_items')
        .select('id, claimed_by')
        .eq('id', itemId)
        .eq('plan_id', planId)
        .maybeSingle();

    if (!existing) throw Object.assign(new Error('Item not found'), { status: 404 });
    if (existing.claimed_by && existing.claimed_by !== userId) {
        const { data: claimer } = await supabase.from('users').select('name').eq('id', existing.claimed_by).single();
        throw Object.assign(new Error(`Already claimed by ${claimer?.name || 'someone'}`), { status: 409 });
    }

    const { data: updated, error } = await supabase
        .from('plan_bring_items')
        .update({ claimed_by: userId })
        .eq('id', itemId)
        .select(`id, claimer:users!claimed_by(id, name, avatar_url)`)
        .single();

    if (error) throw error;

    return {
        planId,
        itemId,
        claimedBy: userId,
        claimedByName: (updated as any).claimer?.name || null,
        claimedByAvatar: (updated as any).claimer?.avatar_url || null,
    };
}

export async function unclaimBringItem(planId: string, itemId: string, userId: string) {
    const { error } = await supabase
        .from('plan_bring_items')
        .update({ claimed_by: null })
        .eq('id', itemId)
        .eq('plan_id', planId)
        .eq('claimed_by', userId);

    if (error) throw error;
}

export async function toggleUpvote(planId: string, itemId: string, userId: string) {
    const { data: existing } = await supabase
        .from('plan_bring_item_upvotes')
        .select('user_id')
        .eq('item_id', itemId)
        .eq('user_id', userId)
        .maybeSingle();

    let hasUpvoted: boolean;
    if (existing) {
        await supabase.from('plan_bring_item_upvotes').delete().eq('item_id', itemId).eq('user_id', userId);
        hasUpvoted = false;
    } else {
        await supabase.from('plan_bring_item_upvotes').insert({ item_id: itemId, user_id: userId });
        hasUpvoted = true;
    }

    const { count } = await supabase
        .from('plan_bring_item_upvotes')
        .select('*', { count: 'exact', head: true })
        .eq('item_id', itemId);

    return { planId, itemId, newCount: count || 0, hasUpvoted };
}

export async function deleteBringItem(planId: string, itemId: string) {
    const { data: item } = await supabase
        .from('plan_bring_items')
        .select('id')
        .eq('id', itemId)
        .eq('plan_id', planId)
        .maybeSingle();

    if (!item) throw Object.assign(new Error('Item not found'), { status: 404 });

    await supabase.from('plan_bring_items').delete().eq('id', itemId);
}

export async function pinBringItem(planId: string, itemId: string, userId: string, hostId: string) {
    if (hostId !== userId) {
        throw Object.assign(new Error('Only the host can pin items'), { status: 403 });
    }

    const { data: item } = await supabase.from('plan_bring_items').select('is_pinned').eq('id', itemId).single();
    const newPinned = !item?.is_pinned;
    await supabase.from('plan_bring_items').update({ is_pinned: newPinned }).eq('id', itemId);
    return newPinned;
}
