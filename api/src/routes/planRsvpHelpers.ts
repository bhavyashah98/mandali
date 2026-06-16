import { supabase } from '../lib/supabase';

export type PlanRsvpStatus = 'going' | 'maybe' | 'cant_go';

export interface PlanRsvpUserDto {
    userId: string;
    name: string;
    avatarUrl?: string | null;
    status: PlanRsvpStatus;
    note?: string | null;
}

function mapRsvpRow(row: any, userById: Map<string, any>): PlanRsvpUserDto {
    const user = userById.get(row.user_id);
    return {
        userId: row.user_id,
        name: user?.name || 'Member',
        avatarUrl: user?.avatar_url ?? null,
        status: row.status,
        note: row.note ?? null,
    };
}

export async function loadRsvpsByPlanIds(planIds: string[]): Promise<Record<string, PlanRsvpUserDto[]>> {
    if (!planIds.length) return {};

    const { data, error } = await supabase
        .from('plan_rsvps')
        .select('plan_id, status, note, user_id')
        .in('plan_id', planIds);

    if (error) {
        console.warn('[Plans] loadRsvpsByPlanIds:', error.message);
        return {};
    }

    const userIds = Array.from(new Set((data || []).map((row) => row.user_id).filter(Boolean)));
    const userById = new Map<string, any>();

    if (userIds.length > 0) {
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, name, avatar_url')
            .in('id', userIds);

        if (usersError) {
            console.warn('[Plans] loadRsvpsByPlanIds users:', usersError.message);
        } else {
            for (const user of users || []) {
                userById.set(user.id, user);
            }
        }
    }

    const map: Record<string, PlanRsvpUserDto[]> = {};
    for (const row of data || []) {
        const dto = mapRsvpRow(row, userById);
        if (!map[row.plan_id]) map[row.plan_id] = [];
        map[row.plan_id].push(dto);
    }
    return map;
}

export async function loadMyRsvp(planId: string, userId: string) {
    const { data } = await supabase
        .from('plan_rsvps')
        .select('status, note')
        .eq('plan_id', planId)
        .eq('user_id', userId)
        .maybeSingle();
    return data;
}

export async function insertHostRsvp(planId: string, userId: string) {
    const { error } = await supabase.from('plan_rsvps').insert({
        plan_id: planId,
        user_id: userId,
        status: 'going',
    });
    if (error) console.warn('[Plans] insertHostRsvp:', error.message);
}

export function goingFromRsvps(rsvps: PlanRsvpUserDto[] | undefined) {
    return (rsvps || []).filter((r) => r.status === 'going');
}

/** Host/creator is always counted as going (min 1) even if RSVP row is missing. */
export function ensureCreatorInGoing(
    going: PlanRsvpUserDto[],
    createdBy: string | null | undefined,
    creatorName: string | null | undefined,
    creatorAvatarUrl: string | null | undefined
): PlanRsvpUserDto[] {
    if (!createdBy) return going;

    if (going.some((g) => g.userId === createdBy)) return going;

    return [
        {
            userId: createdBy,
            name: creatorName?.trim() || 'Host',
            avatarUrl: creatorAvatarUrl ?? null,
            status: 'going',
        },
        ...going,
    ];
}

export function formatPlanPayload(
    row: any,
    status: 'upcoming' | 'live' | 'past',
    userId: string,
    rsvps: PlanRsvpUserDto[] | undefined,
    myRsvpRow: { status: PlanRsvpStatus; note?: string | null } | null | undefined
) {
    const group = row.group;
    const creatorName = row.creator?.name ?? null;
    const creatorAvatarUrl = row.creator?.avatar_url ?? null;
    const createdBy = row.created_by as string | null;
    const isHost = createdBy === userId;

    const going = goingFromRsvps(rsvps);

    const myRsvp =
        myRsvpRow != null
            ? { status: myRsvpRow.status, note: myRsvpRow.note ?? null }
            : isHost
              ? { status: 'going' as PlanRsvpStatus, note: null }
              : null;

    return {
        id: row.id,
        groupId: row.group_id,
        groupName: group?.name || 'Mandali',
        groupDescription: group?.description ?? null,
        groupCoverUrl: group?.cover_photo_url ?? null,
        activityId: row.activity_id,
        activityLabel: row.activity_label,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        location: row.location,
        placeId: row.place_id ?? null,
        placePhotoUrl: row.place_photo_url ?? null,
        createdBy,
        creatorName,
        creatorAvatarUrl,
        status,
        going,
        goingCount: going.length,
        myRsvp,
        isHost,
        hasRsvp: !!myRsvp,
        description: row.description ?? null,
    };
}
