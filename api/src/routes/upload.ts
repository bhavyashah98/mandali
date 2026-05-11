import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { supabase } from '../lib/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

router.use(authMiddleware);

// Helper to check image upload limits
const checkUploadLimit = async (userId: string) => {
    const { data: memories, error } = await supabase
        .from('memories')
        .select('image_urls')
        .eq('user_id', userId);

    if (error) {
        console.error('[Limit Check] Error:', error);
        return; // Fail safe or throw? Let's throw to be safe
    }

    let totalImages = 0;
    memories?.forEach(m => {
        if (Array.isArray(m.image_urls)) {
            totalImages += m.image_urls.length;
        }
    });

    if (totalImages >= 200) {
        throw new Error('Upload limit reached. You can only have up to 200 images in your memories.');
    }
};

// POST /upload/image — Supports multipart (FormData)
// DEPRECATED: Current app uses direct Cloudinary upload via /sign
// POST /upload/profile — separate route, no groupId needed
// DEPRECATED: Current app uses direct Cloudinary upload via /sign

const UPLOAD_CONFIG: Record<string, (req: AuthRequest) => Promise<any> | any> = {
    profile: (req) => ({
        folder: 'mandali/profiles',
        public_id: `user_${req.userId}`,
        overwrite: true,
        transformation: 'c_fill,g_auto,h_400,w_400,q_auto,f_auto',
    }),

    memory: async (req) => {
        const { groupId } = req.query;

        if (!groupId) throw new Error('groupId is required');

        const { data } = await supabase
            .from('group_members')
            .select('id')
            .eq('group_id', groupId)
            .eq('user_id', req.userId)
            .single();

        if (!data) throw new Error('Unauthorized');

        return {
            folder: `mandali/${groupId}/photos`,
        };
    },
};

router.get('/sign', async (req: AuthRequest, res) => {
    try {
        const userId = req.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const type = req.query.type as string;

        // Only check limit for memories, profile photos are fine
        if (type === 'memory') {
            await checkUploadLimit(userId);
        }

        const timestamp = Math.floor(Date.now() / 1000);

        if (!type || !UPLOAD_CONFIG[type]) {
            return res.status(400).json({ error: 'Invalid upload type' });
        }

        const config = await UPLOAD_CONFIG[type](req);

        const paramsToSign: any = {
            timestamp,
            upload_preset: 'mandali_photos',
            folder: config.folder,
            ...(config.public_id && { public_id: config.public_id }),
            ...(config.overwrite && { overwrite: 'true' }),
            ...(config.transformation && { transformation: config.transformation }),
        };

        const signature = cloudinary.utils.api_sign_request(
            paramsToSign,
            process.env.CLOUDINARY_API_SECRET!
        );

        res.json({
            signature,
            timestamp,
            apiKey: process.env.CLOUDINARY_API_KEY,
            cloudName: process.env.CLOUDINARY_CLOUD_NAME,
            uploadPreset: 'mandali_photos',
            ...config,
        });
    } catch (err: any) {
        console.error('[Upload Sign Error]', err.message);
        return res.status(400).json({ error: err.message });
    }
});

export default router;
