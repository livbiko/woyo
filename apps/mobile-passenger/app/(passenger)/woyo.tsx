import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator, Alert, Keyboard, SafeAreaView, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import client from '../../src/api/client';
import { useSocket } from '../../src/hooks/useSocket';
import { T } from '../../src/theme';

const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

interface PlaceSuggestion { placeId: string; description: string; mainText: string; secondaryText: string; }
interface Quartier { _id: string; name: string; fare: number; }
interface LocaliteCity { _id: string; name: string; fare: number; quartiers: Quartier[]; }
interface MatchableLocalite { _id: string; name: string; fare: number; }

// Cities carry their own fare AND a nested quartiers[] (Abidjan: Cocody,
// Plateau, etc., each with a different fare). Matching only against the
// top-level city list means an Abidjan address always resolves to the
// generic city-level fare and never the correct quartier fare — flatten
// both into one list so a quartier name can match directly, and put
// quartiers first so they're preferred over their parent city on an
// address-substring fallback match.
const flattenLocalites = (cities: LocaliteCity[]): MatchableLocalite[] => [
  ...cities.flatMap(c => c.quartiers.map(q => ({ _id: q._id, name: q.name, fare: q.fare }))),
  ...cities.map(c => ({ _id: c._id, name: c.name, fare: c.fare })),
];

const fetchPlaceSuggestions = async (input: string, location: { latitude: number; longitude: number } | null): Promise<PlaceSuggestion[]> => {
  if (input.length < 2) return [];
  const loc = location ? `&location=${location.latitude},${location.longitude}&radius=50000` : '';
  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}${loc}&region=ci&language=fr&key=${GOOGLE_MAPS_KEY}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.status !== 'OK') return [];
  return (json.predictions || []).slice(0, 5).map((p: any) => ({
    placeId: p.place_id, description: p.description,
    mainText: p.structured_formatting?.main_text ?? p.description,
    secondaryText: p.structured_formatting?.secondary_text ?? '',
  }));
};

const getPlaceCoords = async (placeId: string) => {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${GOOGLE_MAPS_KEY}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.status !== 'OK') throw new Error('Impossible de localiser ce lieu.');
  return json.result.geometry.location as { lat: number; lng: number };
};

