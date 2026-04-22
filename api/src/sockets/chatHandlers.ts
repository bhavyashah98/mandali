import { Server, Socket } from 'socket.io';
import { supabase } from '../lib/supabase';
import { sendGroupPushNotification } from '../lib/push';

export const registerChatHandlers = (io: Server, socket: Socket, onlineUsers: Map<string, string>) => {
    const userId = (socket as any).userId;

    socket.on('send_message', async (data) => {
        const { group_id, content, type = 'text', media_url, reply_to_id } = data;
        
        try {
            // 1. Save to DB
            const { data: message, error } = await supabase
                .from('messages')
                .insert({
                    group_id,
                    sender_id: userId,
                    content,
                    type,
                    media_url,
                    reply_to_id
                })
                .select(`
                    *,
                    sender:users(id, name, avatar_url),
                    reply_to:messages(id, content, sender:users(name))
                `)
                .single();

            if (error) throw error;

            // 2. Broadcast to room
            io.to(group_id).emit('new_message', message);

            // 3. Trigger Push Notifications
            const { data: group } = await supabase.from('groups').select('name').eq('id', group_id).single();
            
            await sendGroupPushNotification(
                group_id,
                userId,
                group?.name || 'New Message',
                `${message.sender?.name}: ${type === 'text' ? content : 'shared a photo'}`,
                { group_id, feature: 'chat' }
            );

        } catch (err) {
            console.error('[Socket] send_message error:', err);
        }
    });

    socket.on('typing', (data) => {
        const { group_id, isTyping } = data;
        socket.to(group_id).emit('user_typing', { group_id, userId, isTyping });
    });

    socket.on('mark_read', async (data) => {
        const { group_id, message_id } = data;
        try {
            await supabase.from('message_reads').upsert({
                message_id,
                user_id: userId,
                read_at: new Date().toISOString()
            }, { onConflict: 'message_id,user_id' });
            
            socket.to(group_id).emit('read_receipt', { group_id, message_id, userId });
        } catch (err) {
            console.error('[Socket] mark_read error:', err);
        }
    });

    socket.on('add_reaction', async (data) => {
        const { message_id, emoji, group_id } = data;
        try {
            const { data: reaction, error } = await supabase.from('message_reactions').upsert({
                message_id,
                user_id: userId,
                emoji
            }, { onConflict: 'message_id,user_id,emoji' }).select().single();

            if (!error) {
                io.to(group_id).emit('reaction_update', { message_id, userId, emoji, action: 'added' });
            }
        } catch (err) {
            console.error('[Socket] reaction error:', err);
        }
    });

    socket.on('delete_message', async (data) => {
        const { message_id, group_id } = data;
        try {
            const { error } = await supabase.from('messages').update({ is_deleted: true, content: null, media_url: null }).eq('id', message_id).eq('sender_id', userId);
            if (!error) {
                io.to(group_id).emit('message_deleted', { message_id, group_id });
            }
        } catch (err) {
            console.error('[Socket] delete error:', err);
        }
    });
};
