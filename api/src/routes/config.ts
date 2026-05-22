import { Router } from 'express';

const router = Router();

router.get('/app-config', (req, res) => {
    // These could eventually come from a database or environment variables
    const config = {
        hisaab: {
            android: process.env.HISAAB_ANDROID_ENABLED === 'true',
            ios: process.env.HISAAB_IOS_ENABLED === 'true',
        },
        plans: {
            android: process.env.PLANS_ANDROID_ENABLED === 'true',
            ios: process.env.PLANS_IOS_ENABLED === 'true',
        },
        minimumSupportedVersion: {
            android: process.env.MIN_SUPPORTED_ANDROID_VERSION,
            ios: process.env.MIN_SUPPORTED_IOS_VERSION,
        },
        games: [
            {
                id: 'housie',
                enabled: process.env.GAME_HOUSIE_ENABLED !== 'false',
                title: 'Housie',
                subtitle: 'Classic Indian Bingo • Multi-winner party fun',
                icon: 'confirmation-number',
                iconType: 'material'
            },
            {
                id: 'blink',
                enabled: process.env.GAME_BLINK_ENABLED === 'true',
                title: 'Blink',
                subtitle: 'Speed Match • Fast-paced symbol matching',
                icon: 'bolt',
                iconType: 'fa5'
            }
        ].filter(g => g.enabled)
    };

    res.json(config);
});

export default router;
