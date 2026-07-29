import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const registerForPushNotifications = async (): Promise<string | null> => {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#F4A825',
    });
  }

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: '92171114-3675-41f3-946d-664b813b694d',
  });

  return token.data;
};

export function usePushNotifications() {
  const { token: authToken } = useAuth();
  const router = useRouter();
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    if (!authToken) return;

    const tryRegister = () => {
      registerForPushNotifications().then((pushToken) => {
        if (!pushToken) return;
        client.put('/auth/push-token', { pushToken }).catch(() => {});
      });
    };

    tryRegister();

    // Re-check when app returns to foreground — covers the case where the user
    // denied permission initially, then enabled it in device settings and reopened.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') tryRegister();
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(() => {
      // notification received while app is foregrounded — socket already handles UI
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as any;
      if (data?.screen === 'driver_home') router.replace('/(driver)/');
    });

    return () => {
      sub.remove();
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [authToken]);
}
