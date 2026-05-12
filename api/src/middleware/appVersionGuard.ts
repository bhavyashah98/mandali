import { NextFunction, Request, Response } from 'express';
import { evaluateAppVersion, parseAppBuildNumber } from '../routes/appVersion';

const PUBLIC_PATH_PREFIXES = [
    '/app-version',
    '/health',
    '/privacy',
    '/terms',
    '/support',
    '/delete-account',
    '/logo.png',
    '/.well-known',
    '/join',
];

const isEnforcementEnabled = () => process.env.ENFORCE_APP_VERSION === 'true';
const shouldRejectMissingHeaders = () => process.env.REJECT_MISSING_APP_VERSION_HEADERS === 'true';

const isPublicPath = (path: string) => PUBLIC_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));

export const appVersionGuard = (req: Request, res: Response, next: NextFunction) => {
    if (!isEnforcementEnabled() || isPublicPath(req.path)) {
        return next();
    }

    const platform = String(req.header('x-mandali-platform') || '').trim().toLowerCase();
    const currentBuild = parseAppBuildNumber(req.header('x-mandali-build'));

    if (platform !== 'android' && platform !== 'ios') {
        if (!shouldRejectMissingHeaders()) {
            return next();
        }

        return res.status(426).json({
            success: false,
            code: 'APP_UPDATE_REQUIRED',
            error: process.env.FORCE_UPDATE_MESSAGE || 'Please update Mandali to continue.',
            message: process.env.FORCE_UPDATE_MESSAGE || 'Please update Mandali to continue.',
            forceUpdate: true,
            storeUrl: '',
        });
    }

    const { policy, forceUpdate, message } = evaluateAppVersion(platform, currentBuild);

    if (!forceUpdate) {
        return next();
    }

    return res.status(426).json({
        success: false,
        code: 'APP_UPDATE_REQUIRED',
        error: message,
        message,
        forceUpdate: true,
        minimumSupportedBuild: policy.minimumSupportedBuild,
        latestBuild: policy.latestBuild,
        storeUrl: policy.storeUrl,
    });
};
