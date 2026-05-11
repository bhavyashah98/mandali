import express from 'express';
import jwt from 'jsonwebtoken';
import { verifyFirebaseToken } from '../lib/firebase';
import { supabase } from '../lib/supabase';

const router = express.Router();

// Handle OTP Verification - Login or Signup
router.post('/verify', async (req, res) => {
    const { firebaseToken, phone } = req.body;

    try {
        // Step 1 — Verify Firebase token
        const decoded = await verifyFirebaseToken(firebaseToken);
        if (!decoded) {
            console.error(`[AuthVerify] Firebase verification failed for ${phone}`);
            return res.status(401).json({ error: 'Invalid authentication from provider' });
        }

        // Step 2 — Find or create user in Supabase
        let { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('phone', phone)
            .single();

        const isNewUser = !user;

        if (!user) {
            console.log(`[AuthVerify] Creating new user for ${phone}`);
            // First time registration
            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert({ phone, name: '' })
                .select()
                .single();
            
            if (createError) {
                console.error(`[AuthVerify] Signup error for ${phone}:`, createError);
                throw createError;
            }
            user = newUser;
        }

        // Step 3 — Issue Mandali JWT
        const token = jwt.sign(
            { userId: user.id, phone: user.phone },
            process.env.JWT_SECRET!,
            { expiresIn: '90d' }
        );

        console.log(`[AuthVerify] Success for ${phone}. New token issued for user ${user.id}.`);

        res.json({
            token,
            user,
            isNewUser 
        });
    } catch (error: any) {
        console.error('[AuthVerify] Critical Error:', error);
        res.status(500).json({ error: error.message || 'Internal authentication error' });
    }
});

/**
 * GET /auth/me
 * Restores session by verifying JWT and returning full user profile
 */
router.get('/me', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        console.warn('[AuthMe] No auth header provided');
        return res.status(401).json({ error: 'No authorization token provided' });
    }

    try {
        const token = authHeader.split(' ')[1];
        if (!token) throw new Error('Token missing from header');

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        const userId = decoded.userId;

        console.log(`[AuthMe] Restoring session for userId: ${userId}`);

        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !user) {
            console.error(`[AuthMe] User ${userId} not found in database:`, error);
            return res.status(404).json({ error: 'User not found' });
        }

        console.log(`[AuthMe] Session restored for ${user.phone}`);
        res.json(user);
    } catch (err: any) {
        console.error('[AuthMe] Verification failed:', err.message);
        res.status(401).json({ error: 'Session expired or invalid. Please login again.' });
    }
});

// Update Profile - Used during onboarding
router.patch('/profile', async (req, res) => {
    const { name, birthday, avatar_url } = req.body;
    const authHeader = req.headers.authorization;
    
    if (!authHeader) return res.status(401).json({ error: 'No authorization token provided' });
    
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        const userId = decoded.userId;

        console.log(`[ProfileUpdate] Updating profile for user: ${userId}`);

        const updateData: any = { name, birthday };
        if (avatar_url) {
            updateData.avatar_url = avatar_url;
        }

        const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', userId)
            .select()
            .single();

        if (updateError) {
            console.error(`[ProfileUpdate] Supabase Error for user ${userId}:`, updateError);
            return res.status(400).json({ error: 'Failed to update profile record' });
        }

        res.json({ success: true, user: updatedUser });
    } catch (err: any) {
        console.error('[ProfileUpdate] JWT/Server Error:', err);
        res.status(401).json({ error: 'Session expired or invalid. Please login again.' });
    }
});

// Delete Profile - Required for App Store Compliance
router.delete('/profile', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No authorization token provided' });
    
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        const userId = decoded.userId;

        console.log(`[ProfileDelete] Deleting user: ${userId}`);

        // Note: With Supabase, ensuring foreign keys have ON DELETE CASCADE setup handles child records (like group_members).
        const { error: deleteError } = await supabase
            .from('users')
            .delete()
            .eq('id', userId);

        if (deleteError) {
            console.error(`[ProfileDelete] Supabase Error for user ${userId}:`, deleteError);
            return res.status(400).json({ error: 'Failed to delete profile record' });
        }

        res.json({ success: true, message: 'Account permanently deleted' });
    } catch (err: any) {
        console.error('[ProfileDelete] JWT/Server Error:', err);
        res.status(401).json({ error: 'Session expired or invalid. Please login again.' });
    }
});

// Register Push Token
router.post('/push-token', async (req, res) => {
    const { push_token } = req.body;
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No authorization token provided' });
    
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        const userId = decoded.userId;

        console.log(`[PushTokenUpdate] Registering token for user: ${userId}`);

        const { error: updateError } = await supabase
            .from('users')
            .update({ expo_push_token: push_token })
            .eq('id', userId);

        if (updateError) {
            console.error(`[PushTokenUpdate] Supabase Error for user ${userId}:`, updateError);
            return res.status(400).json({ error: 'Failed to save push token' });
        }

        res.json({ success: true });
    } catch (err: any) {
        console.error('[PushTokenUpdate] JWT/Server Error:', err);
        res.status(401).json({ error: 'Session expired or invalid.' });
    }
});

export default router;