const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=fr&key=${GOOGLE_MAPS_KEY}`;
  const res = await fetch(url);
  const json = await res.json();
  return (json.status === 'OK' && json.results.length) ? json.results[0].formatted_address : 'Ma position';
};

export default function WoyoScreen() {
  const router = useRouter();
  const { socket } = useSocket();
  const { localiteId: preLocaliteId, fare: preFare } = useLocalSearchParams<{ localiteId?: string; fare?: string }>();

  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [pickupAddress, setPickupAddress] = useState('Ma position');
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [pickupInput, setPickupInput] = useState('');
  const [pickupEditing, setPickupEditing] = useState(false);
  const [pickupSuggestions, setPickupSuggestions] = useState<PlaceSuggestion[]>([]);

  const [dropoffAddress, setDropoffAddress] = useState('');
  const [dropoffCoords, setDropoffCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [dropoffSuggestions, setDropoffSuggestions] = useState<PlaceSuggestion[]>([]);

  const [localites, setLocalites] = useState<LocaliteCity[]>([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [locationMatchStatus, setLocationMatchStatus] = useState<'loading' | 'matched' | 'unmatched'>('loading');

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'wave' | 'mtn_momo'>('cash');
  const [booking, setBooking] = useState(false);

  // Post-booking state
  const [phase, setPhase] = useState<'form' | 'searching' | 'joined' | 'no_driver'>('form');
  const [joinedData, setJoinedData] = useState<{ fare: number; driver: { name: string; vehiclePlate: string; vehicleType: string; rating: number }; distKm: string } | null>(null);
  const [searchFare, setSearchFare] = useState(0);

  const dropoffDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pickupDebounce  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const matchableLocalites = flattenLocalites(localites);
  const selectedCityObj = matchableLocalites.find(c => c._id === selectedCity);
  const effectiveLocaliteId = selectedCity;
  const effectiveFare = selectedCityObj?.fare ?? 0;
  const canBook = !!dropoffCoords && !!effectiveLocaliteId && locationMatchStatus === 'matched';

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setLocation(coords);
      reverseGeocode(coords.latitude, coords.longitude).then(setPickupAddress).catch(() => {});
    })();
    loadLocalites();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('woyo_trip_joined', (data: any) => {
      setBooking(false);
      setJoinedData({ fare: data.fare, driver: data.driver, distKm: data.distKm });
      setPhase('joined');
    });
    socket.on('driver_found', () => {
      setBooking(false);
      setPhase('joined');
    });
    socket.on('no_driver_found', () => {
      setBooking(false);
      setPhase('no_driver');
    });
    return () => {
      socket.off('woyo_trip_joined');
      socket.off('driver_found');
      socket.off('no_driver_found');
    };
  }, [socket]);

  useEffect(() => {
    if (localites.length === 0) return;
    if (!pickupAddress || pickupAddress === 'Ma position') { setLocationMatchStatus('loading'); return; }
    const addr = pickupAddress.toLowerCase();
    // Split "Rue X, Cocody, Abidjan, Côte d'Ivoire" into components and match each
    // exactly against BOTH quartiers and cities — matching against quartiers
    // is what actually lets "Cocody" win over "Abidjan" (the two used to be
    // matched from separate lists, so a Cocody address always fell through
    // to the generic Abidjan city fare instead of Cocody's own fare).
    const matchable = flattenLocalites(localites);
    const components = addr.split(',').map(s => s.trim());
    for (const component of components) {
      const match = matchable.find(c => component === c.name.toLowerCase());
      if (match) {
        setSelectedCity(match._id);
        setLocationMatchStatus('matched');
        return;
      }
    }
    // Fallback: substring match on full address
    const fallback = matchable.find(c => addr.includes(c.name.toLowerCase()));
    if (fallback) {
      setSelectedCity(fallback._id);
      setLocationMatchStatus('matched');
      return;
    }
    setLocationMatchStatus('unmatched');
  }, [pickupAddress, localites]);

  const loadLocalites = async () => {
    try {
      const { data } = await client.get('/woyo/localites');
      if (data.success) {
        setLocalites(data.localites);
        if (preLocaliteId) {
          const match = flattenLocalites(data.localites as LocaliteCity[]).find(c => c._id === preLocaliteId);
          if (match) setSelectedCity(match._id);
        }
      }
    } catch {}
  };

  const handlePickupChange = (text: string) => {
    setPickupInput(text);
    if (pickupDebounce.current) clearTimeout(pickupDebounce.current);
    if (text.length < 2) { setPickupSuggestions([]); return; }
    pickupDebounce.current = setTimeout(async () => {
      const results = await fetchPlaceSuggestions(text, location);
      setPickupSuggestions(results);
    }, 350);
  };

  const handleSelectPickup = async (s: PlaceSuggestion) => {
    setPickupEditing(false);
    setPickupSuggestions([]);
    setPickupAddress(s.mainText);
    setPickupInput('');
    Keyboard.dismiss();
    try { setPickupCoords(await getPlaceCoords(s.placeId)); } catch {}
  };

  const handleDropoffChange = (text: string) => {
    setDropoffAddress(text);
    setDropoffCoords(null);
    if (dropoffDebounce.current) clearTimeout(dropoffDebounce.current);
    if (text.length < 2) { setDropoffSuggestions([]); return; }
    dropoffDebounce.current = setTimeout(async () => {
      const results = await fetchPlaceSuggestions(text, location);
      setDropoffSuggestions(results);
    }, 350);
  };

  const handleSelectDropoff = async (s: PlaceSuggestion) => {
    setDropoffAddress(s.description);
    setDropoffSuggestions([]);
    Keyboard.dismiss();
    try { setDropoffCoords(await getPlaceCoords(s.placeId)); } catch {}
  };

  const handleBook = async () => {
    const pLat = pickupCoords?.lat ?? location?.latitude;
    const pLng = pickupCoords?.lng ?? location?.longitude;
    if (!pLat || !pLng || !dropoffCoords || !effectiveLocaliteId) return;
    setBooking(true);
    try {
      const { data } = await client.post('/rides/woyo', {
        pickupAddress, pickupLat: pLat, pickupLng: pLng,
        dropoffAddress, dropoffLat: dropoffCoords.lat, dropoffLng: dropoffCoords.lng,
        paymentMethod, localiteId: effectiveLocaliteId,
      });
      if (data.joined && data.trip) {
        // Immediate join — socket event may come too; set state defensively
        setJoinedData({ fare: data.fare, driver: data.trip.driver, distKm: '—' });
        setPhase('joined');
        setBooking(false);
      } else {
        setSearchFare(data.fare ?? effectiveFare);
        setPhase('searching');
        setBooking(false);
      }
    } catch (err: any) {
      setBooking(false);
      if (err.response?.data?.code === 'NO_WOYO_DRIVER') {
        setPhase('no_driver');
      } else {
        Alert.alert('Erreur', err.message ?? 'Une erreur est survenue.');
      }
    }
  };

  const handleReset = () => {
    setPhase('form');
    setDropoffAddress('');
    setDropoffCoords(null);
    setJoinedData(null);
    setSearchFare(0);
  };

  if (phase === 'searching') {
    return (
      <SafeAreaView style={s.flex}>
        <View style={s.centeredState}>
          <ActivityIndicator color={T.teal} size="large" />
          <Text style={s.stateTitle}>Recherche d'un chauffeur Woyo…</Text>
          <Text style={s.stateSub}>Tarif fixe : {searchFare} FCFA / passager</Text>
          <TouchableOpacity style={s.secondaryBtn} onPress={handleReset}>
            <Text style={s.secondaryBtnText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'no_driver') {
    return (
      <SafeAreaView style={s.flex}>
        <View style={s.centeredState}>
          <Text style={[s.stateEmoji]}>😔</Text>
          <Text style={s.stateTitle}>Aucun chauffeur Woyo disponible</Text>
          <Text style={s.stateSub}>Aucun chauffeur Woyo n'est disponible dans votre zone pour l'instant. Réessayez dans quelques minutes.</Text>
          <TouchableOpacity style={s.primaryBtn} onPress={handleReset}>
            <Text style={s.primaryBtnText}>Réessayer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.secondaryBtn} onPress={() => router.back()}>
            <Text style={s.secondaryBtnText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'joined') {
    const d = joinedData;
    return (
      <SafeAreaView style={s.flex}>
        <View style={s.centeredState}>
          <Text style={s.stateEmoji}>🚐</Text>
          <Text style={s.stateTitle}>Course Woyo confirmée !</Text>
          {d?.driver && (
            <View style={s.driverCard}>
              <Text style={s.driverName}>{d.driver.name}</Text>
              <Text style={s.driverPlate}>{d.driver.vehiclePlate}</Text>
              <View style={s.driverRow}>
                <Ionicons name="star" size={14} color={T.warning} />
                <Text style={s.driverRating}> {d.driver.rating?.toFixed(1) ?? '—'}</Text>
              </View>
            </View>
          )}
          {d && <Text style={s.fareConfirmed}>{d.fare} FCFA / passager</Text>}
          <Text style={s.stateSub}>Votre chauffeur arrive. Soyez prêt à votre point de départ.</Text>
          <TouchableOpacity style={s.primaryBtn} onPress={() => router.replace('/(passenger)/')}>
            <Text style={s.primaryBtnText}>Suivre ma course</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.flex}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={T.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Woyo — Course partagée</Text>
      </View>

      <ScrollView style={s.flex} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">

        {/* Fare badge */}
        {effectiveFare > 0 && (
          <View style={s.fareBadge}>
            <Text style={s.fareBadgeLabel}>Tarif fixe</Text>
            <Text style={s.fareBadgeValue}>{effectiveFare} FCFA / passager</Text>
          </View>
        )}

        {/* Address section */}
        <Text style={s.sectionLabel}>Itinéraire</Text>
        <View style={s.addressBox}>
          {/* Pickup */}
          <TouchableOpacity style={s.addrRow} onPress={() => setPickupEditing(true)} activeOpacity={0.8}>
            <View style={[s.addrDot, { backgroundColor: T.success }]} />
            {pickupEditing ? (
              <TextInput
                style={s.addrInput}
                autoFocus
                value={pickupInput}
                onChangeText={handlePickupChange}
                placeholder="Adresse de départ"
                placeholderTextColor={T.muted}
                onBlur={() => { if (!pickupInput) setPickupEditing(false); }}
              />
            ) : (
              <Text style={s.addrText} numberOfLines={1}>{pickupAddress}</Text>
            )}
          </TouchableOpacity>
          {pickupEditing && pickupSuggestions.length > 0 && (
            <View style={s.suggestions}>
              {pickupSuggestions.map(s2 => (
                <TouchableOpacity key={s2.placeId} style={s.suggestionRow} onPress={() => handleSelectPickup(s2)}>
                  <Ionicons name="location-outline" size={14} color={T.muted} />
                  <View style={s.suggestionText}>
                    <Text style={s.suggestionMain}>{s2.mainText}</Text>
                    {!!s2.secondaryText && <Text style={s.suggestionSub}>{s2.secondaryText}</Text>}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={s.addrDivider} />

          {/* Dropoff */}
          <View style={s.addrRow}>
            <View style={[s.addrDot, { backgroundColor: T.teal }]} />
            <TextInput
              style={s.addrInput}
              value={dropoffAddress}
              onChangeText={handleDropoffChange}
              placeholder="Destination"
              placeholderTextColor={T.muted}
            />
          </View>
          {dropoffSuggestions.length > 0 && (
            <View style={s.suggestions}>
              {dropoffSuggestions.map(s2 => (
                <TouchableOpacity key={s2.placeId} style={s.suggestionRow} onPress={() => handleSelectDropoff(s2)}>
                  <Ionicons name="location-outline" size={14} color={T.muted} />
                  <View style={s.suggestionText}>
                    <Text style={s.suggestionMain}>{s2.mainText}</Text>
                    {!!s2.secondaryText && <Text style={s.suggestionSub}>{s2.secondaryText}</Text>}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Position section */}
        <Text style={s.sectionLabel}>Votre position</Text>
        <View style={s.positionCard}>
          <View style={s.positionRow}>
            <View style={s.positionIconWrap}>
              <Ionicons name="location" size={18} color={T.teal} />
            </View>
            <Text style={s.positionAddress} numberOfLines={2}>
              {pickupAddress === 'Ma position' ? 'Détection GPS en cours…' : pickupAddress}
            </Text>
          </View>
          {locationMatchStatus === 'loading' && (
            <ActivityIndicator color={T.teal} size="small" style={s.positionLoading} />
          )}
          {locationMatchStatus === 'matched' && selectedCityObj && (
            <>
              <View style={s.positionZone}>
                <Ionicons name="checkmark-circle" size={14} color={T.teal} />
                <Text style={{ color: T.teal, fontSize: 12, fontWeight: '600', marginLeft: 4 }}>
                  Zone détectée : {selectedCityObj.name}
                </Text>
              </View>
              <View style={s.positionFareRow}>
                <Text style={s.positionFareLabel}>Prix de la course</Text>
                <Text style={s.positionFareValue}>{effectiveFare} FCFA</Text>
              </View>
            </>
          )}
          {locationMatchStatus === 'unmatched' && (
            <Text style={s.positionUnmatched}>
              Zone non couverte. Rapprochez-vous d'une zone Woyo.
            </Text>
          )}
        </View>

        {/* Payment */}
        <Text style={s.sectionLabel}>Paiement</Text>
        <View style={s.payRow}>
          {([
            { id: 'wave'     as const, icon: 'phone-portrait-outline', label: 'Wave' },
            { id: 'mtn_momo' as const, icon: 'phone-portrait-outline', label: 'MTN MoMo' },
            { id: 'cash'     as const, icon: 'cash-outline',           label: 'Espèces' },
          ]).map(m => (
            <TouchableOpacity
              key={m.id}
              style={[s.payOption, paymentMethod === m.id && s.payOptionSelected]}
              onPress={() => setPaymentMethod(m.id)}
              activeOpacity={0.8}
            >
              <Ionicons name={m.icon as any} size={18} color={paymentMethod === m.id ? '#fff' : T.muted} />
              <Text style={[s.payLabel, paymentMethod === m.id && { color: '#fff' }]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Info callout */}
        <View style={s.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color={T.blue} />
          <Text style={s.infoText}>Le tarif est fixe par passager. Vous pouvez être mis en relation avec un chauffeur qui transporte déjà d'autres passagers.</Text>
        </View>

        {/* Book button */}
        <TouchableOpacity
          style={[s.bookBtn, (!canBook || booking) && s.bookBtnDisabled]}
          onPress={handleBook}
          disabled={!canBook || booking}
          activeOpacity={0.85}
        >
          {booking
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.bookBtnText}>
                {effectiveFare > 0 ? `Réserver — ${effectiveFare} FCFA` : 'Réserver une course Woyo'}
              </Text>
          }
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: T.bg },
  scrollContent: { padding: 16, paddingBottom: 40 },

  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: T.border },
  backBtn: { marginRight: 12, padding: 2 },
  headerTitle: { fontSize: 17, fontWeight: T.semi, color: T.text },

  fareBadge: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: T.teal + '14', borderRadius: T.r12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: T.teal + '30' },
  fareBadgeLabel: { fontSize: 13, color: T.sub },
  fareBadgeValue: { fontSize: 15, fontWeight: T.bold, color: T.teal },

  sectionLabel: { fontSize: 13, fontWeight: T.semi, color: T.sub, marginBottom: 8, marginTop: 4 },
  sectionLabelSmall: { fontSize: 12, color: T.muted, marginBottom: 6, marginTop: 8 },

  addressBox: { backgroundColor: T.surface, borderRadius: T.r12, borderWidth: 1, borderColor: T.border, marginBottom: 20, overflow: 'hidden' },
  addrRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12 },
  addrDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  addrText: { flex: 1, fontSize: 14, color: T.text },
  addrInput: { flex: 1, fontSize: 14, color: T.text },
  addrDivider: { height: 1, backgroundColor: T.border, marginLeft: 32 },

  suggestions: { backgroundColor: T.bg, borderTopWidth: 1, borderTopColor: T.border },
  suggestionRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: T.border },
  suggestionText: { flex: 1 },
  suggestionMain: { fontSize: 13, color: T.text },
  suggestionSub: { fontSize: 11, color: T.muted, marginTop: 1 },

  chipRow: { gap: 8, paddingBottom: 4, marginBottom: 4 },
  chip: { flexDirection: 'column', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: T.rFull, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, minWidth: 80 },
  chipSelected: { backgroundColor: T.teal, borderColor: T.teal },
  chipText: { fontSize: 13, fontWeight: T.semi, color: T.text },
  chipTextSelected: { color: '#fff' },
  chipFare: { fontSize: 11, color: T.muted, marginTop: 2 },

  positionCard:      { backgroundColor: T.surface, borderRadius: T.r12, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 20 },
  positionRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  positionIconWrap:  { width: 32, height: 32, borderRadius: 16, backgroundColor: T.tealDim, alignItems: 'center', justifyContent: 'center' },
  positionAddress:   { flex: 1, fontSize: 13, color: T.text, lineHeight: 18 },
  positionZone:      { flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 2 },
  positionFareRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: T.tealDim, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: T.tealBorder },
  positionFareLabel: { color: T.sub, fontSize: 12 },
  positionFareValue: { color: T.teal, fontSize: 16, fontWeight: T.bold },
  positionLoading:   { marginTop: 4 },
  positionUnmatched: { fontSize: 12, color: T.danger, marginTop: 4 },

  payRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  payOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: T.r12, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface },
  payOptionSelected: { backgroundColor: T.teal, borderColor: T.teal },
  payLabel: { fontSize: 13, fontWeight: T.semi, color: T.muted },

  infoBox: { flexDirection: 'row', gap: 8, backgroundColor: T.blue + '10', borderRadius: T.r12, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: T.blue + '30' },
  infoText: { flex: 1, fontSize: 12, color: T.sub, lineHeight: 18 },

  bookBtn: { backgroundColor: T.teal, borderRadius: T.r16, padding: 16, alignItems: 'center' },
  bookBtnDisabled: { opacity: 0.45 },
  bookBtnText: { color: '#fff', fontSize: 16, fontWeight: T.bold },

  // Post-booking states
  centeredState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  stateEmoji: { fontSize: 52, marginBottom: 8 },
  stateTitle: { fontSize: 20, fontWeight: T.bold, color: T.text, textAlign: 'center' },
  stateSub: { fontSize: 14, color: T.sub, textAlign: 'center', lineHeight: 20 },

  driverCard: { backgroundColor: T.surface, borderRadius: T.r16, padding: 16, alignItems: 'center', width: '100%', borderWidth: 1, borderColor: T.border, marginTop: 8 },
  driverName: { fontSize: 16, fontWeight: T.bold, color: T.text },
  driverPlate: { fontSize: 14, color: T.sub, marginTop: 2 },
  driverRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  driverRating: { fontSize: 13, color: T.text },
  fareConfirmed: { fontSize: 18, fontWeight: T.bold, color: T.teal, marginTop: 4 },

  primaryBtn: { backgroundColor: T.teal, borderRadius: T.r16, paddingHorizontal: 32, paddingVertical: 14, marginTop: 8, width: '100%', alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: T.bold },
  secondaryBtn: { borderRadius: T.r16, paddingHorizontal: 32, paddingVertical: 12, borderWidth: 1, borderColor: T.border, width: '100%', alignItems: 'center' },
  secondaryBtnText: { color: T.sub, fontSize: 14 },
});
