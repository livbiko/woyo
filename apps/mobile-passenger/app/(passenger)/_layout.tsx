import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T } from '../../src/theme';

export default function PassengerLayout() {
  const insets = useSafeAreaInsets();
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
      <Tabs.Screen name="index"     options={{ title: 'Accueil',      tabBarIcon: ({ color, size }) => <Ionicons name="map-outline"        size={size} color={color} /> }} />
      <Tabs.Screen name="scheduled" options={{ title: 'Programmées',  tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline"  size={size} color={color} /> }} />
      <Tabs.Screen name="history"   options={{ title: 'Historique',   tabBarIcon: ({ color, size }) => <Ionicons name="time-outline"      size={size} color={color} /> }} />
      <Tabs.Screen name="wallet"    options={{ title: 'Portefeuille', tabBarIcon: ({ color, size }) => <Ionicons name="wallet-outline"    size={size} color={color} /> }} />
      <Tabs.Screen name="woyo"      options={{ href: null }} />
      <Tabs.Screen name="profile"   options={{ title: 'Profil',       tabBarIcon: ({ color, size }) => <Ionicons name="person-outline"    size={size} color={color} /> }} />
      <Tabs.Screen name="aup"          options={{ href: null }} />
    </Tabs>
  );
}
