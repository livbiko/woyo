import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, SafeAreaView, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import client from '../../src/api/client';
import RatingModal from '../../src/components/RatingModal';
import TripChat from '../../src/components/TripChat';
import { useSocket } from '../../src/hooks/useSocket';
import { T } from '../../src/theme';

interface ActiveTrip {
  _id: string;
  status: string;
  estimatedFare: number;
  finalFare?: number;
  pickup: { address: string; coordinates?: { lat: number; lng: number } };
  dropoff: { address: string; coordinates?: { lat: number; lng: number } };
  passenger: { name: string; phone: string };
}

const STATUS_LABELS: Record<string, string> = {
  accepted:        'Course acceptée',
  driver_arriving: 'En route vers le passager',
  in_progress:     'Course en cours',
  completed:       'Course terminée',
};

const NEXT_STATUS: Record<string, { status: string; label: string; color: string }> = {
  accepted:        { status: 'driver_arriving', label: 'Je suis en route',    color: '#60A5FA' },
  driver_arriving: { status: 'in_progress',     label: 'Passager à bord',     color: T.success },
  in_progress:     { status: 'completed',        label: 'Terminer la course',  color: T.teal },
};

const STATUS_COLORS: Record<string, string> = {
  accepted:        '#60A5FA',
  driver_arriving: T.warning,
  in_progress:     T.success,
  completed:       T.teal,
};

const CANCEL_REASONS = [
  'Passager introuvable',
  'Passager ne répond pas',
  'Urgence personnelle',
  'Panne véhicule',
  'Itinéraire impossible',
  'Autre',
];

