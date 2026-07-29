import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { ConvexHttpClient } from 'convex/browser';
import client from '../api/client';
import { api } from '../../convex/_generated/api';

const TASK_NAME = 'woyo-bg-location';
const convexClient = new ConvexHttpClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

let _driverId: string | null = null;

TaskManager.defineTask(TASK_NAME, async ({ data, error }: TaskManager.TaskManagerTaskBody) => {
  if (error) return;
  const { locations } = data as { locations: Location.LocationObject[] };
  const loc = locations?.[0];
  if (!loc) return;

  const { latitude: lat, longitude: lng } = loc.coords;

  const retry = async (fn: () => Promise<any>, attempts = 2) => {
    for (let i = 0; i < attempts; i++) {
      try { return await fn(); } catch (err: any) {
        if (err?.message?.includes('expir') || err?.message?.includes('reconnecter')) throw err;
        if (i === attempts - 1) throw new Error('location sync failed');
      }
    }
  };

  await Promise.all([
    retry(() => client.put('/drivers/location', { lat, lng })).catch((err: any) => {
      if (err?.message?.includes('expir') || err?.message?.includes('reconnecter')) {
        stopBackgroundLocation();
      }
    }),
    _driverId
      ? retry(() => convexClient.mutation(api.rideTracking.updateLocation, { driverId: _driverId, lat, lng })).catch(() => {})
      : Promise.resolve(),
  ]);
});

export async function startBackgroundLocation(driverId: string): Promise<void> {
  _driverId = driverId;
  try {
    const { status } = await Location.requestBackgroundPermissionsAsync();
    if (status !== 'granted') return;

    const running = await Location.hasStartedLocationUpdatesAsync(TASK_NAME).catch(() => false);
    if (running) return;

    await Location.startLocationUpdatesAsync(TASK_NAME, {
      accuracy: Location.Accuracy.High,
      timeInterval: 10000,
      distanceInterval: 20,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Woyo Chauffeur',
        notificationBody: 'Suivi de position actif',
        notificationColor: '#F4A825',
      },
    });
  } catch {}
}

export async function stopBackgroundLocation(): Promise<void> {
  _driverId = null;
  try {
    const running = await Location.hasStartedLocationUpdatesAsync(TASK_NAME).catch(() => false);
    if (running) await Location.stopLocationUpdatesAsync(TASK_NAME);
  } catch {}
}
