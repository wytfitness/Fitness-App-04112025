// app/_layout.js
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '../stores/auth';
import { useAuthWatcher } from '../lib/session-watcher'; // ← add this

const qc = new QueryClient();

export default function RootLayout() {
  const { init, loading } = useAuth();

  useEffect(() => { init(); }, []);

  useAuthWatcher(); // ← add this line (global sign-out/watch + message)

  if (loading) {
    return (
      <QueryClientProvider client={qc}>
        <StatusBar style="light" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B0F13' }}>
          <ActivityIndicator />
        </View>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={qc}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(models)" options={{ presentation: 'transparentModal' }} />
      </Stack>
    </QueryClientProvider>
  );
}