export default function DriverTripScreen() {
  const { socket } = useSocket();
  const [trip, setTrip]             = useState<ActiveTrip | null>(null);
  const [loading, setLoading]       = useState(true);
  const [updating, setUpdating]     = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [completedTripId, setCompletedTripId] = useState<string | null>(null);
  const [chatOpen, setChatOpen]     = useState(false);

  useEffect(() => { loadActiveTrip(); }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('trip_status_update', loadActiveTrip);
    socket.on('trip_cancelled', () => {
      setTrip(null);
      Alert.alert('Course annulée', 'Le passager a annulé la course.');
    });
    return () => { socket.off('trip_status_update'); socket.off('trip_cancelled'); };
  }, [socket]);

  const loadActiveTrip = async () => {
    try {
      const { data } = await client.get('/drivers/active-trip');
      setTrip(data.trip ?? null);
    } catch {}
    finally { setLoading(false); }
  };

  const handleStatusUpdate = async () => {
    if (!trip) return;
    const next = NEXT_STATUS[trip.status];
    if (!next) return;
    setUpdating(true);
    try {
      await client.put(`/drivers/trips/${trip._id}/status`, { status: next.status });
      if (next.status === 'completed') { setCompletedTripId(trip._id); setTrip(null); }
      else await loadActiveTrip();
    } catch (err: any) { Alert.alert('Erreur', err.message); }
    finally { setUpdating(false); }
  };

  const handleShareTrip = async () => {
    if (!trip) return;
    const url = `https://api.tekeche.com/track/${trip._id}`;
    const message = `Je suis en course avec Woyo.\nPassager : ${trip.passenger.name}\nDe : ${trip.pickup.address}\nVers : ${trip.dropoff.address}\nSuivez ma course en temps réel : ${url}`;
    try { await Share.share({ message, url }); } catch {}
  };

  const handleSOS = () => {
    Alert.alert(
      '🚨 Bouton panique',
      "Vos contacts d'urgence seront alertés avec votre position actuelle.",
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Envoyer SOS', style: 'destructive', onPress: async () => {
            try {
              let lat: number | undefined;
              let lng: number | undefined;
              const { status } = await Location.requestForegroundPermissionsAsync();
              if (status === 'granted') {
                const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
                lat = pos.coords.latitude;
                lng = pos.coords.longitude;
              }
              const endpoint = trip ? `/emergency/sos/${trip._id}` : '/emergency/sos';
              const { data } = await client.post(endpoint, { lat, lng });
              Alert.alert('SOS envoyé', data.message);
            } catch (err: any) {
              Alert.alert('Erreur', err.message ?? "Impossible d'envoyer le SOS.");
            }
          },
        },
      ]
    );
  };

  const handleCancel = () => {
    if (!trip) return;
    Alert.alert(
      'Annuler la course',
      "Raison de l'annulation :",
      [
        ...CANCEL_REASONS.map(reason => ({
          text: reason,
          style: 'destructive' as const,
          onPress: async () => {
            setCancelling(true);
            try {
              await client.post(`/drivers/trips/${trip._id}/cancel`, { reason });
              setTrip(null);
            } catch (err: any) {
              Alert.alert('Erreur', err.message ?? 'Impossible d\'annuler la course.');
            } finally {
              setCancelling(false);
            }
          },
        })),
        { text: 'Retour', style: 'cancel' },
      ]
    );
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={T.teal} size="large" /></View>;
  }

  if (!trip) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🏁</Text>
          <Text style={styles.emptyTitle}>Aucune course active</Text>
          <Text style={styles.emptySub}>Passez en ligne depuis l'onglet Statut pour recevoir des courses.</Text>
        </View>
        <RatingModal
          visible={!!completedTripId}
          title="Course terminée !"
          subtitle="Comment s'est passé ce passager ?"
          onSubmit={async (rating, comment) => {
            if (!completedTripId) return;
            try { await client.post(`/drivers/trips/${completedTripId}/rate-passenger`, { rating, comment }); } catch {}
            setCompletedTripId(null);
          }}
          onSkip={() => setCompletedTripId(null)}
        />
      </SafeAreaView>
    );
  }

  const next = NEXT_STATUS[trip.status];
  const statusColor = STATUS_COLORS[trip.status] ?? T.sub;
  const canCancel = trip.status === 'accepted' || trip.status === 'driver_arriving';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.inner} contentContainerStyle={{ paddingBottom: 108 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>Course en cours</Text>
          <View style={[styles.statusPill, { backgroundColor: statusColor + '18', borderColor: statusColor + '44' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusPillText, { color: statusColor }]}>{STATUS_LABELS[trip.status] ?? trip.status}</Text>
          </View>
        </View>

        {/* Passenger card */}
        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>Passager</Text>
          <View style={styles.passengerRow}>
            <View style={styles.passengerAvatar}>
              <Text style={styles.passengerInitial}>{trip.passenger.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.passengerName}>{trip.passenger.name}</Text>
              <Text style={styles.passengerPhone}>{trip.passenger.phone}</Text>
            </View>
            <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${trip.passenger.phone}`)}>
              <Ionicons name="call-outline" size={14} color={T.success} />
              <Text style={styles.callBtnText}>Appeler</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Route card */}
        <View style={styles.card}>
          <View style={styles.routeRow}>
            <View style={styles.routeDots}>
              <View style={[styles.dot, { backgroundColor: T.success }]} />
              <View style={styles.dotLine} />
              <View style={[styles.dot, { backgroundColor: T.teal }]} />
            </View>
            <View style={{ flex: 1, gap: 16 }}>
              <View>
                <Text style={styles.routeLabel}>Départ</Text>
                <Text style={styles.routeAddr}>{trip.pickup.address}</Text>
              </View>
              <View>
                <Text style={styles.routeLabel}>Destination</Text>
                <Text style={styles.routeAddr}>{trip.dropoff.address}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Navigation button */}
        {(trip.status === 'accepted' || trip.status === 'driver_arriving') && (
          <TouchableOpacity style={styles.navBtn} onPress={() => {
            const url = trip.pickup.coordinates
              ? `https://www.google.com/maps/dir/?api=1&destination=${trip.pickup.coordinates.lat},${trip.pickup.coordinates.lng}&travelmode=driving`
              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trip.pickup.address)}`;
            Linking.openURL(url);
          }}>
            <Ionicons name="navigate" size={15} color="#60A5FA" />
            <Text style={styles.navBtnText}>Naviguer vers le passager</Text>
          </TouchableOpacity>
        )}
        {trip.status === 'in_progress' && (
          <TouchableOpacity style={styles.navBtn} onPress={() => {
            const url = trip.dropoff.coordinates
              ? `https://www.google.com/maps/dir/?api=1&destination=${trip.dropoff.coordinates.lat},${trip.dropoff.coordinates.lng}&travelmode=driving`
              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trip.dropoff.address)}`;
            Linking.openURL(url);
          }}>
            <Ionicons name="navigate" size={15} color="#60A5FA" />
            <Text style={styles.navBtnText}>Naviguer vers la destination</Text>
          </TouchableOpacity>
        )}

        {/* Fare */}
        <View style={styles.fareCard}>
          <Text style={styles.fareLabel}>Tarif</Text>
          <Text style={styles.fareAmt}>{(trip.finalFare ?? trip.estimatedFare).toLocaleString('fr-CI')} FCFA</Text>
        </View>

        {/* Chat button */}
        <TouchableOpacity style={styles.chatBtn} onPress={() => setChatOpen(true)}>
          <Ionicons name="chatbubble-outline" size={15} color={T.teal} />
          <Text style={styles.chatBtnText}>Chat passager</Text>
        </TouchableOpacity>

        {/* Share trip */}
        <TouchableOpacity style={styles.shareBtn} onPress={handleShareTrip}>
          <Ionicons name="share-social-outline" size={15} color="#60A5FA" />
          <Text style={styles.shareBtnText}>Partager ma course</Text>
        </TouchableOpacity>

        {/* Cancel — only before trip starts */}
        {canCancel && (
          <TouchableOpacity
            style={[styles.cancelBtn, cancelling && { opacity: 0.5 }]}
            onPress={handleCancel}
            disabled={cancelling}
          >
            {cancelling
              ? <ActivityIndicator size="small" color={T.danger} />
              : <>
                  <Ionicons name="close-circle-outline" size={15} color={T.danger} />
                  <Text style={styles.cancelBtnText}>Annuler la course</Text>
                </>
            }
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal visible={chatOpen} animationType="slide" onRequestClose={() => setChatOpen(false)}>
        <TripChat tripId={trip._id} myRole="driver" onClose={() => setChatOpen(false)} />
      </Modal>

      {/* CTA fixed at bottom */}
      {next && (
        <View style={styles.cta}>
          <TouchableOpacity
            style={[styles.ctaBtn, { backgroundColor: next.color }, updating && styles.ctaBtnDisabled]}
            onPress={handleStatusUpdate}
            disabled={updating}
          >
            <Text style={styles.ctaBtnText}>{updating ? 'Mise à jour…' : next.label}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Floating SOS button */}
      <SafeAreaView style={styles.sosSafeWrap} pointerEvents="box-none">
        <TouchableOpacity style={styles.sosFloatBtn} onPress={handleSOS} pointerEvents="auto">
          <Text style={styles.sosFloatText}>SOS</Text>
        </TouchableOpacity>
      </SafeAreaView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: T.bg },
  center:           { flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' },
  inner:            { flex: 1 },

  empty:            { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon:        { fontSize: 56, marginBottom: 16 },
  emptyTitle:       { color: T.text, fontSize: 20, fontWeight: T.bold, marginBottom: 8 },
  emptySub:         { color: T.sub, fontSize: 14, textAlign: 'center', lineHeight: 20 },

  headerRow:        { padding: 20, paddingBottom: 8, gap: 8 },
  title:            { color: T.text, fontSize: 22, fontWeight: T.xbold },
  statusPill:       { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderRadius: T.rFull, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1 },
  statusDot:        { width: 8, height: 8, borderRadius: 4 },
  statusPillText:   { fontSize: 12, fontWeight: T.semi },

  card:             { marginHorizontal: 16, marginTop: 12, backgroundColor: T.surface, borderRadius: T.r16, padding: 16, borderWidth: 1, borderColor: T.border },
  cardEyebrow:      { color: T.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },

  passengerRow:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  passengerAvatar:  { width: 44, height: 44, borderRadius: 22, backgroundColor: T.tealDim, borderWidth: 1.5, borderColor: T.teal, alignItems: 'center', justifyContent: 'center' },
  passengerInitial: { color: T.teal, fontSize: 18, fontWeight: T.xbold },
  passengerName:    { color: T.text, fontSize: 16, fontWeight: T.bold },
  passengerPhone:   { color: T.sub, fontSize: 13, marginTop: 2 },
  callBtn:          { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: `${T.success}18`, borderRadius: T.r12, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: `${T.success}44` },
  callBtnText:      { color: T.success, fontWeight: T.semi, fontSize: 13 },

  routeRow:         { flexDirection: 'row', gap: 12 },
  routeDots:        { alignItems: 'center', paddingTop: 3 },
  dot:              { width: 10, height: 10, borderRadius: 5 },
  dotLine:          { width: 2, flex: 1, backgroundColor: T.border, marginVertical: 4 },
  routeLabel:       { color: T.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 },
  routeAddr:        { color: T.text, fontSize: 14, marginTop: 2 },

  navBtn:           { marginHorizontal: 16, marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(96,165,250,0.1)', borderRadius: T.r12, paddingVertical: 13, borderWidth: 1, borderColor: 'rgba(96,165,250,0.3)' },
  navBtnText:       { color: '#60A5FA', fontWeight: T.semi, fontSize: 14 },
  chatBtn:          { marginHorizontal: 16, marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: T.tealDim, borderRadius: T.r12, paddingVertical: 13, borderWidth: 1, borderColor: T.tealBorder },
  chatBtnText:      { color: T.teal, fontWeight: T.semi, fontSize: 14 },
  shareBtn:         { marginHorizontal: 16, marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(96,165,250,0.1)', borderRadius: T.r12, paddingVertical: 13, borderWidth: 1, borderColor: 'rgba(96,165,250,0.3)' },
  shareBtnText:     { color: '#60A5FA', fontWeight: T.semi, fontSize: 14 },
  cancelBtn:        { marginHorizontal: 16, marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: `${T.danger}0D`, borderRadius: T.r12, paddingVertical: 13, borderWidth: 1, borderColor: `${T.danger}30` },
  cancelBtnText:    { color: T.danger, fontWeight: T.semi, fontSize: 14 },

  fareCard:         { marginHorizontal: 16, marginTop: 12, backgroundColor: T.surface, borderRadius: T.r16, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: T.border },
  fareLabel:        { color: T.sub, fontSize: 14 },
  fareAmt:          { color: T.teal, fontSize: 24, fontWeight: T.xbold },

  cta:              { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 32, backgroundColor: T.bg, borderTopWidth: 1, borderTopColor: T.border },
  ctaBtn:           { borderRadius: T.rFull, paddingVertical: 16, alignItems: 'center' },
  ctaBtnDisabled:   { opacity: 0.6 },
  ctaBtnText:       { color: T.bg, fontWeight: T.xbold, fontSize: 16 },

  sosSafeWrap:      { position: 'absolute', top: 0, right: 16, zIndex: 20 },
  sosFloatBtn:      { width: 54, height: 54, borderRadius: 27, backgroundColor: T.danger, alignItems: 'center', justifyContent: 'center', shadowColor: T.danger, shadowOpacity: 0.7, shadowRadius: 10, elevation: 12 },
  sosFloatText:     { color: '#fff', fontWeight: '800', fontSize: 12, letterSpacing: 0.8 },
});
