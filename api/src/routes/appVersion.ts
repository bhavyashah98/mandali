import express from 'express';

const router = express.Router();

type SupportedPlatform = 'android' | 'ios';

type VersionPolicy = {
    minimumSupportedBuild: number;
    latestBuild: number;
    minimumSupportedVersion: string;
    latestVersion: string;
    storeUrl: string;
};

const REQUIRED_PRODUCTION_ENVS = [
    'MIN_SUPPORTED_ANDROID_BUILD',
    'MIN_SUPPORTED_IOS_BUILD',
    'LATEST_ANDROID_BUILD',
    'LATEST_IOS_BUILD',
] as const;

const DEFAULT_ANDROID_STORE_URL = 'market://details?id=com.mandaliapp.mandali';
const IOS_APP_STORE_URL = 'https://apps.apple.com/in/app/mandali-group-companion/id6780851347';

const isProduction = process.env.NODE_ENV === 'production';

const parseBuildNumber = (value: string | undefined, fallback = 0): number => {
    const parsed = Number.parseInt(String(value || fallback), 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

if (isProduction) {
    for (const envName of REQUIRED_PRODUCTION_ENVS) {
        const value = process.env[envName];

        if (!value) {
            throw new Error(`[AppVersion] Missing required env variable: ${envName}`);
        }

        if (parseBuildNumber(value) <= 0) {
            throw new Error(`[AppVersion] ${envName} must be a positive build number`);
        }
    }
}

const getVersionPolicy = (platform: SupportedPlatform): VersionPolicy => {
    if (platform === 'android') {
        const minimumSupportedBuild = parseBuildNumber(process.env.MIN_SUPPORTED_ANDROID_BUILD);
        const latestBuild = parseBuildNumber(process.env.LATEST_ANDROID_BUILD, minimumSupportedBuild);

        return {
            minimumSupportedBuild,
            latestBuild: Math.max(latestBuild, minimumSupportedBuild),
            minimumSupportedVersion: process.env.MIN_SUPPORTED_ANDROID_VERSION || '',
            latestVersion: process.env.LATEST_ANDROID_VERSION || '',
            storeUrl: process.env.ANDROID_PLAY_STORE_URL || DEFAULT_ANDROID_STORE_URL,
        };
    }

    const minimumSupportedBuild = parseBuildNumber(process.env.MIN_SUPPORTED_IOS_BUILD);
    const latestBuild = parseBuildNumber(process.env.LATEST_IOS_BUILD, minimumSupportedBuild);

    return {
        minimumSupportedBuild,
        latestBuild: Math.max(latestBuild, minimumSupportedBuild),
        minimumSupportedVersion: process.env.MIN_SUPPORTED_IOS_VERSION || '',
        latestVersion: process.env.LATEST_IOS_VERSION || '',
        storeUrl: IOS_APP_STORE_URL,
    };
};

export const evaluateAppVersion = (platform: SupportedPlatform, currentBuild: number) => {
    const policy = getVersionPolicy(platform);

    const forceUpdate = currentBuild > 0 && currentBuild < policy.minimumSupportedBuild;
    const recommendUpdate = currentBuild > 0
        && currentBuild >= policy.minimumSupportedBuild
        && currentBuild < policy.latestBuild;

    const message = forceUpdate
        ? process.env.FORCE_UPDATE_MESSAGE || 'A new Mandali update is required to continue.'
        : recommendUpdate
            ? process.env.RECOMMEND_UPDATE_MESSAGE || 'A newer version of Mandali is available.'
            : '';

    return {
        policy,
        forceUpdate,
        recommendUpdate,
        message,
    };
};

export const parseAppBuildNumber = parseBuildNumber;

router.get('/', (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    const platform = String(req.query.platform || '').trim().toLowerCase();
    const currentBuild = parseBuildNumber(String(req.query.buildNumber || '0'));

    if (platform !== 'android' && platform !== 'ios') {
        return res.status(400).json({
            success: false,
            code: 'INVALID_PLATFORM',
            message: 'Invalid platform',
        });
    }

    const { policy, forceUpdate, recommendUpdate, message } = evaluateAppVersion(platform, currentBuild);

    return res.json({
        success: true,
        platform,

        forceUpdate,
        recommendUpdate,

        currentBuild,
        minimumSupportedBuild: policy.minimumSupportedBuild,
        latestBuild: policy.latestBuild,

        minimumSupportedVersion: policy.minimumSupportedVersion,
        latestVersion: policy.latestVersion,

        message,
        storeUrl: policy.storeUrl,

        // Backward-compatible aliases for any client already using the first app-version contract.
        isUpdateRequired: forceUpdate,
        minimumBuildNumber: policy.minimumSupportedBuild,
        minimumVersion: policy.minimumSupportedVersion,
    });
});

export default router;
