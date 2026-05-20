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
        console.log(`[Push] Starting broadcast for group ${groupId}. Sender: ${senderUserId}`);
        
        // 1. Fetch all members of the group excluding the sender
        const { data: members, error } = await supabase
            .from('group_members')
            .select(`
                user_id,
                users (
                    id,
                    name,
                    expo_push_token
                )
            `)
            .eq('group_id', groupId);

        if (error) {
            console.error('[Push] Failed to fetch group members:', error);
            return;
        }

        if (!members || members.length === 0) {
            console.log('[Push] No group members found.');
            return;
        }

        // 3. Extract tokens and ensure uniqueness
        const tokenSet = new Set<string>();
        let skippedCount = 0;
        let senderExcluded = false;

        members.forEach((member: any) => {
            const userId = member.user_id;
            const token = member.users?.expo_push_token;
            const name = member.users?.name || 'Unknown';

            // 1. Exclude sender
            if (String(userId).toLowerCase() === String(senderUserId).toLowerCase()) {
                senderExcluded = true;
                return;
            }

            // 2. Validate token
            if (!token || typeof token !== 'string' || !token.startsWith('ExponentPushToken')) {
                console.log(`[Push] Skipping user ${name} (${userId}): No valid Expo token found.`);
                skippedCount++;
                return;
            }

            tokenSet.add(token);
        });

        const tokens = Array.from(tokenSet);
        console.log(`[Push] Broadcast Summary: 
            - Recipients: ${tokens.length}
            - Sender Excluded: ${senderExcluded}
            - Users Skipped (No Token): ${skippedCount}
        `);

        if (tokens.length === 0) {
            console.log('[Push] No valid tokens to send to. Aborting.');
            return;
        }

        // 4. Send via Expo HTTP API
        const messages = tokens.map(token => ({
            to: token,
            sound: 'default',
            title,
            body,
            data: data || {},
            channelId: 'default',
        }));

        const response = await axios.post('https://exp.host/--/api/v2/push/send', messages, {
            headers: {
                'Accept': 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            }
        });
        
        console.log(`[Push] Successfully sent ${tokens.length} messages to Expo. Response Status: ${response.status}`);
        
    } catch (err: any) {
        console.error('[Push] Fatal Error:', err.response?.data || err.message);
    }
};

export const sendUserPushNotification = async (
    targetUserId: string,
    title: string,
    body: string,
    data?: any
) => {
    try {
        console.log(`[Push] Starting direct push for user ${targetUserId}`);

        const { data: user, error } = await supabase
            .from('users')
            .select('expo_push_token, name')
            .eq('id', targetUserId)
            .single();

        if (error) {
            console.error(`[Push] Failed to fetch user ${targetUserId}:`, error);
            return;
        }

        const token = user?.expo_push_token;
        if (!token || typeof token !== 'string' || !token.startsWith('ExponentPushToken')) {
            console.log(`[Push] User ${user?.name || targetUserId} does not have a valid Expo push token.`);
            return;
        }

        const message = {
            to: token,
            sound: 'default',
            title,
            body,
            data: data || {},
            channelId: 'default',
        };

        const response = await axios.post('https://exp.host/--/api/v2/push/send', [message], {
            headers: {
                'Accept': 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            }
        });

        console.log(`[Push] Successfully sent 1 message to Expo. Response Status: ${response.status}`);
    } catch (err: any) {
        console.error('[Push] Fatal Error sending direct push:', err.response?.data || err.message);
    }
};
