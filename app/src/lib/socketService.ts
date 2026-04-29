import { io, Socket } from 'socket.io-client';

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
            transports: ['websocket'],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            timeout: 10000,
            auth: { token },
        });

        this.socket.on('connect', () => {
            console.log('[SocketService] ✅ Connected');
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
        this.socket.auth = { token };
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
