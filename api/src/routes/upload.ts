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

// Using memory storage for simplicity and to avoid 'multer-storage-cloudinary' type issues
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

router.use(authMiddleware);

// POST /upload/image — Use multipart form-data
router.post('/image', (req, res, next) => {
    upload.single('image')(req, res, (err) => {
        if (err) {
            console.error('[Upload] Multer error:', err.message);
            return res.status(400).json({ error: `Upload error: ${err.message}` });
        }
        next();
    });
}, async (req: AuthRequest, res) => {
    try {
        // Fallback: If multer missed it but it's in the body (as base64/URI)
        let imageData = null;

        if (!req.body.image) {
            console.warn('[Upload] No image data found in file or body. Body keys:', Object.keys(req.body));
            return res.status(400).json({ error: 'No image file provided' });
        }

        imageData = req.body.image;

        const uploadResponse = await cloudinary.uploader.upload(imageData, {
            folder: 'mandali/groups',
            resource_type: 'image',
        });

        res.json({
            url: uploadResponse.secure_url,
            publicId: uploadResponse.public_id,
        });
    } catch (err: any) {
        console.error('[Upload] Cloudinary upload error:', err.message);
        res.status(500).json({ error: 'Failed to upload image' });
    }
});

export default router;
