import { useEffect, useRef, useState } from 'react';
import { Alert, Modal, SafeAreaView, StyleSheet, Switch, Text, TouchableOpacity, Vibration, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useMutation } from 'convex/react';
import client from '../../src/api/client';
import SupportChat from '../../src/components/SupportChat';
import { useSocket } from '../../src/hooks/useSocket';
import { useAuth } from '../../src/context/AuthContext';
import { startBackgroundLocation, stopBackgroundLocation } from '../../src/tasks/backgroundLocation';
import { api } from '../../convex/_generated/api';
import { T } from '../../src/theme';

interface TripRequest {
  tripId: string;
  passenger: { name: string; phone: string };
  pickup: { address: string; lat: number; lng: number };
  dropoff: { address: string };
  estimatedFare: number;
  distanceKm: number;
  surgeMultiplier?: number;
}

interface TodaySummary { trips: number; earnings: number; }

const COUNTDOWN = 20;

export default function DriverDashboard() {
  const { token, user } = useAuth();
  const { socketRef, socket, connected } = useSocket();
  const updateConvexLocation = useMutation(api.rideTracking.updateLocation);
  const mapRef = useRef<MapView>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  const [online, setOnline]           = useState(false);
  const [location, setLocation]       = useState<{ latitude: number; longitude: number } | null>(null);
  const [request, setRequest]         = useState<TripRequest | null>(null);
  const [countdown, setCountdown]     = useState(COUNTDOWN);
  const [summary, setSummary]         = useState<TodaySummary>({ trips: 0, earnings: 0 });
  const [toggling, setToggling]       = useState(false);
  const [surgeActive, setSurgeActive] = useState(false);

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });

      sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 }, (pos) => {
        const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setLocation(coords);
        socketRef.current?.emit('driver_location', { lat: coords.latitude, lng: coords.longitude });
        if (user?._id) {
          updateConvexLocation({ driverId: user._id, lat: coords.latitude, lng: coords.longitude }).catch(() => {});
        }
      });

      if (user?._id) await startBackgroundLocation(user._id);
    })();
    loadSummary();
    return () => {
      sub?.remove();
      stopBackgroundLocation();
    };
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('new_ride_request', (data: TripRequest) => {
      setRequest(data);
      setCountdown(COUNTDOWN);
      Vibration.vibrate([0, 400, 100, 400]);
    });
    socket.on('trip_cancelled_by_passenger', () => {
      clearTimer();
      setRequest(null);
      Alert.alert('Course annulée', 'Le passager a annulé la demande.');
    });
    socket.on('surge_update', (data: { active: boolean }) => {
      setSurgeActive(data.active ?? false);
    });
    return () => {
      socket.off('new_ride_request');
      socket.off('trip_cancelled_by_passenger');
      socket.off('surge_update');
    };
  }, [socket]);

  useEffect(() => {
    if (!request) { clearTimer(); return; }
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearTimer(); autoReject(); return 0; }
        return c - 1;
      });
    }, 1000);
    return clearTimer;
  }, [request]);

  const clearTimer = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };

  const autoReject = () => {
    if (request) client.post(`/drivers/trips/${request.tripId}/reject`).catch(() => {});
    setRequest(null);
  };

  const loadSummary = async () => {
    try {
      const [earnRes, surgeRes, statusRes] = await Promise.all([
        client.get('/drivers/earnings/today'),
        client.get('/drivers/surge-status').catch(() => ({ data: { active: false } })),
        client.get('/drivers/status').catch(() => ({ data: { isOnline: false } })),
      ]);
      setSummary({ trips: earnRes.data.trips ?? 0, earnings: earnRes.data.earnings ?? 0 });
      setSurgeActive(surgeRes.data.active ?? false);
      setOnline(statusRes.data.isOnline ?? false);
    } catch {}
  };

  const toggleOnline = async (val: boolean) => {
    setToggling(true);
    try {
      await client.put('/drivers/status', { isOnline: val });
      setOnline(val);
    } catch (err: any) {
      if (err.message?.includes('KYC')) {
        Alert.alert('KYC requis', 'Votre vérification d\'identité doit être approuvée avant de recevoir des courses.', [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Soumettre KYC', onPress: () => router.push('/(driver)/kyc') },
        ]);
      } else {
        Alert.alert('Erreur', err.message);
      }
    }
    finally { setToggling(false); }
  };

  const handleAccept = async () => {
    if (!request) return;
    clearTimer();
    try {
      await client.post(`/drivers/trips/${request.tripId}/accept`);
      setRequest(null);
      Alert.alert('Course acceptée !', 'Rendez-vous au point de départ.');
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
      setRequest(null);
    }
  };

  const handleReject = async () => {
    if (!request) return;
    clearTimer();
    try { await client.post(`/drivers/trips/${request.tripId}/reject`); } catch {}
    setRequest(null);
  };

  const countdownPct = countdown / COUNTDOWN;
  const hasSurge = (request?.surgeMultiplier ?? 1) > 1;

  return (
    <SafeAreaView style={styles.safe}>
      <MapView
        ref={mapRef}
        style={styles.map}
        showsUserLocation
        userInterfaceStyle="dark"
        initialRegion={location ? { ...location, latitudeDelta: 0.05, longitudeDelta: 0.05 } : { latitude: 5.3484, longitude: -4.0015, latitudeDelta: 0.1, longitudeDelta: 0.1 }}
      >
        {location && <Marker coordinate={location} title="Vous" pinColor={T.teal} />}
      </MapView>

      {/* Bottom overlay panel */}
      <View style={styles.overlay}>

        {/* Disconnected banner */}
        {online && !connected && (
          <View style={[styles.surgeBanner, { backgroundColor: `${T.danger}18`, borderColor: `${T.danger}44` }]}>
            <Ionicons name="wifi-outline" size={15} color={T.danger} />
            <Text style={[styles.surgeText, { color: T.danger }]}>Connexion perdue · Reconnexion en cours…</Text>
          </View>
        )}

        {/* Surge active banner */}
        {surgeActive && (
          <View style={styles.surgeBanner}>
            <Ionicons name="flash" size={15} color="#92400E" />
            <Text style={styles.surgeText}>Tarification majorée active · Gagnez plus maintenant</Text>
          </View>
        )}

        {/* Online/Offline toggle card */}
        <View style={[styles.onlineCard, online && styles.onlineCardActive]}>
          <View style={styles.onlineLeft}>
            <View style={[styles.onlineIndicator, online && styles.onlineIndicatorActive]} />
            <View>
              <Text style={styles.onlineStatus}>{online ? 'En ligne' : 'Hors ligne'}</Text>
              <Text style={styles.onlineSub}>{online ? 'Vous recevez des courses' : 'Activez pour recevoir des courses'}</Text>
            </View>
          </View>
          <Switch
            value={online}
            onValueChange={toggleOnline}
            disabled={toggling}
            trackColor={{ false: T.border, true: T.teal }}
            thumbColor="#fff"
            ios_backgroundColor={T.border}
          />
        </View>

        {/* Today's summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryIconWrap}>
              <Ionicons name="car-outline" size={18} color={T.teal} />
            </View>
            <Text style={styles.summaryValue}>{summary.trips}</Text>
            <Text style={styles.summaryLabel}>Courses</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCard}>
            <View style={styles.summaryIconWrap}>
              <Ionicons name="cash-outline" size={18} color={T.teal} />
            </View>
            <Text style={styles.summaryValue}>{summary.earnings.toLocaleString('fr-CI')}</Text>
            <Text style={styles.summaryLabel}>FCFA gagnés</Text>
          </View>
        </View>
      </View>

      <SupportChat />

      {/* Trip request modal */}
      <Modal visible={!!request} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>

            {/* Surge badge */}
            {hasSurge && (
              <View style={styles.surgePill}>
                <Ionicons name="flash" size={13} color="#92400E" />
                <Text style={styles.surgePillText}>Majoration ×{request?.surgeMultiplier?.toFixed(1)}</Text>
              </View>
            )}

            {/* Header with countdown */}
            <View style={styles.modalHeader}>
              <View style={styles.countdownRing}>
                <View style={[styles.countdownFill, { borderColor: countdownPct > 0.5 ? T.teal : countdownPct > 0.25 ? T.warning : T.danger }]} />
                <View style={styles.countdownInner}>
                  <Text style={styles.countdownText}>{countdown}</Text>
                  <Text style={styles.countdownSec}>s</Text>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Nouvelle course</Text>
                <Text style={styles.modalSub}>Répondez avant expiration</Text>
              </View>
              <View style={[styles.fareChip, hasSurge && styles.fareChipSurge]}>
                <Text style={[styles.fareChipAmt, hasSurge && styles.fareChipAmtSurge]}>{request?.estimatedFare?.toLocaleString('fr-CI')}</Text>
                <Text style={[styles.fareChipCur, hasSurge && { color: '#92400E' }]}>FCFA</Text>
              </View>
            </View>

            {/* Progress bar */}
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${countdownPct * 100}%` as any, backgroundColor: countdownPct > 0.5 ? T.teal : countdownPct > 0.25 ? T.warning : T.danger }]} />
            </View>

            {/* Trip info rows */}
            <View style={styles.tripCard}>
              <View style={styles.tripRow}>
                <View style={[styles.tripDot, { backgroundColor: T.teal }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.tripRowLabel}>Passager</Text>
                  <Text style={styles.tripRowVal}>{request?.passenger.name}</Text>
                  {request?.passenger.phone ? <Text style={[styles.tripRowLabel, { marginTop: 2 }]}>{request.passenger.phone}</Text> : null}
                </View>
              </View>
              <View style={styles.tripConnector} />
              <View style={styles.tripRow}>
                <View style={[styles.tripDot, { backgroundColor: T.success }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.tripRowLabel}>Départ</Text>
                  <Text style={styles.tripRowVal} numberOfLines={2}>{request?.pickup.address}</Text>
                </View>
              </View>
              <View style={styles.tripConnector} />
              <View style={styles.tripRow}>
                <View style={[styles.tripDot, { backgroundColor: T.danger }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.tripRowLabel}>Arrivée</Text>
                  <Text style={styles.tripRowVal} numberOfLines={2}>{request?.dropoff.address}</Text>
                </View>
              </View>
            </View>

            <View style={styles.distanceTag}>
              <Ionicons name="navigate-outline" size={14} color={T.sub} />
              <Text style={styles.distanceTagText}>{request?.distanceKm?.toFixed(1)} km</Text>
            </View>

            {/* Accept / Reject */}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.rejectBtn} onPress={handleReject}>
                <Text style={styles.rejectText}>Refuser</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept}>
                <Text style={styles.acceptText}>Accepter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:                { flex: 1, backgroundColor: T.bg },
  map:                 { flex: 1 },

  // Overlay
  overlay:             { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, gap: 12 },

  surgeBanner:         { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#F59E0B44' },
  surgeText:           { flex: 1, color: '#92400E', fontSize: 13, fontWeight: '600' },

  onlineCard:          { backgroundColor: T.elevated, borderRadius: T.r20, padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1.5, borderColor: T.border },
  onlineCardActive:    { borderColor: T.teal },
  onlineLeft:          { flexDirection: 'row', alignItems: 'center', gap: 12 },
  onlineIndicator:     { width: 10, height: 10, borderRadius: 5, backgroundColor: T.muted },
  onlineIndicatorActive:{ backgroundColor: T.teal, shadowColor: T.teal, shadowOpacity: 0.8, shadowRadius: 6, elevation: 6 },
  onlineStatus:        { color: T.text, fontWeight: T.bold, fontSize: 16 },
  onlineSub:           { color: T.sub, fontSize: 12, marginTop: 1 },

  summaryRow:          { flexDirection: 'row', backgroundColor: T.elevated, borderRadius: T.r20, borderWidth: 1, borderColor: T.border, overflow: 'hidden' },
  summaryCard:         { flex: 1, alignItems: 'center', paddingVertical: 16, gap: 4 },
  summaryDivider:      { width: 1, backgroundColor: T.border, marginVertical: 12 },
  summaryIconWrap:     { width: 34, height: 34, borderRadius: 17, backgroundColor: T.tealDim, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  summaryValue:        { color: T.text, fontSize: 20, fontWeight: T.xbold },
  summaryLabel:        { color: T.sub, fontSize: 12 },

  // Modal
  modalBackdrop:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalCard:           { backgroundColor: T.elevated, borderTopLeftRadius: T.r24, borderTopRightRadius: T.r24, padding: 24, paddingBottom: 36, borderTopWidth: 1, borderColor: T.border },

  surgePill:           { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: '#FEF3C7', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: '#F59E0B66', marginBottom: 12 },
  surgePillText:       { color: '#92400E', fontSize: 12, fontWeight: '700' },

  modalHeader:         { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  countdownRing:       { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  countdownFill:       { position: 'absolute', width: 60, height: 60, borderRadius: 30, borderWidth: 3, borderColor: T.teal },
  countdownInner:      { flexDirection: 'row', alignItems: 'baseline', gap: 1 },
  countdownText:       { color: T.text, fontWeight: T.xbold, fontSize: 20 },
  countdownSec:        { color: T.muted, fontSize: 11 },
  modalTitle:          { color: T.text, fontSize: 18, fontWeight: T.bold },
  modalSub:            { color: T.muted, fontSize: 12, marginTop: 2 },
  fareChip:            { backgroundColor: T.tealDim, borderRadius: T.r12, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: T.tealBorder },
  fareChipSurge:       { backgroundColor: '#FEF3C7', borderColor: '#F59E0B66' },
  fareChipAmt:         { color: T.teal, fontSize: 18, fontWeight: T.xbold },
  fareChipAmtSurge:    { color: '#92400E' },
  fareChipCur:         { color: T.teal, fontSize: 10 },

  progressTrack:       { height: 4, backgroundColor: T.border, borderRadius: 2, marginBottom: 18 },
  progressFill:        { height: 4, backgroundColor: T.teal, borderRadius: 2 },

  tripCard:            { backgroundColor: T.card, borderRadius: T.r16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: T.border },
  tripRow:             { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  tripDot:             { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  tripConnector:       { width: 2, height: 16, backgroundColor: T.border, marginLeft: 4, marginVertical: 2 },
  tripRowLabel:        { color: T.muted, fontSize: 11 },
  tripRowVal:          { color: T.text, fontSize: 14, fontWeight: '500', marginTop: 1 },

  distanceTag:         { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 },
  distanceTagText:     { color: T.sub, fontSize: 13 },

  modalActions:        { flexDirection: 'row', gap: 12 },
  rejectBtn:           { flex: 1, borderWidth: 1.5, borderColor: T.danger, borderRadius: T.rFull, paddingVertical: 15, alignItems: 'center' },
  rejectText:          { color: T.danger, fontWeight: T.bold, fontSize: 15 },
  acceptBtn:           { flex: 1, backgroundColor: T.teal, borderRadius: T.rFull, paddingVertical: 15, alignItems: 'center' },
  acceptText:          { color: T.bg, fontWeight: T.xbold, fontSize: 15 },
});
