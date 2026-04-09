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
            // First time registration
            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert({ phone, name: '' })
                .select()
                .single();
            
            if (createError) throw createError;
            user = newUser;
        }

        // Step 3 — Issue Mandali JWT
        const token = jwt.sign(
            { userId: user.id, phone: user.phone },
            process.env.JWT_SECRET!,
            { expiresIn: '90d' }
        );

        res.json({
            token,
            user,
            isNewUser 
        });
    } catch (error: any) {
        console.error('[AuthVerify] Error:', error);
        res.status(500).json({ error: error.message || 'Internal authentication error' });
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
            console.error('[ProfileUpdate] Supabase Error:', updateError);
            return res.status(400).json({ error: 'Failed to update profile record' });
        }

        res.json({ success: true, user: updatedUser });
    } catch (err: any) {
        console.error('[ProfileUpdate] JWT/Server Error:', err);
        res.status(401).json({ error: 'Session expired or invalid. Please login again.' });
    }
});

export default router;