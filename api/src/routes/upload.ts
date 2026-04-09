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
        let imageData = null;

        // 1. Check if it's a file upload (multer)
        if (req.file) {
            // Convert buffer to base64 for Cloudinary upload
            const base64 = req.file.buffer.toString('base64');
            imageData = `data:${req.file.mimetype};base64,${base64}`;
        } 
        // 2. Check if it's base64 in body
        else if (req.body.image) {
            imageData = req.body.image;
        }

        if (!imageData) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        const uploadResponse = await cloudinary.uploader.upload(imageData, {
            folder: 'mandali/uploads',
            resource_type: 'auto',
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
