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

router.get('/sign', async (req: AuthRequest, res) => {
    try {
        const { type, groupId } = req.query;
        const timestamp = Math.floor(Date.now() / 1000);

        const paramsToSign: any = {
            timestamp,
            allowed_formats: 'jpg,jpeg,png,webp',
            max_file_size: 5000000,
        };

        let targetFolder = '';
        let targetPublicId = '';
        let targetTransformation = '';

        if (type === 'profile') {
            targetFolder = 'mandali/profiles';
            targetPublicId = `user_${req.userId}`;
            paramsToSign.overwrite = true;
            // Apply Cloudinary's AI face-cropping during the direct upload
            targetTransformation = 'c_fill,g_auto,h_400,w_400';
            paramsToSign.transformation = targetTransformation;
        } else if (type === 'memory') {
            if (!groupId) {
                return res.status(400).json({ error: 'groupId is required for memory uploads' });
            }

            // Security: Verify the user is actually a member of this group
            const { data: memberData, error: memberError } = await supabase
                .from('group_members')
                .select('id')
                .eq('group_id', groupId)
                .eq('user_id', req.userId)
                .single();

            if (memberError || !memberData) {
                return res.status(403).json({ error: 'Unauthorized: You are not a member of this group' });
            }

            targetFolder = `mandali/${groupId}/photos`;
        } else {
            return res.status(400).json({ error: 'Invalid upload type requested' });
        }

        // Apply derived paths
        paramsToSign.folder = targetFolder;
        if (targetPublicId) {
            paramsToSign.public_id = targetPublicId;
        }

        const signature = cloudinary.utils.api_sign_request(
            paramsToSign,
            process.env.CLOUDINARY_API_SECRET!
        );

        res.json({
            signature,
            timestamp,
            apiKey: process.env.CLOUDINARY_API_KEY,
            cloudName: process.env.CLOUDINARY_CLOUD_NAME,
            folder: targetFolder,
            publicId: targetPublicId || undefined,
            overwrite: type === 'profile' ? true : undefined,
            transformation: targetTransformation || undefined,
            allowedFormats: 'jpg,jpeg,png,webp',
            maxFileSize: 5000000
        });
    } catch (err: any) {
        console.error('[Upload Sign Error]', err.message);
        res.status(500).json({ error: 'Failed to generate upload signature' });
    }
});

export default router;
