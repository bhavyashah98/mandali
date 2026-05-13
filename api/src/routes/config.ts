import { Router } from 'express';

const router = Router();

router.get('/app-config', (req, res) => {
    // These could eventually come from a database or environment variables
    const config = {
        hisaab: {
            android: process.env.HISAAB_ANDROID_ENABLED === 'true',
            ios: process.env.HISAAB_IOS_ENABLED === 'true',
        },
        minimumSupportedVersion: {
            android: process.env.MIN_SUPPORTED_ANDROID_VERSION,
            ios: process.env.MIN_SUPPORTED_IOS_VERSION,
        },
    };

    res.json(config);
});

export default router;
