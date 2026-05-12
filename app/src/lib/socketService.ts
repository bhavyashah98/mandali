import { io, Socket } from 'socket.io-client';
import { Platform } from 'react-native';
import { getAppBuildNumber, getAppVersion } from './appVersion';

const getSocketPlatform = () => {
    return Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'unknown';
};

class SocketService {
    private static instance: SocketService;
    private socket: Socket | null = null;
    private token: string | null = null;

    private constructor() { }

    public static getInstance(): SocketService {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    }

    public initialize(token: string): Socket {
        if (this.socket && this.token === token) {
            if (!this.socket.connected) {
                this.socket.connect();
            }
            return this.socket;
        }

        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }

        this.token = token;

        const host = process.env.EXPO_PUBLIC_SOCKET_URL!;

        this.socket = io(host, {
            transports: ['polling', 'websocket'],
            upgrade: true,

            autoConnect: true,

            reconnection: true,
            reconnectionAttempts: Infinity,

            reconnectionDelay: 1000,
            reconnectionDelayMax: 3000,
            randomizationFactor: 0.5,

            timeout: 20000,
            auth: {
                token,
                platform: getSocketPlatform(),
                version: getAppVersion(),
                buildNumber: getAppBuildNumber(),
            },
        });

        this.socket.on('connect', () => {
            console.log('[SocketService] ✅ Connected');
            if (this.socket?.recovered) {
                console.log('[SocketService] Missed packets recovered');
            } else {
                console.log('[SocketService] Fresh connection / recovery failed');
            }
        });

        this.socket.on('connect_error', (err) => {
            console.log('[SocketService] ❌ Connection Error:', err.message);
        });

        this.socket.on('disconnect', (reason) => {
            console.log('[SocketService] 🔌 Disconnected:', reason);
        });

        return this.socket;
    }

    public getSocket(): Socket | null {
        return this.socket;
    }

    public updateToken(token: string) {
        if (!this.socket) return;

        this.token = token;
        this.socket.disconnect();
        this.socket.auth = {
            token,
            platform: getSocketPlatform(),
            version: getAppVersion(),
            buildNumber: getAppBuildNumber(),
        };
        this.socket.connect();
    }

    public disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.token = null;
            console.log('[SocketService] Cleaned up cleanup');
        }
    }
}

export const socketService = SocketService.getInstance();
