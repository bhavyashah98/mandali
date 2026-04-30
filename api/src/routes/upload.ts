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

// POST /upload/image — Supports multipart (FormData)
router.post('/image', upload.single('image'), async (req: AuthRequest, res) => {
    try {
        const groupId = req.query.groupId as string;

        if (!groupId) {
            return res.status(400).json({ error: 'groupId is required' });
        }

        let result: any;

        if (req.file) {
            // New fast path: Use stream upload for better performance and memory efficiency
            const streamUpload = (buffer: Buffer) => {
                return new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        {
                            upload_preset: 'mandali_photos',
                            folder: `mandali/${groupId}/photos`,
                            resource_type: 'auto',
                            transformation: [{ quality: 'auto', fetch_format: 'auto' }],
                        },
                        (error, result) => {
                            if (result) resolve(result);
                            else reject(error);
                        }
                    );
                    stream.end(buffer);
                });
            };
            result = await streamUpload(req.file.buffer);
        } else if (req.body.image) {
            // Fallback for older deployed frontends that might send base64 directly
            result = await cloudinary.uploader.upload(req.body.image, {
                upload_preset: 'mandali_photos',
                folder: `mandali/${groupId}/photos`,
                resource_type: 'auto',
                transformation: [{ quality: 'auto', fetch_format: 'auto' }],
            });
        } else {
            return res.status(400).json({ error: 'No image provided' });
        }

        res.json({
            url: result.secure_url,
            publicId: result.public_id,
        });

    } catch (err: any) {
        console.error('[Upload] Error:', err.message);
        res.status(500).json({ error: err.message || 'Upload failed' });
    }
});

// POST /upload/profile — separate route, no groupId needed
router.post('/profile', upload.single('image'), async (req: AuthRequest, res) => {
    try {
        const userId = req.userId;

        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No image provided' });
        }

        const streamUpload = (buffer: Buffer) => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    {
                        upload_preset: 'mandali_photos',
                        folder: 'mandali/profiles',
                        public_id: `user_${userId}`,
                        overwrite: true,
                        transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'auto' }],
                    },
                    (error, result) => {
                        if (result) resolve(result);
                        else reject(error);
                    }
                );
                stream.end(buffer);
            });
        };

        const result: any = await streamUpload(req.file.buffer);

        res.json({
            url: result.secure_url,
            publicId: result.public_id,
        });

    } catch (err: any) {
        console.error('[Upload] Profile error:', err.message);
        res.status(500).json({ error: err.message || 'Upload failed' });
    }
});

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
        const type = req.query.type as string;
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
