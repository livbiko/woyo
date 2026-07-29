import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Keyboard, Modal, SafeAreaView,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import client from '../../src/api/client';
import { useSocket } from '../../src/hooks/useSocket';
import { T } from '../../src/theme';

const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

interface ScheduledTrip {
  _id: string;
  scheduledFor: string;
  pickup: { address: string };
  dropoff: { address: string };
  vehicleType: string;
  estimatedFare: number;
  paymentMethod?: string;
}

interface PlaceSuggestion {
  placeId: string; description: string; mainText: string; secondaryText: string;
}

interface LatLng { lat: number; lng: number; }

const VEHICLE_TYPES = [
  { id: 'moto',     emoji: '🏍️', label: 'Moto' },
  { id: 'standard', emoji: '🚗',  label: 'Standard' },
  { id: 'comfort',  emoji: '🚙',  label: 'Comfort' },
  { id: 'xl',       emoji: '🚐',  label: 'XL' },
];

const VEHICLE_ICONS: Record<string, string> = {
  standard: '🚗', moto: '🏍', comfort: '🚙', xl: '🚐', delivery: '📦',
};

const TIME_SLOTS = Array.from({ length: 34 }, (_, i) => {
  const totalMins = 360 + i * 30;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return { hour: h, minute: m, label: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` };
});

function getDateChips() {
  const chips: { date: Date; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    d.setHours(0, 0, 0, 0);
    let label: string;
    if (i === 0) label = "Aujourd'hui";
    else if (i === 1) label = 'Demain';
    else label = d.toLocaleDateString('fr-CI', { weekday: 'short', day: 'numeric', month: 'short' });
    chips.push({ date: d, label });
  }
  return chips;
}

async function fetchPlaceSuggestions(input: string, location: { latitude: number; longitude: number } | null): Promise<PlaceSuggestion[]> {
  if (input.length < 2) return [];
  const loc = location ? `&location=${location.latitude},${location.longitude}&radius=50000` : '';
  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}${loc}&region=ci&language=fr&key=${GOOGLE_MAPS_KEY}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.status !== 'OK') return [];
  return (json.predictions ?? []).slice(0, 5).map((p: any) => ({
    placeId: p.place_id, description: p.description,
    mainText: p.structured_formatting?.main_text ?? p.description,
    secondaryText: p.structured_formatting?.secondary_text ?? '',
  }));
}

async function getPlaceCoords(placeId: string): Promise<LatLng> {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${GOOGLE_MAPS_KEY}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.status !== 'OK') throw new Error('Impossible de localiser ce lieu.');
  const { lat, lng } = json.result.geometry.location;
  return { lat, lng };
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=fr&key=${GOOGLE_MAPS_KEY}`;
  const res = await fetch(url);
  const json = await res.json();
  return (json.status === 'OK' && json.results.length) ? json.results[0].formatted_address : 'Ma position';
}

export default function ScheduledScreen() {
  const { socket } = useSocket();
  const [trips, setTrips]           = useState<ScheduledTrip[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [editingTrip, setEditingTrip] = useState<ScheduledTrip | null>(null);

  // Location + address
  const [location, setLocation]           = useState<{ latitude: number; longitude: number } | null>(null);
  const [pickupAddress, setPickupAddress]  = useState('Ma position');
  const [pickupCoords, setPickupCoords]    = useState<LatLng | null>(null);
  const [destInput, setDestInput]          = useState('');
  const [destAddress, setDestAddress]      = useState('');
  const [destCoords, setDestCoords]        = useState<LatLng | null>(null);
  const [suggestions, setSuggestions]      = useState<PlaceSuggestion[]>([]);

  // Booking options
  const [vehicleType, setVehicleType]      = useState('standard');
  const [payment, setPayment]              = useState<'cash' | 'wallet'>('wallet');
  const [booking, setBooking]              = useState(false);

  // Date/time picker
  const dateChips = getDateChips();
  const [selectedDate, setSelectedDate]    = useState<Date | null>(null);
  const [selectedHour, setSelectedHour]    = useState<number | null>(null);
  const [selectedMinute, setSelectedMinute] = useState<number>(0);

  const load = async () => {
    try {
      const { data } = await client.get('/rides/scheduled');
      setTrips(data.trips ?? []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('no_driver_found', () => {
      load();
      Alert.alert('Aucun chauffeur disponible', "Votre course programmée n'a pas pu être attribuée à un chauffeur. Elle reste en attente.");
    });
    return () => { socket.off('no_driver_found'); };
  }, [socket]);

  const openNewModal = async () => {
    setEditingTrip(null);
    setDestInput(''); setDestAddress(''); setDestCoords(null);
    setSuggestions([]); setVehicleType('standard');
    setSelectedDate(null); setSelectedHour(null); setSelectedMinute(0);
    setPayment('wallet'); setBooking(false);
    setShowModal(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setLocation(coords);
      setPickupCoords({ lat: coords.latitude, lng: coords.longitude });
      reverseGeocode(coords.latitude, coords.longitude).then(setPickupAddress).catch(() => {});
    } catch {}
  };

  const openEditModal = (trip: ScheduledTrip) => {
    setEditingTrip(trip);
    const d = new Date(trip.scheduledFor);
    const midnightD = new Date(d);
    midnightD.setHours(0, 0, 0, 0);
    setSelectedDate(midnightD);
    setSelectedHour(d.getHours());
    setSelectedMinute(d.getMinutes() >= 30 ? 30 : 0);
    setVehicleType(trip.vehicleType);
    setPayment((trip.paymentMethod as 'cash' | 'wallet') ?? 'wallet');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTrip(null);
  };

  const handleDestChange = async (text: string) => {
    setDestInput(text);
    setDestCoords(null);
    if (text.length < 2) { setSuggestions([]); return; }
    const results = await fetchPlaceSuggestions(text, location);
    setSuggestions(results);
  };

  const handleSelectDest = async (s: PlaceSuggestion) => {
    Keyboard.dismiss();
    setDestInput(s.description);
    setDestAddress(s.description);
    setSuggestions([]);
    try {
      const coords = await getPlaceCoords(s.placeId);
      setDestCoords(coords);
    } catch (err: any) { Alert.alert('Erreur', err.message); }
  };

  const getScheduledDate = (): Date | null => {
    if (!selectedDate || selectedHour === null) return null;
    const d = new Date(selectedDate);
    d.setHours(selectedHour, selectedMinute, 0, 0);
    return d;
  };

  const handleSchedule = async () => {
    const scheduledDate = getScheduledDate();
    if (!scheduledDate) return Alert.alert('Erreur', 'Sélectionnez une date et une heure.');
    if (scheduledDate < new Date(Date.now() + 30 * 60 * 1000)) {
      return Alert.alert('Trop tôt', 'Réservez au minimum 30 minutes à l\'avance.');
    }

    if (editingTrip) {
      setBooking(true);
      try {
        await client.put(`/rides/scheduled/${editingTrip._id}`, {
          vehicleType, paymentMethod: payment,
          scheduledFor: scheduledDate.toISOString(),
        });
        closeModal();
        await load();
        Alert.alert('Course modifiée !', `Nouvelle date : ${scheduledDate.toLocaleDateString('fr-CI')} à ${String(scheduledDate.getHours()).padStart(2,'0')}:${String(scheduledDate.getMinutes()).padStart(2,'0')}`);
      } catch (err: any) { Alert.alert('Erreur', err.message); }
      finally { setBooking(false); }
      return;
    }

    if (!destCoords) return Alert.alert('Erreur', 'Sélectionnez une destination.');
    const pLat = pickupCoords?.lat ?? location?.latitude;
    const pLng = pickupCoords?.lng ?? location?.longitude;
    if (!pLat || !pLng) return Alert.alert('Erreur', 'Position de départ non disponible.');

    setBooking(true);
    try {
      await client.post('/rides/schedule', {
        pickupAddress, pickupLat: pLat, pickupLng: pLng,
        dropoffAddress: destAddress, dropoffLat: destCoords.lat, dropoffLng: destCoords.lng,
        vehicleType, paymentMethod: payment,
        scheduledFor: scheduledDate.toISOString(),
      });
      closeModal();
      await load();
      Alert.alert('Course programmée !', `Votre course du ${scheduledDate.toLocaleDateString('fr-CI')} à ${String(scheduledDate.getHours()).padStart(2,'0')}:${String(scheduledDate.getMinutes()).padStart(2,'0')} a été enregistrée.`);
    } catch (err: any) { Alert.alert('Erreur', err.message); }
    finally { setBooking(false); }
  };

  const cancel = (tripId: string) => {
    Alert.alert('Annuler la course', 'Confirmer l\'annulation de cette course programmée ?', [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui, annuler', style: 'destructive',
        onPress: async () => {
          try {
            await client.post(`/rides/${tripId}/cancel-scheduled`);
            setTrips(prev => prev.filter(t => t._id !== tripId));
          } catch (e: any) { Alert.alert('Erreur', e.message); }
        },
      },
    ]);
  };

  const scheduledDate = getScheduledDate();
  const canSubmit = editingTrip
    ? (!!scheduledDate && scheduledDate > new Date(Date.now() + 30 * 60 * 1000))
    : (!!destCoords && !!scheduledDate && scheduledDate > new Date(Date.now() + 30 * 60 * 1000));

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Courses programmées</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openNewModal}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Programmer</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={trips}
        keyExtractor={t => t._id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🗓</Text>
            <Text style={styles.emptyTitle}>Aucune course programmée</Text>
            <Text style={styles.emptySub}>Appuyez sur "Programmer" pour réserver à l'avance.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.vehicleIcon}>{VEHICLE_ICONS[item.vehicleType] ?? '🚗'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.dateText}>
                  {new Date(item.scheduledFor).toLocaleDateString('fr-CI', { weekday: 'short', day: 'numeric', month: 'short' })}
                  {' à '}
                  {new Date(item.scheduledFor).toLocaleTimeString('fr-CI', { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <Text style={styles.fareText}>{item.estimatedFare.toLocaleString('fr-CI')} FCFA</Text>
              </View>
              <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}>
                <Ionicons name="pencil-outline" size={14} color={T.teal} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => cancel(item._id)}>
                <Text style={styles.cancelText}>Annuler</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.route}>
              <View style={styles.routeDot} />
              <Text style={styles.routeAddr} numberOfLines={1}>{item.pickup.address}</Text>
            </View>
            <View style={[styles.route, { marginTop: 6 }]}>
              <View style={[styles.routeDot, { backgroundColor: T.teal }]} />
              <Text style={styles.routeAddr} numberOfLines={1}>{item.dropoff.address}</Text>
            </View>
          </View>
        )}
      />

      {/* Booking / edit modal */}
      <Modal visible={showModal} animationType="slide" onRequestClose={closeModal}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingTrip ? 'Modifier la course' : 'Programmer une course'}</Text>
            <TouchableOpacity onPress={closeModal}>
              <Ionicons name="close" size={24} color={T.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {editingTrip ? (
              /* Edit mode: show addresses read-only */
              <>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Départ</Text>
                  <View style={styles.readonlyRow}>
                    <Ionicons name="location" size={15} color={T.success} />
                    <Text style={styles.readonlyText} numberOfLines={1}>{editingTrip.pickup.address}</Text>
                  </View>
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Destination</Text>
                  <View style={styles.readonlyRow}>
                    <Ionicons name="location-outline" size={15} color={T.teal} />
                    <Text style={styles.readonlyText} numberOfLines={1}>{editingTrip.dropoff.address}</Text>
                  </View>
                </View>
              </>
            ) : (
              /* New booking: full address inputs */
              <>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Départ</Text>
                  <View style={styles.pickupRow}>
                    <Ionicons name="location" size={16} color={T.success} />
                    <Text style={styles.pickupText} numberOfLines={1}>{pickupAddress}</Text>
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Destination <Text style={{ color: T.danger }}>*</Text></Text>
                  <View style={styles.destInputWrap}>
                    <Ionicons name="location-outline" size={16} color={T.teal} />
                    <TextInput
                      style={styles.destInput}
                      value={destInput}
                      onChangeText={handleDestChange}
                      placeholder="Où aller ?"
                      placeholderTextColor={T.muted}
                      autoCorrect={false}
                      autoCapitalize="none"
                    />
                    {destCoords && <Ionicons name="checkmark-circle" size={18} color={T.success} />}
                  </View>
                  {suggestions.length > 0 && (
                    <View style={styles.suggBox}>
                      {suggestions.map((s, i) => (
                        <TouchableOpacity key={s.placeId} style={[styles.suggRow, i < suggestions.length - 1 && { borderBottomWidth: 1, borderBottomColor: T.border }]} onPress={() => handleSelectDest(s)}>
                          <Ionicons name="location-outline" size={14} color={T.muted} />
                          <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.suggMain} numberOfLines={1}>{s.mainText}</Text>
                            {s.secondaryText ? <Text style={styles.suggSub} numberOfLines={1}>{s.secondaryText}</Text> : null}
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </>
            )}

            {/* Vehicle type */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Véhicule</Text>
              <View style={styles.vehicleRow}>
                {VEHICLE_TYPES.map(v => (
                  <TouchableOpacity key={v.id} style={[styles.vehicleChip, vehicleType === v.id && styles.vehicleChipActive]} onPress={() => setVehicleType(v.id)}>
                    <Text style={styles.vehicleEmoji}>{v.emoji}</Text>
                    <Text style={[styles.vehicleLabel, vehicleType === v.id && { color: T.teal }]}>{v.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Date picker */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Date <Text style={{ color: T.danger }}>*</Text></Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {dateChips.map((chip, idx) => {
                  const active = selectedDate?.toDateString() === chip.date.toDateString();
                  return (
                    <TouchableOpacity key={idx} style={[styles.dateChip, active && styles.dateChipActive]} onPress={() => setSelectedDate(chip.date)}>
                      <Text style={[styles.dateChipText, active && styles.dateChipTextActive]}>{chip.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Time picker */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Heure <Text style={{ color: T.danger }}>*</Text></Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {TIME_SLOTS.map((slot, idx) => {
                  const active = selectedHour === slot.hour && selectedMinute === slot.minute;
                  return (
                    <TouchableOpacity key={idx} style={[styles.timeChip, active && styles.timeChipActive]} onPress={() => { setSelectedHour(slot.hour); setSelectedMinute(slot.minute); }}>
                      <Text style={[styles.timeChipText, active && styles.timeChipTextActive]}>{slot.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              {selectedDate && selectedHour !== null && (
                <Text style={styles.dateHint}>
                  {selectedDate.toLocaleDateString('fr-CI', { weekday: 'long', day: 'numeric', month: 'long' })} à {String(selectedHour).padStart(2,'0')}:{String(selectedMinute).padStart(2,'0')}
                </Text>
              )}
              {!selectedDate || selectedHour === null
                ? <Text style={styles.dateHintMuted}>Minimum 30 minutes à l'avance · Max 7 jours</Text>
                : null
              }
            </View>

            {/* Payment */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Paiement</Text>
              <View style={styles.paymentRow}>
                {(['wallet', 'cash'] as const).map(m => (
                  <TouchableOpacity key={m} style={[styles.payChip, payment === m && styles.payChipActive]} onPress={() => setPayment(m)}>
                    <Ionicons name={m === 'cash' ? 'cash-outline' : 'wallet-outline'} size={16} color={payment === m ? T.teal : T.muted} />
                    <Text style={[styles.payChipText, payment === m && { color: T.teal }]}>{m === 'cash' ? 'Espèces' : 'Portefeuille'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.confirmBtn, (!canSubmit || booking) && { opacity: 0.5 }]}
              onPress={handleSchedule}
              disabled={!canSubmit || booking}
            >
              {booking
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.confirmBtnText}>{editingTrip ? 'Modifier la réservation' : 'Confirmer la réservation'}</Text>
              }
            </TouchableOpacity>

            <View style={{ height: 32 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: T.bg },
  headerRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  heading:     { color: T.text, fontSize: 22, fontWeight: T.xbold },
  addBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.teal, borderRadius: T.rFull, paddingHorizontal: 16, paddingVertical: 9 },
  addBtnText:  { color: '#fff', fontSize: 13, fontWeight: T.bold },
  list:        { paddingHorizontal: 16, paddingBottom: 40 },

  empty:       { alignItems: 'center', paddingTop: 80 },
  emptyIcon:   { fontSize: 48, marginBottom: 12 },
  emptyTitle:  { color: T.text, fontSize: 18, fontWeight: T.bold, marginBottom: 6 },
  emptySub:    { color: T.sub, fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 40 },

  card:        { backgroundColor: T.surface, borderRadius: T.r16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: T.border },
  cardHeader:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  vehicleIcon: { fontSize: 26 },
  dateText:    { color: T.text, fontSize: 15, fontWeight: T.bold },
  fareText:    { color: T.teal, fontSize: 13, marginTop: 2 },
  editBtn:     { width: 32, height: 32, borderRadius: 16, backgroundColor: T.tealDim, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.tealBorder },
  cancelBtn:   { backgroundColor: `${T.danger}18`, borderRadius: T.r8, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: `${T.danger}44` },
  cancelText:  { color: T.danger, fontSize: 12, fontWeight: T.semi },
  route:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  routeDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: T.success },
  routeAddr:   { color: T.sub, fontSize: 13, flex: 1 },

  // Modal
  modalSafe:     { flex: 1, backgroundColor: T.bg },
  modalHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: T.border },
  modalTitle:    { color: T.text, fontSize: 18, fontWeight: T.xbold },
  modalScroll:   { flex: 1, padding: 20 },

  fieldGroup:    { marginBottom: 22 },
  fieldLabel:    { color: T.sub, fontSize: 12, fontWeight: T.semi, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 },

  readonlyRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: T.surface, borderRadius: T.r12, padding: 14, borderWidth: 1, borderColor: T.border },
  readonlyText:  { color: T.sub, fontSize: 14, flex: 1 },

  pickupRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: T.surface, borderRadius: T.r12, padding: 14, borderWidth: 1, borderColor: T.border },
  pickupText:    { color: T.sub, fontSize: 14, flex: 1 },

  destInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: T.surface, borderRadius: T.r12, padding: 14, borderWidth: 1.5, borderColor: T.tealBorder },
  destInput:     { flex: 1, color: T.text, fontSize: 14 },
  suggBox:       { backgroundColor: T.surface, borderRadius: T.r12, borderWidth: 1, borderColor: T.border, marginTop: 4, overflow: 'hidden' },
  suggRow:       { flexDirection: 'row', alignItems: 'flex-start', padding: 12 },
  suggMain:      { color: T.text, fontSize: 13, fontWeight: T.semi },
  suggSub:       { color: T.muted, fontSize: 11, marginTop: 2 },

  vehicleRow:    { flexDirection: 'row', gap: 8 },
  vehicleChip:   { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: T.r12, borderWidth: 1.5, borderColor: T.border, backgroundColor: T.surface, gap: 4 },
  vehicleChipActive: { borderColor: T.teal, backgroundColor: T.tealDim },
  vehicleEmoji:  { fontSize: 24 },
  vehicleLabel:  { color: T.sub, fontSize: 11, fontWeight: T.semi },

  dateChip:      { paddingHorizontal: 16, paddingVertical: 10, borderRadius: T.rFull, backgroundColor: T.surface, borderWidth: 1.5, borderColor: T.border },
  dateChipActive:{ borderColor: T.teal, backgroundColor: T.tealDim },
  dateChipText:  { color: T.sub, fontSize: 13, fontWeight: T.semi },
  dateChipTextActive: { color: T.teal },

  timeChip:      { paddingHorizontal: 14, paddingVertical: 9, borderRadius: T.r8, backgroundColor: T.surface, borderWidth: 1.5, borderColor: T.border },
  timeChipActive:{ borderColor: T.teal, backgroundColor: T.tealDim },
  timeChipText:  { color: T.sub, fontSize: 13, fontWeight: T.semi },
  timeChipTextActive: { color: T.teal },

  dateHint:      { color: T.teal, fontSize: 12, marginTop: 10, fontWeight: T.semi },
  dateHintMuted: { color: T.muted, fontSize: 11, marginTop: 8 },

  paymentRow:    { flexDirection: 'row', gap: 10 },
  payChip:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: T.r12, borderWidth: 1.5, borderColor: T.border, backgroundColor: T.surface },
  payChipActive: { borderColor: T.teal, backgroundColor: T.tealDim },
  payChipText:   { color: T.muted, fontSize: 13, fontWeight: T.semi },

  confirmBtn:    { backgroundColor: T.teal, borderRadius: T.rFull, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  confirmBtnText:{ color: '#fff', fontWeight: T.xbold, fontSize: 16 },
});
