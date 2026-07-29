import { useEffect, useRef, useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import client from '../../src/api/client';
import { T } from '../../src/theme';

export default function DriverLayout() {
  const insets = useSafeAreaInsets();
  const [hasActiveTrip, setHasActiveTrip]   = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkBadges = async () => {
    try {
      const { data } = await client.get('/drivers/active-trip');
      setHasActiveTrip(!!data.trip);
    } catch {}
  };

  useEffect(() => {
    checkBadges();
    pollRef.current = setInterval(checkBadges, 30000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: T.surface,
          borderTopColor: T.border,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 6,
          paddingTop: 8,
        },
        tabBarActiveTintColor: T.teal,
        tabBarInactiveTintColor: T.muted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index"    options={{ title: 'Statut',    tabBarIcon: ({ color, size }) => <Ionicons name="radio-button-on-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="trip"     options={{ title: 'Course',    tabBarBadge: hasActiveTrip ? '' : undefined, tabBarIcon: ({ color, size }) => <Ionicons name="navigate-outline"        size={size} color={color} /> }} />
      <Tabs.Screen name="earnings" options={{ title: 'Gains',      tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="history"  options={{ title: 'Historique', tabBarIcon: ({ color, size }) => <Ionicons name="time-outline"       size={size} color={color} /> }} />
      <Tabs.Screen name="profile"  options={{ title: 'Profil',     tabBarIcon: ({ color, size }) => <Ionicons name="person-outline"     size={size} color={color} /> }} />
      <Tabs.Screen name="kyc"      options={{ href: null }} />
      <Tabs.Screen name="aup"      options={{ href: null }} />
    </Tabs>
  );
}
