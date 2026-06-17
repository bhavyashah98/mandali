import { supabase } from '../lib/supabase';

export async function assertGroupMember(groupId: string, userId: string): Promise<boolean> {
    const { data } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .maybeSingle();
    return !!data;
}

export async function loadPlanAndAssertMember(planId: string, userId: string) {
    const { data: plan, error } = await supabase
        .from('plans')
        .select('id, group_id, created_by, starts_at, ends_at, status')
        .eq('id', planId)
        .maybeSingle();
    if (error || !plan) throw Object.assign(new Error('Plan not found'), { status: 404 });
    
    const isMember = await assertGroupMember(plan.group_id, userId);
    if (!isMember) throw Object.assign(new Error('Not a group member'), { status: 403 });
    
    return plan;
}
