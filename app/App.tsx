// lib
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import { NotoSerif_400Regular, NotoSerif_700Bold, NotoSerif_400Regular_Italic, NotoSerif_700Bold_Italic } from '@expo-google-fonts/noto-serif';
import { BeVietnamPro_300Light, BeVietnamPro_400Regular, BeVietnamPro_500Medium, BeVietnamPro_600SemiBold, BeVietnamPro_700Bold } from '@expo-google-fonts/be-vietnam-pro';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as ScreenOrientation from 'expo-screen-orientation';

//components
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { RootNavigator } from '@/src/navigation/RootNavigator';

//contexts
import { SocketProvider } from './src/contexts/SocketContext';
import { useAuthStore } from './src/stores/authStore';

//styles
import '@/global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

export default function App() {
  React.useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(console.warn);
  }, []);

  const [fontsLoaded] = useFonts({
    NotoSerif_400Regular,
    NotoSerif_700Bold,
    NotoSerif_400Regular_Italic,
    NotoSerif_700Bold_Italic,
    BeVietnamPro_300Light,
    BeVietnamPro_400Regular,
    BeVietnamPro_500Medium,
    BeVietnamPro_600SemiBold,
    BeVietnamPro_700Bold,
  });

  const { token } = useAuthStore();

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <GluestackUIProvider mode="light">
            <SocketProvider token={token}>
              <RootNavigator />
              <StatusBar style="auto" />
            </SocketProvider>
          </GluestackUIProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
