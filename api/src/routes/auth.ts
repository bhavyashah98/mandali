import express from 'express';
import jwt from 'jsonwebtoken';
import { verifyFirebaseToken } from '../lib/firebase';
import { supabase } from '../lib/supabase';

const router = express.Router();

router.post('/verify', async (req, res) => {
    const { firebaseToken, phone } = req.body;

    // Step 1 — Verify Firebase token is real
    const decoded = await verifyFirebaseToken(firebaseToken);

    if (!decoded) {
        return res.status(401).json({ error: 'Invalid token' });
    }

    // Step 2 — Find or create user in Supabase
    let { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('phone', phone)
        .single();

    const isNewUser = !user;

    console.log(isNewUser);
    if (!user) {
        const { data: newUser } = await supabase
            .from('users')
            .insert({ phone, name: '' })
            .select()
            .single();
        user = newUser;
    }

    // Step 3 — Issue your own JWT
    const token = jwt.sign(
        { userId: user.id, phone: user.phone },
        process.env.JWT_SECRET!,
        { expiresIn: '90d' }
    );

    res.json({
        token,
        user,
        isNewUser // frontend uses this to redirect to profile setup
    });
});

export default router;