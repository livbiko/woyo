import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, AppState, Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import * as Updates from 'expo-updates';
import * as Sentry from '@sentry/react-native';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import LoadingOverlay from '../src/components/LoadingOverlay';
import { usePushNotifications } from '../src/hooks/usePushNotifications';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: 'passenger-production',
  tracesSampleRate: 0.2,
});

const CONVEX_URL = process.env.EXPO_PUBLIC_CONVEX_URL;
if (!CONVEX_URL) throw new Error('EXPO_PUBLIC_CONVEX_URL is not set. Check eas.json env config.');
const convex = new ConvexReactClient(CONVEX_URL);

const PLAY_STORE_URL = 'https://play.google.com/apps/internaltest/TODO_WOYO_PASSENGER';

function InAppUpdater() {
  useEffect(() => {
    if (__DEV__ || Platform.OS !== 'android') return;

    const check = async () => {
      try {
        const currentBuild = Number(Constants.expoConfig?.android?.versionCode ?? 0);
        if (!currentBuild) return;
        const token = process.env.EXPO_PUBLIC_APP_TOKEN;
        const base  = process.env.EXPO_PUBLIC_API_URL;
        const res   = await fetch(`${base}/app/version`, {
          headers: token ? { 'x-app-token': token } : {},
        });
        if (!res.ok) return;
        const { minBuild } = await res.json();
        if (minBuild > currentBuild) {
          Alert.alert(
            'Mise à jour disponible',
            'Une nouvelle version de Woyo est disponible. Mettez à jour pour continuer.',
            [
              { text: 'Plus tard', style: 'cancel' },
              { text: 'Mettre à jour', onPress: () => Linking.openURL(PLAY_STORE_URL) },
            ]
          );
        }
      } catch {}
    };

    const timer = setTimeout(check, 3000);
    return () => clearTimeout(timer);
  }, []);

  return null;
}

function OTAUpdater() {
  useEffect(() => {
    if (__DEV__) return;

    const applyIfAvailable = async () => {
      try {
        const result = await Updates.checkForUpdateAsync();
        if (result.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch (e) {
        Sentry.captureException(e, { tags: { context: 'OTAUpdater' } });
      }
    };

    // Delay initial check slightly to let the app fully mount
    const timer = setTimeout(applyIfAvailable, 2000);

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') applyIfAvailable();
    });

    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, []);

  return null;
}

function RootRedirect() {
  const { token, role, loading } = useAuth();
  const router = useRouter();
  usePushNotifications();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    const inPassenger = segments[0] === '(passenger)';

    if (!token) {
      if (!inAuth) router.replace('/(auth)/register');
    } else {
      if (!inPassenger) router.replace('/(passenger)/');
    }
  }, [token, role, loading]);

  useEffect(() => {
    const handleUrl = ({ url }: { url: string }) => {
      try {
        const parsed = new URL(url);
        if (parsed.protocol === 'woyo:' && parsed.hostname === 'wallet') {
          router.replace('/(passenger)/wallet');
        }
      } catch {}
    };
    const sub = Linking.addEventListener('url', handleUrl);
    return () => sub.remove();
  }, []);

  if (loading) return <LoadingOverlay />;
  return <Slot />;
}

function RootLayout() {
  return (
    <ConvexProvider client={convex}>
      <AuthProvider>
        <StatusBar style="light" />
        <RootRedirect />
        <OTAUpdater />
        <InAppUpdater />
      </AuthProvider>
    </ConvexProvider>
  );
}

export default Sentry.wrap(RootLayout);
