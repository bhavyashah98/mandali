import admin from 'firebase-admin';
import path from 'path';

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(
            path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH!)
        ),
    });
}

export const verifyFirebaseToken = async (token: string) => {
    const decoded = await admin.auth().verifyIdToken(token);
    return decoded;
};

export default admin;