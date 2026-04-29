//lib
import React, {
    createContext,
    useEffect,
    useRef,
    useState,
    useMemo,
    ReactNode,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';

//Socket
import { socketService } from '../lib/socketService';
import { Socket } from 'socket.io-client';

interface SocketContextType {
    socket: Socket | null;
}

export const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface Props {
    token: string | null;
    children: ReactNode;
}

export const SocketProvider: React.FC<Props> = ({ token, children }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const appState = useRef(AppState.currentState);

    useEffect(() => {
        if (token) {
            const s = socketService.initialize(token);
            setSocket(s);
        } else {
            socketService.disconnect();
            setSocket(null);
        }
    }, [token]);

    useEffect(() => {
        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            const s = socketService.getSocket();

            if (
                appState.current.match(/inactive|background/) &&
                nextAppState === 'active'
            ) {
                if (s && !s.connected) {
                    console.log('[SocketProvider] Reconnecting on active...');
                    s.connect();
                }
            }

            appState.current = nextAppState;
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            subscription.remove();
        };
    }, []);

    const value = useMemo(() => ({ socket }), [socket]);

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};