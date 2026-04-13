import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
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

// POST /upload/image — Supports both multipart (FormData) and base64
router.post('/image', upload.single('image'), async (req: AuthRequest, res) => {
    try {
        const groupId = req.query.groupId as string;
        console.log(`[Upload] Incoming request: size=${req.file?.size} bytes, content-length=${req.headers['content-length']}`);

        if (!groupId) {
            return res.status(400).json({ error: 'groupId is required' });
        }

        let imageData: string | null = null;

        if (req.file) {
            const base64 = req.file.buffer.toString('base64');
            imageData = `data:${req.file.mimetype};base64,${base64}`;
        } else if (req.body.image) {
            imageData = req.body.image;
        }

        if (!imageData) {
            return res.status(400).json({ error: 'No image provided' });
        }

        const uploadResponse = await cloudinary.uploader.upload(imageData, {
            upload_preset: 'mandali_photos',
            folder: `mandali/${groupId}/photos`,
            resource_type: 'auto',
            transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        });

        res.json({
            url: uploadResponse.secure_url,
            publicId: uploadResponse.public_id,
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

        const base64 = req.file.buffer.toString('base64');
        const imageData = `data:${req.file.mimetype};base64,${base64}`;

        const uploadResponse = await cloudinary.uploader.upload(imageData, {
            upload_preset: 'mandali_photos',
            folder: 'mandali/profiles',
            public_id: `user_${userId}`,   // overwrites previous profile photo
            overwrite: true,
            transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'auto' }],
        });

        res.json({
            url: uploadResponse.secure_url,
            publicId: uploadResponse.public_id,
        });

    } catch (err: any) {
        console.error('[Upload] Profile error:', err.message);
        res.status(500).json({ error: err.message || 'Upload failed' });
    }
});

export default router;
