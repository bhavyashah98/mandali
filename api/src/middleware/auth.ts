import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabase';

export interface AuthRequest extends Request {
    userId?: string;
    userPhone?: string;
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; phone: string };
        
        // Validate user status in Supabase
        const { data: user } = await supabase
            .from('users')
            .select('status')
            .eq('id', decoded.userId)
            .single();

        if (user && (user.status === 'banned' || user.status === 'suspended')) {
            return res.status(403).json({ error: 'Your account has been suspended for violating Community Guidelines.' });
        }

        req.userId = decoded.userId;
        req.userPhone = decoded.phone;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};
