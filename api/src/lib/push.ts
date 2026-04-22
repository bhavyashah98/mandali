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

        console.log(`[Push] Found ${members?.length || 0} potential recipients for group ${groupId}`);
        if (!members || members.length === 0) return;

        // 2. Extract tokens and ensure uniqueness
        const tokenSet = new Set<string>();
        members.forEach((member: any) => {
            // Strict equality check (handles string vs uuid object if necessary)
            if (String(member.user_id) === String(senderUserId)) {
                return;
            }

            const token = member.users?.expo_push_token;
            if (token && typeof token === 'string' && token.startsWith('ExponentPushToken')) {
                tokenSet.add(token);
            }
        });

        const tokens = Array.from(tokenSet);
        console.log(`[Push] Prepared ${tokens.length} unique tokens for broadcast (Sender: ${senderUserId})`);

        if (tokens.length === 0) {
            return;
        }

        // 3. Send via Expo HTTP API (No SDK required!)
        const messages = tokens.map(token => ({
            to: token,
            sound: 'default',
            title,
            body,
            data: data || {},
            // Android-specific: Must match channel set in the app
            channelId: 'default',
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
