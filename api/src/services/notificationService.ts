import { supabase } from '../lib/supabase';
import { NotificationType } from '../types/notifications';

/**
 * Creates a notification for a specific user.
 */
export const createNotification = async (
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    groupId?: string,
    actorId?: string,
    entityId?: string,
    metadata?: any
) => {
    try {
        const { error } = await supabase.from('notifications').insert({
            user_id: userId,
            actor_id: actorId || null,
            group_id: groupId || null,
            notification_type: type,
            title,
            body,
            entity_id: entityId || null,
            metadata: metadata || {},
        });

        if (error) {
            console.error('[NotificationService] Error creating notification:', error);
        }
    } catch (err) {
        console.error('[NotificationService] Exception creating notification:', err);
    }
};

/**
 * Creates a notification for all members of a group, optionally excluding one user (e.g., the actor).
 */
export const createGroupNotification = async (
    groupId: string,
    type: NotificationType,
    title: string,
    body: string,
    excludeUserId?: string,
    actorId?: string,
    entityId?: string,
    metadata?: any
) => {
    try {
        const { data: members, error } = await supabase
            .from('group_members')
            .select('user_id')
            .eq('group_id', groupId);

        if (error || !members) {
            console.error('[NotificationService] Error fetching group members for notification:', error);
            return;
        }

        const notifications = members
            .filter((m) => m.user_id !== excludeUserId)
            .map((m) => ({
                user_id: m.user_id,
                actor_id: actorId || null,
                group_id: groupId,
                notification_type: type,
                title,
                body,
                entity_id: entityId || null,
                metadata: metadata || {},
            }));

        if (notifications.length > 0) {
            const { error: insertError } = await supabase.from('notifications').insert(notifications);
            if (insertError) {
                console.error('[NotificationService] Error inserting group notifications:', insertError);
            }
        }
    } catch (err) {
        console.error('[NotificationService] Exception creating group notification:', err);
    }
};

/**
 * Creates notifications for specific users (e.g. participants in a hisaab expense).
 */
export const createBulkNotification = async (
    userIds: string[],
    type: NotificationType,
    title: string,
    body: string,
    groupId?: string,
    actorId?: string,
    entityId?: string,
    metadata?: any
) => {
    try {
        if (!userIds || userIds.length === 0) return;

        const notifications = userIds.map((userId) => ({
            user_id: userId,
            actor_id: actorId || null,
            group_id: groupId || null,
            notification_type: type,
            title,
            body,
            entity_id: entityId || null,
            metadata: metadata || {},
        }));

        if (notifications.length > 0) {
            const { error: insertError } = await supabase.from('notifications').insert(notifications);
            if (insertError) {
                console.error('[NotificationService] Error bulk inserting notifications:', insertError);
            }
        }
    } catch (err) {
        console.error('[NotificationService] Exception bulk creating notifications:', err);
    }
};
