import axios from 'axios';
import { supabase } from './supabase';

export const sendGroupPushNotification = async (
    groupId: string,
    senderUserId: string,
    title: string,
    body: string,
    data?: any
) => {
    try {
        // 1. Fetch all members of the group excluding the sender
        const { data: members, error } = await supabase
            .from('group_members')
            .select(`
                user_id,
                users (
                    expo_push_token
                )
            `)
            .eq('group_id', groupId)
            .neq('user_id', senderUserId);

        if (error) {
            console.error('[Push] Failed to fetch group members:', error);
            return;
        }

        if (!members || members.length === 0) return;

        // 2. Extract tokens
        const tokens: string[] = [];
        members.forEach((member: any) => {
            const token = member.users?.expo_push_token;
            if (token && typeof token === 'string' && token.startsWith('ExponentPushToken')) {
                tokens.push(token);
            }
        });

        if (tokens.length === 0) return;

        // 3. Send via Expo HTTP API (No SDK required!)
        const messages = tokens.map(token => ({
            to: token,
            sound: 'default',
            title,
            body,
            data: data || {},
        }));

        await axios.post('https://exp.host/--/api/v2/push/send', messages, {
            headers: {
                'Accept': 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            }
        });
        
    } catch (err: any) {
        console.error('[Push] Failed to send notification:', err.message);
    }
};
