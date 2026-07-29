import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator, Alert, Animated, Dimensions, Keyboard, Linking, Modal, SafeAreaView, ScrollView,
  Share, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { useQuery } from 'convex/react';
import Button from '../../src/components/Button';
import RatingModal from '../../src/components/RatingModal';
import TripChat from '../../src/components/TripChat';
import SupportChat from '../../src/components/SupportChat';
import client from '../../src/api/client';
import { useSocket } from '../../src/hooks/useSocket';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../convex/_generated/api';
import { T } from '../../src/theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const VEHICLE_TYPES: { id: string; emoji: string; label: string; desc: string }[] = [
  { id: 'moto',     emoji: '🏍️', label: 'Moto',     desc: 'Rapide & éco' },
  { id: 'standard', emoji: '🚗',  label: 'Standard', desc: 'Confortable' },
  { id: 'comfort',  emoji: '🚙',  label: 'Comfort',  desc: 'Berline premium' },
  { id: 'xl',       emoji: '🚐',  label: 'XL',       desc: "Jusqu'à 6 places" },
];

const VEHICLE_DISPLAY = [
  { emoji: '🏍️', label: 'Moto',     bg: '#7C3AED' },
  { emoji: '🚗',  label: 'Standard', bg: '#22C55E' },
  { emoji: '🚙',  label: 'Comfort',  bg: '#E8701A' },
  { emoji: '🚐',  label: 'XL',       bg: '#059669' },
];

const SERVICES = [
  { id: 'course',        emoji: '🚗',  label: 'Course',        desc: 'Réservez maintenant',  color: '#0EA5E9', nav: null,                             vehiclePreset: undefined },
  { id: 'programmee',    emoji: '🗓',  label: 'Programmée',    desc: "Réservez à l'avance",  color: '#7C3AED', nav: '/(passenger)/scheduled',         vehiclePreset: undefined },
  { id: 'woyo',          emoji: '🚗',  label: 'Woyo',            desc: 'Course partagée',     color: '#0D9488', nav: '/(passenger)/woyo',              vehiclePreset: undefined },
  { id: 'xl',            emoji: '🚐',  label: 'XL',              desc: "Jusqu'à 6 places",    color: '#059669', nav: null,                             vehiclePreset: 'xl' },
  { id: 'courier',       emoji: '📦',  label: 'Courier',         desc: 'Moto & Car',          color: '#7C3AED', nav: null,                             vehiclePreset: undefined },
];

interface Estimate { fare: number; distanceKm: number; durationMin: number; surgeMultiplier: number; }
interface NearbyDriver { _id: string; vehicleType: string; lat: number; lng: number; }
interface ActiveTrip { _id: string; status: string; vehicleType?: string; driver?: { _id: string; name: string; phone: string; vehiclePlate: string; rating: number; }; estimatedFare: number; dropoff?: { address?: string; coordinates?: { lat: number; lng: number } }; estimatedDistance?: number; }
interface SavedAddress { _id: string; label: string; address: string; lat: number; lng: number; }
interface TripReceipt { tripId: string; finalFare: number; driverName?: string; vehiclePlate?: string; distanceKm?: number; dropoffAddress?: string; }
interface LatLng { lat: number; lng: number; }
interface PlaceSuggestion { placeId: string; description: string; mainText: string; secondaryText: string; }

const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

// Outside Abidjan, lead with the Woyo shared-ride flow instead of the
// full services grid. Abidjan stays on this screen unchanged (full
// catalog), matching the plan's region split. Reuses the same
// locality-matching approach as woyo.tsx (split the reverse-geocoded
// address into components, match against known localites) rather than
// duplicating booking/fare logic.

const decodePolyline = (encoded: string): { latitude: number; longitude: number }[] => {
  const pts: { latitude: number; longitude: number }[] = [];
  let idx = 0, lat = 0, lng = 0;
  while (idx < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(idx++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(idx++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    pts.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return pts;
};

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

const getPlaceCoords = async (placeId: string): Promise<LatLng> => {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${GOOGLE_MAPS_KEY}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.status !== 'OK') throw new Error('Impossible de localiser ce lieu.');
  const { lat, lng } = json.result.geometry.location;
  return { lat, lng };
};

const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=fr&key=${GOOGLE_MAPS_KEY}`;
  const res = await fetch(url);
  const json = await res.json();
  return (json.status === 'OK' && json.results.length) ? json.results[0].formatted_address : 'Ma position';
};

const TRIP_STATUS_LABELS: Record<string, string> = {
  searching: "Recherche d'un chauffeur…",
  accepted: 'Chauffeur en route',
  driver_arriving: 'Chauffeur presque arrivé',
  arrived: 'Chauffeur sur place',
  in_progress: 'En cours de route',
};

export default function HomeScreen() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const router = useRouter();
  const { prefillDest, openSearch } = useLocalSearchParams<{ prefillDest?: string; openSearch?: string }>();
  const mapRef = useRef<MapView>(null);

  const [location, setLocation]           = useState<{ latitude: number; longitude: number } | null>(null);
  const [pickupAddress, setPickupAddress] = useState('Ma position');
  const [pickupCoords, setPickupCoords]   = useState<LatLng | null>(null);
  const [pickupInput, setPickupInput]     = useState('');
  const [pickupEditing, setPickupEditing] = useState(false);
  const [pickupSuggestions, setPickupSuggestions] = useState<PlaceSuggestion[]>([]);
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [suggestions, setSuggestions]     = useState<PlaceSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const suggestDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pickupDebounce  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [vehicleType, setVehicleType]     = useState('standard');
  const [estimates, setEstimates]         = useState<Record<string, Estimate>>({});
  const [dropoffCoords, setDropoffCoords] = useState<LatLng | null>(null);
  const [estimating, setEstimating]       = useState(false);

  const [activeTrip, setActiveTrip]       = useState<ActiveTrip | null>(null);
  const [searching, setSearching]         = useState(false);
  const [booking, setBooking]             = useState(false);
  const [chatOpen, setChatOpen]           = useState(false);
  const [editingDest, setEditingDest]     = useState(false);
  const [newDestInput, setNewDestInput]   = useState('');
  const [destSuggestions, setDestSuggestions] = useState<PlaceSuggestion[]>([]);
  const [savingDest, setSavingDest]       = useState(false);

  const [nearbyDrivers, setNearbyDrivers] = useState<NearbyDriver[]>([]);

  const [completedTripId, setCompletedTripId] = useState<string | null>(null);
  const [receipt, setReceipt]             = useState<TripReceipt | null>(null);
  const [routeCoords, setRouteCoords]     = useState<{ latitude: number; longitude: number }[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'wallet' | 'orange_money' | 'wave' | 'mtn_momo'>('wallet');
  const [pendingPayment, setPendingPayment] = useState<{ tripId: string; method: string; amount: number; paymentUrl: string | null } | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [promoCode, setPromoCode]         = useState('');
  const [promoResult, setPromoResult]     = useState<{ discount: number; finalFare: number; code: string } | null>(null);
  const [promoLoading, setPromoLoading]   = useState(false);
  const [showPromo, setShowPromo]         = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [showSaveAddr, setShowSaveAddr]   = useState(false);
  const [saveLabel, setSaveLabel]         = useState('');
  const [savingAddr, setSavingAddr]       = useState(false);

  // Surge live state
  const [liveMultiplier, setLiveMultiplier] = useState(1);
  const surgeAnim        = useRef(new Animated.Value(1)).current;
  const surgeLoopRef     = useRef<Animated.CompositeAnimation | null>(null);
  const dropoffCoordsRef = useRef<LatLng | null>(null);
  const lastMultiplier   = useRef(1);

  // New Uber-style state
  const [searchActive, setSearchActive]         = useState(false);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [showCourierSub, setShowCourierSub]     = useState(false);

  // Keep dropoffCoords accessible inside interval without re-creating it
  useEffect(() => { dropoffCoordsRef.current = dropoffCoords; }, [dropoffCoords]);

  // Poll surge status every 60s — re-fetch estimates if multiplier changed
  useEffect(() => {
    const poll = async () => {
      try {
        const { data } = await client.get('/drivers/surge-status');
        const m: number = data.multiplier ?? 1;
        setLiveMultiplier(m);
        if (m !== lastMultiplier.current && dropoffCoordsRef.current) {
          lastMultiplier.current = m;
          fetchAllEstimates(dropoffCoordsRef.current);
        }
      } catch {}
    };
    poll();
    const id = setInterval(poll, 60_000);
    return () => clearInterval(id);
  }, []);

  // Pulse animation when surge is active
  useEffect(() => {
    surgeLoopRef.current?.stop();
    if (liveMultiplier > 1) {
      surgeLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(surgeAnim, { toValue: 1.06, duration: 700, useNativeDriver: true }),
          Animated.timing(surgeAnim, { toValue: 1,    duration: 700, useNativeDriver: true }),
        ])
      );
      surgeLoopRef.current.start();
    } else {
      surgeAnim.setValue(1);
    }
  }, [liveMultiplier]);

  useEffect(() => {
    if (!prefillDest) return;
    setDropoffAddress(String(prefillDest));
    setSearchActive(true);
  }, [prefillDest]);

  useEffect(() => {
    if (openSearch === '1') setSearchActive(true);
  }, [openSearch]);

  const phase = (activeTrip || searching) ? 'trip' : dropoffCoords && Object.keys(estimates).length > 0 ? 'booking' : 'search';

  const fetchNearbyDrivers = useCallback(async (lat: number, lng: number) => {
    try {
      const { data } = await client.get(`/drivers/nearby?lat=${lat}&lng=${lng}`);
      if (data.success) setNearbyDrivers(data.drivers);
    } catch {}
  }, []);

  // Haversine ETA from nearest driver of each vehicle type (~25 km/h Abidjan avg)
  const getDriverEta = useCallback((type: string): number | null => {
    if (!location) return null;
    const typed = nearbyDrivers.filter(d => d.vehicleType === type);
    if (!typed.length) return null;
    const toRad = (n: number) => n * Math.PI / 180;
    const dists = typed.map(d => {
      const dLat = toRad(d.lat - location.latitude), dLng = toRad(d.lng - location.longitude);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(location.latitude)) * Math.cos(toRad(d.lat)) * Math.sin(dLng / 2) ** 2;
      return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    });
    return Math.max(1, Math.min(Math.round(Math.min(...dists) / 25 * 60), 20));
  }, [location, nearbyDrivers]);

  const convexDriverLocation = useQuery(
    api.rideTracking.getDriverLocation,
    activeTrip?.driver?._id ? { driverId: activeTrip.driver._id } : 'skip'
  );

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setLocation(coords);
      reverseGeocode(coords.latitude, coords.longitude).then(setPickupAddress).catch(() => {});
      fetchNearbyDrivers(coords.latitude, coords.longitude);
    })();
    loadActiveTrip();
    client.get('/wallet/balance').then(({ data }) => setWalletBalance(data.balance)).catch(() => {});
    client.get('/address').then(({ data }) => setSavedAddresses(data.addresses ?? [])).catch(() => {});
  }, []);

  // Once we know the user's address, check whether they're in an Abidjan
  // quartier or elsewhere. Outside Abidjan, send them straight to the Woyo
  // booking flow instead of this screen's full services grid. Unmatched/
  // unknown locations fall back to staying here (safer default).
  useEffect(() => {
    if (!pickupAddress || pickupAddress === 'Ma position') return;
    (async () => {
      try {
        const { data } = await client.get('/woyo/localites');
        if (!data.success) return;
        const addr = pickupAddress.toLowerCase();
        const components = addr.split(',').map((s: string) => s.trim());
        let match = null;
        for (const component of components) {
          match = data.localites.find((c: any) => component === c.name.toLowerCase());
          if (match) break;
        }
        if (!match) match = data.localites.find((c: any) => addr.includes(c.name.toLowerCase()));
        // Cities with quartiers (currently only Abidjan) keep the full catalog;
        // flat cities (e.g. Divo, Gagnoa) go straight to Woyo.
        const isAbidjan = !!match && Array.isArray(match.quartiers) && match.quartiers.length > 0;
        if (match && !isAbidjan) router.replace('/(passenger)/woyo');
      } catch {}
    })();
  }, [pickupAddress]);

  useEffect(() => {
    if (!socket) return;
    socket.on('driver_found', (data: any) => {
      setSearching(false); loadActiveTrip();
      Alert.alert('Chauffeur trouvé !', `${data.driver.name} arrive. Plaque: ${data.driver.vehiclePlate}`);
    });
    socket.on('no_driver_found', () => {
      setSearching(false); setActiveTrip(null);
      Alert.alert('Aucun chauffeur', 'Aucun chauffeur disponible. Réessayez dans quelques minutes.');
    });
    socket.on('trip_status_update', (data: { status: string }) => {
      loadActiveTrip();
      if (data?.status === 'in_progress') setRouteCoords([]);
    });
    socket.on('payment_required', (data: { tripId: string; method: string; amount: number; paymentUrl: string | null }) => {
      setPendingPayment(data);
      const labels: Record<string, string> = { orange_money: 'Orange Money', wave: 'Wave', mtn_momo: 'MTN MoMo' };
      const label = labels[data.method] ?? data.method;
      if (data.paymentUrl) {
        Linking.openURL(data.paymentUrl).catch(() => {});
        Alert.alert(`Paiement ${label}`, `Complète le paiement de ${data.amount.toLocaleString('fr-CI')} FCFA dans l'application ${label} puis reviens ici.`);
      } else {
        Alert.alert(`Confirme ton paiement ${label}`, `Tu vas recevoir une demande de paiement de ${data.amount.toLocaleString('fr-CI')} FCFA sur ton téléphone. Accepte-la pour finaliser la course.`);
      }
    });
    socket.on('payment_confirmed', (data: { tripId: string; amount: number }) => {
      setPendingPayment(null);
      setActiveTrip((prev) => {
        const finalFare = data.amount ?? prev?.estimatedFare ?? 0;
        setReceipt({ tripId: data.tripId, finalFare, driverName: prev?.driver?.name, vehiclePlate: prev?.driver?.vehiclePlate, distanceKm: prev?.estimatedDistance, dropoffAddress: prev?.dropoff?.address });
        return null;
      });
      setRouteCoords([]);
    });
    socket.on('trip_completed', (data: { tripId: string; finalFare: number }) => {
      setActiveTrip((prev) => {
        const finalFare = data.finalFare ?? prev?.estimatedFare ?? 0;
        setReceipt({ tripId: data.tripId, finalFare, driverName: prev?.driver?.name, vehiclePlate: prev?.driver?.vehiclePlate, distanceKm: prev?.estimatedDistance, dropoffAddress: prev?.dropoff?.address });
        return null;
      });
      setRouteCoords([]);
    });
    socket.on('trip_cancelled', ({ reason }: { reason?: string }) => {
      setActiveTrip(null);
      setSearching(false);
      Alert.alert('Course annulée', reason ?? 'Votre chauffeur a annulé la course. Vous pouvez en commander un autre.');
    });
    return () => { socket.off('driver_found'); socket.off('no_driver_found'); socket.off('trip_status_update'); socket.off('trip_completed'); socket.off('trip_cancelled'); socket.off('payment_required'); socket.off('payment_confirmed'); };
  }, [socket]);

  useEffect(() => {
    if (!location || phase === 'trip') return;
    const id = setInterval(() => fetchNearbyDrivers(location.latitude, location.longitude), 30000);
    return () => clearInterval(id);
  }, [location, phase, fetchNearbyDrivers]);

  const fetchRoute = async (origin: { latitude: number; longitude: number }, destLat: number, destLng: number) => {
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destLat},${destLng}&key=${GOOGLE_MAPS_KEY}&language=fr`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.status === 'OK' && json.routes.length) {
        const points = decodePolyline(json.routes[0].overview_polyline.points);
        setRouteCoords(points);
        mapRef.current?.fitToCoordinates(points, { edgePadding: { top: 80, right: 40, bottom: 380, left: 40 }, animated: true });
      }
    } catch {}
  };

  const loadActiveTrip = async () => {
    try {
      const { data } = await client.get('/rides/active');
      setActiveTrip(data.trip);
      if (data.trip?.status === 'searching') setSearching(true);
      if (data.trip?.status === 'in_progress' && location && data.trip.dropoff?.coordinates) {
        fetchRoute(location, data.trip.dropoff.coordinates.lat, data.trip.dropoff.coordinates.lng);
      }
    } catch {}
  };

  const fetchAllEstimates = async (coords: LatLng) => {
    const pLat = pickupCoords?.lat ?? location?.latitude;
    const pLng = pickupCoords?.lng ?? location?.longitude;
    if (!pLat || !pLng) return;
    setEstimating(true);
    try {
      const results = await Promise.all(
        VEHICLE_TYPES.map(v =>
          client.post('/rides/estimate', {
            pickupLat: pLat, pickupLng: pLng,
            dropoffLat: coords.lat, dropoffLng: coords.lng, vehicleType: v.id,
          }).then(({ data }) => [v.id, { ...data.estimate, surgeMultiplier: data.estimate.surgeMultiplier ?? 1 }] as [string, Estimate])
        )
      );
      setEstimates(Object.fromEntries(results));
      if (location) {
        mapRef.current?.fitToCoordinates([
          { latitude: location.latitude, longitude: location.longitude },
          { latitude: coords.lat, longitude: coords.lng },
        ], { edgePadding: { top: 80, right: 40, bottom: 420, left: 40 }, animated: true });
      }
    } catch (err: any) { Alert.alert('Erreur', err.message); }
    finally { setEstimating(false); }
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

  const handleSelectPickup = async (suggestion: PlaceSuggestion) => {
    setPickupEditing(false);
    setPickupSuggestions([]);
    setPickupAddress(suggestion.mainText);
    setPickupInput('');
    Keyboard.dismiss();
    try {
      const coords = await getPlaceCoords(suggestion.placeId);
      setPickupCoords(coords);
    } catch {}
  };

  const resetPickupToGPS = () => {
    setPickupEditing(false);
    setPickupSuggestions([]);
    setPickupInput('');
    setPickupCoords(null);
    setPickupAddress('Ma position');
  };

  const handleDropoffChange = (text: string) => {
    setDropoffAddress(text);
    setDropoffCoords(null);
    setEstimates({});
    setPromoResult(null);
    if (suggestDebounce.current) clearTimeout(suggestDebounce.current);
    if (text.length < 2) { setSuggestions([]); return; }
    setSuggestionsLoading(true);
    suggestDebounce.current = setTimeout(async () => {
      const results = await fetchPlaceSuggestions(text, location);
      setSuggestions(results);
      setSuggestionsLoading(false);
    }, 350);
  };

  const handleSelectSuggestion = async (suggestion: PlaceSuggestion) => {
    setDropoffAddress(suggestion.description);
    setSuggestions([]);
    setSearchActive(false);
    Keyboard.dismiss();
    try {
      const coords = await getPlaceCoords(suggestion.placeId);
      setDropoffCoords(coords);
      await fetchAllEstimates(coords);
      if (location) await fetchRoute(location, coords.lat, coords.lng);
    } catch (err: any) { Alert.alert('Erreur', err.message); }
  };

  const quickSelectSaved = async (a: SavedAddress) => {
    setSearchActive(false);
    setDropoffAddress(a.address);
    setSuggestions([]);
    const coords = { lat: a.lat, lng: a.lng };
    setDropoffCoords(coords);
    await fetchAllEstimates(coords);
    if (location) await fetchRoute(location, coords.lat, coords.lng);
  };

  const handlePromoValidate = async () => {
    const currentEstimate = estimates[vehicleType];
    if (!promoCode.trim() || !currentEstimate) return;
    setPromoLoading(true);
    try {
      const { data } = await client.post('/rides/promo/validate', { code: promoCode.trim(), fare: currentEstimate.fare });
      setPromoResult({ discount: data.discount, finalFare: data.finalFare, code: data.code });
    } catch (err: any) { Alert.alert('Code promo', err.message); setPromoResult(null); }
    finally { setPromoLoading(false); }
  };

  const handleBook = async () => {
    const pLat = pickupCoords?.lat ?? location?.latitude;
    const pLng = pickupCoords?.lng ?? location?.longitude;
    if (!pLat || !pLng || !estimates[vehicleType] || !dropoffCoords) return;
    setBooking(true);
    try {
      const { data } = await client.post('/rides/request', {
        pickupAddress, pickupLat: pLat, pickupLng: pLng,
        dropoffAddress, dropoffLat: dropoffCoords.lat, dropoffLng: dropoffCoords.lng,
        vehicleType, paymentMethod, promoCode: promoResult?.code || undefined,
      });
      setSearching(true); setEstimates({}); setDropoffCoords(null); setDropoffAddress('');
      setPromoCode(''); setPromoResult(null); setShowPromo(false);
      loadActiveTrip();
      if (data?.pooled) {
        Alert.alert('🤝 Covoiturage détecté', 'Un trajet partagé à proximité a été trouvé — vous y avez été ajouté automatiquement.');
      }
    } catch (err: any) {
      Alert.alert('Erreur', err.message, [
        { text: 'Réessayer', style: 'default' },
        { text: 'Annuler', style: 'cancel', onPress: resetSearch },
      ]);
    } finally { setBooking(false); }
  };

  const handleCancel = async () => {
    if (!activeTrip) return;
    try {
      await client.post(`/rides/${activeTrip._id}/cancel`, { reason: 'Annulé par le passager' });
      setActiveTrip(null); setSearching(false);
    } catch (err: any) { Alert.alert('Erreur', err.message); }
  };

  const handleSOS = () => {
    Alert.alert('Envoyer SOS ?', "Vos contacts d'urgence seront alertés avec votre position.", [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Envoyer SOS', style: 'destructive', onPress: async () => {
        try {
          const endpoint = activeTrip ? `/emergency/sos/${activeTrip._id}` : '/emergency/sos';
          const body = location ? { lat: location.latitude, lng: location.longitude } : {};
          const { data } = await client.post(endpoint, body);
          Alert.alert('SOS envoyé', data.message);
        } catch (err: any) { Alert.alert('Erreur', err.message ?? "Impossible d'envoyer le SOS."); }
      }},
    ]);
  };

  const handleShareTrip = async () => {
    if (!activeTrip) return;
    const url = `https://api.tekeche.com/track/${activeTrip._id}`;
    const driver = activeTrip.driver ? `Chauffeur : ${activeTrip.driver.name} (${activeTrip.driver.vehiclePlate})` : '';
    const message = `Je suis en course avec Woyo.\n${driver}\nSuivez ma position en temps réel : ${url}`;
    try { await Share.share({ message, url }); } catch {}
  };

  const handleSaveAddress = async () => {
    if (!saveLabel.trim() || !dropoffCoords) return;
    setSavingAddr(true);
    try {
      const { data } = await client.post('/address', { label: saveLabel.trim(), address: dropoffAddress, lat: dropoffCoords.lat, lng: dropoffCoords.lng });
      setSavedAddresses(prev => [data.address, ...prev].slice(0, 10));
      setSaveLabel(''); setShowSaveAddr(false);
    } catch (err: any) { Alert.alert('Erreur', err.message); }
    finally { setSavingAddr(false); }
  };

  const resetSearch = () => {
    setDropoffAddress(''); setDropoffCoords(null); setEstimates({});
    setSuggestions([]); setPromoResult(null); setShowPromo(false); setPromoCode('');
    setShowSaveAddr(false); setSaveLabel('');
  };

  const currentEstimate = estimates[vehicleType];
  const firstName = (user?.name as string)?.split(' ')[0] ?? '';
  const initial   = (user?.name as string)?.[0]?.toUpperCase() ?? '?';

  // ─── DRIVER PIN ────────────────────────────────────────────────────────────
  const driverPinEmoji = (type: string) =>
    type === 'moto' ? '🏍️' : type === 'xl' ? '🚐' : type === 'comfort' ? '🚙' : '🚗';

  // ─── SEARCH PHASE ──────────────────────────────────────────────────────────
  if (phase === 'search') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
        {/* Map — 20% height */}
        <View style={{ height: SCREEN_H * 0.35 }}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            showsUserLocation
            userInterfaceStyle="dark"
            initialRegion={location
              ? { ...location, latitudeDelta: 0.05, longitudeDelta: 0.05 }
              : { latitude: 5.3484, longitude: -4.0015, latitudeDelta: 0.1, longitudeDelta: 0.1 }
            }
          >
            {nearbyDrivers.map(d => (
              <Marker key={String(d._id)} coordinate={{ latitude: d.lat, longitude: d.lng }} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
                <View style={styles.driverPin}>
                  <Text style={styles.driverPinEmoji}>{driverPinEmoji(d.vehicleType)}</Text>
                </View>
              </Marker>
            ))}
          </MapView>
          <View style={styles.mapFloatHeader} pointerEvents="none">
            <Text style={styles.floatBrand}>Woyo</Text>
            {firstName ? <Text style={styles.floatSub}>Bonjour, {firstName} !</Text> : null}
          </View>
          <View style={styles.avatarFloatWrap} pointerEvents="none">
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </View>
          </View>
        </View>

        {/* Scrollable content */}
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>
          {/* Pickup address — tappable to edit */}
          <TouchableOpacity style={styles.pickupBar} onPress={() => { setPickupEditing(true); setSearchActive(true); }} activeOpacity={0.88}>
            <View style={styles.pickupDot} />
            <Text style={styles.pickupBarText} numberOfLines={1}>{pickupAddress}</Text>
            <Ionicons name="pencil-outline" size={14} color={T.teal} />
          </TouchableOpacity>

          {/* Where to bar */}
          <TouchableOpacity style={styles.whereToBar} onPress={() => setSearchActive(true)} activeOpacity={0.88}>
            <View style={styles.whereToIconWrap}>
              <Ionicons name="search" size={18} color={T.teal} />
            </View>
            <Text style={styles.whereToText}>Où voulez-vous aller ?</Text>
            <View style={styles.whereToScheduleBtn}>
              <Ionicons name="time-outline" size={16} color={T.sub} />
            </View>
          </TouchableOpacity>

          {/* Saved address chips */}
          {savedAddresses.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
              {savedAddresses.slice(0, 5).map(a => (
                <TouchableOpacity key={a._id} style={styles.savedChip} onPress={() => quickSelectSaved(a)} activeOpacity={0.75}>
                  <View style={styles.savedChipIcon}>
                    <Ionicons name="bookmark" size={11} color={T.teal} />
                  </View>
                  <Text style={styles.savedChipLabel} numberOfLines={1}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Vehicle grid — 1 row */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vehicleGrid} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingRight: 20 }}>
            {VEHICLE_DISPLAY.map(v => (
              <View key={v.label} style={[styles.vehicleImageCard, { shadowColor: v.bg }]}>
                <View style={[styles.vehicleImageBg, { backgroundColor: v.bg + '22' }]}>
                  <Text style={styles.vehicleImageEmoji}>{v.emoji}</Text>
                </View>
                <Text style={styles.vehicleImageLabel}>{v.label}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.searchHint}>
            <Text style={styles.searchHintSub}>Tapez une adresse pour voir les tarifs instantanément</Text>
          </View>

          {/* Services grid */}
          <Text style={styles.servicesTitle}>Nos services</Text>
          <View style={styles.servicesGrid}>
            {SERVICES.map(svc => (
              <TouchableOpacity key={svc.id} style={[styles.serviceCard, svc.id === 'courier' && showCourierSub && { borderColor: T.teal }]} onPress={() => {
                if (svc.id === 'courier') { setShowCourierSub(s => !s); return; }
                if (svc.vehiclePreset) setVehicleType(svc.vehiclePreset);
                if (svc.nav) router.push(svc.nav as any); else setSearchActive(true);
              }} activeOpacity={0.85}>
                <View style={[styles.serviceIconWrap, { backgroundColor: svc.color + '18' }]}>
                  <Text style={styles.serviceEmoji}>{svc.emoji}</Text>
                </View>
                <Text style={styles.serviceLabel}>{svc.label}</Text>
                <Text style={styles.serviceDesc}>{svc.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {showCourierSub && (
            <View style={styles.courierSubRow}>
              {([
                { id: 'moto', emoji: '🏍️', label: 'Moto', preset: 'moto',     color: '#7C3AED' },
                { id: 'car',  emoji: '🚙',  label: 'Car',  preset: 'standard', color: '#F59E0B' },
              ] as const).map(sub => (
                <TouchableOpacity key={sub.id} style={styles.courierSubCard} activeOpacity={0.85}
                  onPress={() => { setVehicleType(sub.preset); setShowCourierSub(false); setSearchActive(true); }}>
                  <View style={[styles.serviceIconWrap, { backgroundColor: sub.color + '18' }]}>
                    <Text style={styles.serviceEmoji}>{sub.emoji}</Text>
                  </View>
                  <Text style={styles.serviceLabel}>{sub.label}</Text>
                  <Text style={styles.serviceDesc}>Livraison express</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Estimating overlay */}
        {estimating && (
          <View style={styles.estimatingOverlay}>
            <ActivityIndicator color={T.teal} size="large" />
            <Text style={styles.estimatingText}>Calcul des tarifs…</Text>
          </View>
        )}

        {/* Search overlay */}
        {searchActive && (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: T.bg, zIndex: 200 }]}>
            <SafeAreaView style={{ flex: 1 }}>
              {/* Header: back + route inputs */}
              <View style={styles.searchOverlayHeader}>
                <TouchableOpacity
                  style={styles.searchOverlayBack}
                  onPress={() => { setSearchActive(false); setPickupEditing(false); setDropoffAddress(''); setSuggestions([]); setPickupSuggestions([]); }}
                >
                  <Ionicons name="arrow-back" size={22} color={T.text} />
                </TouchableOpacity>

                <View style={styles.searchOverlayBox}>
                  <View style={styles.searchTrack}>
                    <View style={styles.trackDotGreen} />
                    <View style={styles.trackLine} />
                    <View style={styles.trackDotOrange} />
                  </View>
                  <View style={styles.searchInputsCol}>
                    {/* Pickup */}
                    <View style={[styles.searchInputBox, { flexDirection: 'row', alignItems: 'center' }]}>
                      {pickupEditing ? (
                        <TextInput
                          style={[styles.searchTextInput, { flex: 1 }]}
                          value={pickupInput}
                          onChangeText={handlePickupChange}
                          placeholder="Adresse de départ…"
                          placeholderTextColor={T.muted}
                          autoFocus
                          autoCorrect={false}
                          autoCapitalize="none"
                        />
                      ) : (
                        <TouchableOpacity style={{ flex: 1 }} onPress={() => { setPickupEditing(true); setPickupInput(''); }}>
                          <Text style={styles.searchInputLabel} numberOfLines={1}>{pickupAddress}</Text>
                        </TouchableOpacity>
                      )}
                      {pickupEditing
                        ? <TouchableOpacity onPress={resetPickupToGPS} style={{ paddingLeft: 6 }}>
                            <Ionicons name="locate" size={18} color={T.teal} />
                          </TouchableOpacity>
                        : <TouchableOpacity onPress={() => { setPickupEditing(true); setPickupInput(''); }} style={{ paddingLeft: 6 }}>
                            <Ionicons name="pencil-outline" size={15} color={T.muted} />
                          </TouchableOpacity>
                      }
                    </View>
                    <View style={styles.searchInputDivider} />
                    {/* Dropoff */}
                    <View style={[styles.searchInputBox, styles.searchInputRow]}>
                      <TextInput
                        style={styles.searchTextInput}
                        value={dropoffAddress}
                        onChangeText={handleDropoffChange}
                        placeholder="Où voulez-vous aller ?"
                        placeholderTextColor={T.muted}
                        returnKeyType="search"
                        autoFocus={!pickupEditing}
                        autoCorrect={false}
                        autoCapitalize="none"
                      />
                      {suggestionsLoading
                        ? <ActivityIndicator size="small" color={T.teal} />
                        : dropoffAddress.length > 0
                          ? <TouchableOpacity onPress={() => { setDropoffAddress(''); setSuggestions([]); }}>
                              <Ionicons name="close-circle" size={18} color={T.muted} />
                            </TouchableOpacity>
                          : <Ionicons name="search" size={16} color={T.muted} />
                      }
                    </View>
                  </View>
                </View>
              </View>

              {/* Pickup suggestions */}
              {pickupEditing && pickupSuggestions.length > 0 && (
                <ScrollView style={styles.suggestionsList} keyboardShouldPersistTaps="handled">
                  {pickupSuggestions.map((s, i) => (
                    <TouchableOpacity key={s.placeId} style={[styles.suggestionRow, i < pickupSuggestions.length - 1 && styles.suggestionRowBorder]} onPress={() => handleSelectPickup(s)}>
                      <View style={styles.suggestionIconWrap}><Ionicons name="location-outline" size={16} color={T.teal} /></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.suggestionMain} numberOfLines={1}>{s.mainText}</Text>
                        {s.secondaryText ? <Text style={styles.suggestionSub} numberOfLines={1}>{s.secondaryText}</Text> : null}
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {/* Saved addresses (when dropoff is empty) */}
              {!pickupEditing && dropoffAddress.length === 0 && savedAddresses.length > 0 && (
                <ScrollView style={styles.suggestionsList} keyboardShouldPersistTaps="handled">
                  <Text style={styles.savedAddrHeader}>Adresses sauvegardées</Text>
                  {savedAddresses.map((a, i) => (
                    <TouchableOpacity key={a._id} style={[styles.suggestionRow, i < savedAddresses.length - 1 && styles.suggestionRowBorder]} onPress={async () => {
                      setSearchActive(false);
                      setDropoffAddress(a.address);
                      setSuggestions([]);
                      const coords = { lat: a.lat, lng: a.lng };
                      setDropoffCoords(coords);
                      await fetchAllEstimates(coords);
                      if (location) await fetchRoute(location, coords.lat, coords.lng);
                    }}>
                      <View style={[styles.suggestionIconWrap, { backgroundColor: T.tealDim }]}>
                        <Ionicons name="bookmark" size={16} color={T.teal} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.suggestionMain}>{a.label}</Text>
                        <Text style={styles.suggestionSub} numberOfLines={1}>{a.address}</Text>
                      </View>
                      <Ionicons name="arrow-forward" size={16} color={T.muted} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {/* Google autocomplete suggestions */}
              {!pickupEditing && dropoffAddress.length > 0 && !dropoffCoords && (
                <ScrollView style={styles.suggestionsList} keyboardShouldPersistTaps="handled">
                  {suggestions.map((s, i) => (
                    <TouchableOpacity key={s.placeId} style={[styles.suggestionRow, i < suggestions.length - 1 && styles.suggestionRowBorder]} onPress={() => handleSelectSuggestion(s)}>
                      <View style={styles.suggestionIconWrap}>
                        <Ionicons name="location-outline" size={18} color={T.teal} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.suggestionMain} numberOfLines={1}>{s.mainText}</Text>
                        {s.secondaryText ? <Text style={styles.suggestionSub} numberOfLines={1}>{s.secondaryText}</Text> : null}
                      </View>
                      <Ionicons name="arrow-forward" size={16} color={T.muted} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </SafeAreaView>
          </View>
        )}
      </SafeAreaView>
    );
  }

  // ─── BOOKING PHASE ─────────────────────────────────────────────────────────
  if (phase === 'booking') {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
        {/* Full-screen map */}
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          showsUserLocation
          userInterfaceStyle="dark"
          initialRegion={location
            ? { ...location, latitudeDelta: 0.05, longitudeDelta: 0.05 }
            : { latitude: 5.3484, longitude: -4.0015, latitudeDelta: 0.1, longitudeDelta: 0.1 }
          }
        >
          {nearbyDrivers.map(d => (
            <Marker key={String(d._id)} coordinate={{ latitude: d.lat, longitude: d.lng }} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
              <View style={styles.driverPin}><Text style={styles.driverPinEmoji}>{driverPinEmoji(d.vehicleType)}</Text></View>
            </Marker>
          ))}
          {dropoffCoords && <Marker coordinate={{ latitude: dropoffCoords.lat, longitude: dropoffCoords.lng }} pinColor={T.teal} />}
          {routeCoords.length > 0 && <Polyline coordinates={routeCoords} strokeColor={T.teal} strokeWidth={4} />}
        </MapView>

        {/* Booking bottom sheet — absolute */}
        <View style={styles.bookingSheet}>
          <View style={styles.sheetHandle} />

          {/* Route summary row */}
          <View style={styles.routeSummary}>
            <View style={styles.routeTrackSmall}>
              <View style={[styles.routeDotSmall, { backgroundColor: T.success }]} />
              <View style={styles.routeLineSmall} />
              <View style={[styles.routeDotSmall, { backgroundColor: T.teal }]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.routeAddr} numberOfLines={1}>{pickupAddress}</Text>
              <Text style={styles.routeAddr} numberOfLines={1}>{dropoffAddress}</Text>
            </View>
            <TouchableOpacity style={styles.editRouteBtn} onPress={resetSearch}>
              <Ionicons name="pencil-outline" size={15} color={T.teal} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
            {/* Save address chip */}
            {dropoffCoords && !savedAddresses.some(a => a.lat === dropoffCoords.lat && a.lng === dropoffCoords.lng) && (
              <View style={styles.saveAddrRow}>
                {showSaveAddr ? (
                  <>
                    <TextInput style={styles.saveAddrInput} value={saveLabel} onChangeText={setSaveLabel} placeholder="Nom (ex: Maison, Bureau…)" placeholderTextColor={T.muted} autoFocus returnKeyType="done" onSubmitEditing={handleSaveAddress} />
                    <TouchableOpacity style={styles.saveAddrBtn} onPress={handleSaveAddress} disabled={savingAddr}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveAddrCancel} onPress={() => { setShowSaveAddr(false); setSaveLabel(''); }}>
                      <Ionicons name="close" size={16} color={T.muted} />
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity style={styles.saveAddrChip} onPress={() => setShowSaveAddr(true)}>
                    <Ionicons name="bookmark-outline" size={14} color={T.teal} />
                    <Text style={styles.saveAddrChipText}>Sauvegarder cette adresse</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Vehicle picker — horizontal scroll with ETA */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vehicleScroll} contentContainerStyle={{ gap: 10, paddingHorizontal: 20, paddingRight: 24 }}>
              {VEHICLE_TYPES.map((v) => {
                const active = vehicleType === v.id;
                const est    = estimates[v.id];
                const eta    = getDriverEta(v.id);
                return (
                  <TouchableOpacity key={v.id} onPress={() => setVehicleType(v.id)} style={[styles.vehicleCard, active && styles.vehicleCardActive]}>
                    <Text style={styles.vehicleEmoji}>{v.emoji}</Text>
                    <Text style={[styles.vehicleLabel, active && styles.vehicleLabelActive]}>{v.label}</Text>
                    {eta !== null ? (
                      <View style={styles.etaRow}>
                        <Ionicons name="time-outline" size={10} color={active ? T.teal : T.muted} />
                        <Text style={[styles.etaText, active && { color: T.teal }]}>{eta} min</Text>
                      </View>
                    ) : (
                      <Text style={styles.vehicleDesc}>{v.desc}</Text>
                    )}
                    {est && (
                      <View style={[styles.vehiclePriceBadge, active && styles.vehiclePriceBadgeActive]}>
                        <Text style={[styles.vehiclePrice, active && styles.vehiclePriceActive]}>
                          {est.surgeMultiplier > 1 ? '⚡ ' : ''}{est.fare.toLocaleString('fr-CI')} F
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Fare + meta */}
            {currentEstimate && (
              <View style={styles.fareRow}>
                <View>
                  <Text style={styles.fareLabel}>
                    {VEHICLE_TYPES.find(v => v.id === vehicleType)?.emoji}{'  '}{VEHICLE_TYPES.find(v => v.id === vehicleType)?.label}
                  </Text>
                  <Text style={styles.fareAmt}>
                    {(promoResult?.finalFare ?? currentEstimate.fare).toLocaleString('fr-CI')}
                    <Text style={styles.fareCur}> FCFA</Text>
                  </Text>
                  {promoResult && <Text style={styles.fareOriginal}>{currentEstimate.fare.toLocaleString('fr-CI')} FCFA</Text>}
                  {currentEstimate.surgeMultiplier > 1 && (
                    <Animated.View style={[styles.surgeBadge, { transform: [{ scale: surgeAnim }] }]}>
                      <Text style={styles.surgeBadgeText}>
                        ⚡ ×{currentEstimate.surgeMultiplier.toFixed(1)} · Heures de pointe
                      </Text>
                    </Animated.View>
                  )}
                  {currentEstimate.surgeMultiplier > 1 && (
                    <Text style={styles.surgeBasePrice}>
                      Prix normal : {Math.round((currentEstimate.fare / currentEstimate.surgeMultiplier) / 50) * 50} FCFA
                    </Text>
                  )}
                </View>
                <View style={styles.fareMeta}>
                  <View style={styles.fareMetaItem}>
                    <Ionicons name="navigate-outline" size={13} color={T.sub} />
                    <Text style={styles.fareMetaText}>{Math.round(currentEstimate.distanceKm * 10) / 10} km</Text>
                  </View>
                  <View style={styles.fareMetaItem}>
                    <Ionicons name="time-outline" size={13} color={T.sub} />
                    <Text style={styles.fareMetaText}>{Math.round(currentEstimate.durationMin)} min</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Promo link */}
            <View style={styles.promoLinkRow}>
              <TouchableOpacity style={styles.promoLink} onPress={() => { setShowPromo(!showPromo); setPromoResult(null); }}>
                <Ionicons name={promoResult ? 'checkmark-circle' : 'pricetag-outline'} size={15} color={promoResult ? T.success : T.teal} />
                <Text style={[styles.promoLinkText, promoResult && { color: T.success }]}>
                  {promoResult ? `Code appliqué · −${promoResult.discount.toLocaleString('fr-CI')} F` : 'Ajouter un code promo'}
                </Text>
              </TouchableOpacity>
            </View>
            {showPromo && !promoResult && (
              <View style={styles.promoInputRow}>
                <TextInput style={styles.promoInput} value={promoCode} onChangeText={(t) => setPromoCode(t.toUpperCase())} placeholder="Code promo (ex: TEKE10)" placeholderTextColor={T.muted} autoCapitalize="characters" />
                <TouchableOpacity style={styles.promoBtn} onPress={handlePromoValidate} disabled={promoLoading}>
                  <Text style={styles.promoBtnText}>{promoLoading ? '…' : 'OK'}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Payment row — Uber style */}
            <TouchableOpacity style={styles.paymentRow} onPress={() => setShowPaymentSheet(true)} activeOpacity={0.85}>
              <View style={styles.paymentRowLeft}>
                <View style={styles.paymentIconWrap}>
                  <Ionicons name={paymentMethod === 'cash' ? 'cash-outline' : paymentMethod === 'wallet' ? 'wallet-outline' : 'phone-portrait-outline'} size={20} color={T.teal} />
                </View>
                <View>
                  <Text style={styles.paymentRowLabel}>Mode de paiement</Text>
                  <Text style={styles.paymentRowValue}>
                    {paymentMethod === 'cash' ? 'Espèces'
                      : paymentMethod === 'wallet' ? `Portefeuille${walletBalance !== null ? ` · ${walletBalance.toLocaleString('fr-CI')} F` : ''}`
                      : paymentMethod === 'orange_money' ? 'Orange Money'
                      : paymentMethod === 'wave' ? 'Wave'
                      : 'MTN MoMo'}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={T.muted} />
            </TouchableOpacity>

            {/* Confirm */}
            <View style={styles.confirmWrap}>
              <Button
                label={`Choisir ${VEHICLE_TYPES.find(v => v.id === vehicleType)?.label ?? 'Standard'}`}
                onPress={handleBook}
                loading={booking}
              />
            </View>
          </ScrollView>
        </View>

        {/* Payment picker sheet */}
        <Modal visible={showPaymentSheet} transparent animationType="slide" onRequestClose={() => setShowPaymentSheet(false)}>
          <TouchableOpacity style={styles.paySheetOverlay} activeOpacity={1} onPress={() => setShowPaymentSheet(false)}>
            <View style={styles.paySheet}>
              <View style={styles.sheetHandle} />
              <Text style={styles.paySheetTitle}>Mode de paiement</Text>
              {([
                { id: 'wallet'       as const, icon: 'wallet-outline',          label: 'Portefeuille',  sub: walletBalance !== null ? `Solde : ${walletBalance.toLocaleString('fr-CI')} F` : undefined },
                { id: 'cash'         as const, icon: 'cash-outline',            label: 'Espèces',       sub: 'À remettre au chauffeur' },
                { id: 'orange_money' as const, icon: 'phone-portrait-outline',  label: 'Orange Money',  sub: 'Paiement mobile Orange CI' },
                { id: 'wave'         as const, icon: 'phone-portrait-outline',  label: 'Wave',          sub: 'Paiement mobile Wave' },
                { id: 'mtn_momo'     as const, icon: 'phone-portrait-outline',  label: 'MTN MoMo',      sub: 'Paiement mobile MTN CI' },
              ]).map(m => (
                <TouchableOpacity key={m.id} style={[styles.paySheetOption, paymentMethod === m.id && styles.paySheetOptionActive]} onPress={() => { setPaymentMethod(m.id); setShowPaymentSheet(false); }}>
                  <View style={[styles.paySheetOptionIcon, paymentMethod === m.id && styles.paySheetOptionIconActive]}>
                    <Ionicons name={m.icon as any} size={22} color={paymentMethod === m.id ? T.teal : T.muted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.paySheetOptionLabel, paymentMethod === m.id && { color: T.teal }]}>{m.label}</Text>
                    {m.sub && <Text style={styles.paySheetOptionSub}>{m.sub}</Text>}
                  </View>
                  {paymentMethod === m.id && <Ionicons name="checkmark-circle" size={22} color={T.teal} />}
                </TouchableOpacity>
              ))}
              <View style={{ height: 32 }} />
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  }

  // ─── TRIP PHASE ────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        showsUserLocation
        userInterfaceStyle="dark"
        initialRegion={location ? { ...location, latitudeDelta: 0.05, longitudeDelta: 0.05 } : { latitude: 5.3484, longitude: -4.0015, latitudeDelta: 0.1, longitudeDelta: 0.1 }}
      >
        {convexDriverLocation && <Marker coordinate={{ latitude: convexDriverLocation.lat, longitude: convexDriverLocation.lng }} title="Chauffeur" pinColor={T.teal} />}
        {routeCoords.length > 0 && <Polyline coordinates={routeCoords} strokeColor={T.teal} strokeWidth={4} />}
      </MapView>

      {/* Floating SOS */}
      <SafeAreaView style={styles.sosSafeWrap} pointerEvents="box-none">
        <TouchableOpacity style={styles.sosFloatBtn} onPress={handleSOS} pointerEvents="auto">
          <Text style={styles.sosFloatText}>SOS</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* Trip sheet — absolute bottom */}
      <View style={styles.tripSheet}>
        {searching ? (
          <View style={styles.searchingWrap}>
            <View style={styles.searchingRing}>
              <ActivityIndicator color={T.teal} size="large" />
            </View>
            <Text style={styles.searchingTitle}>Recherche d'un chauffeur…</Text>
            <Text style={styles.searchingSub}>Nous trouvons le meilleur chauffeur pour vous</Text>
            <Button label="Annuler" onPress={handleCancel} variant="outline" style={{ marginTop: 20 }} />
          </View>
        ) : activeTrip ? (
          <>
            <View style={styles.activeTripWrap}>
              <View style={styles.statusPill}>
                <View style={styles.statusDot} />
                <Text style={styles.statusPillText}>{TRIP_STATUS_LABELS[activeTrip.status] ?? activeTrip.status}</Text>
              </View>
              {activeTrip.driver && (
                <View style={styles.driverCard}>
                  <View style={styles.driverAvatar}>
                    <Text style={styles.driverAvatarText}>{activeTrip.driver.name.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.driverName}>{activeTrip.driver.name}</Text>
                    <Text style={styles.driverPlate}>{activeTrip.driver.vehiclePlate}</Text>
                  </View>
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={12} color="#FBBF24" />
                    <Text style={styles.ratingBadgeText}>{activeTrip.driver.rating.toFixed(1)}</Text>
                  </View>
                  <TouchableOpacity style={styles.callDriverBtn} onPress={() => Linking.openURL(`tel:${activeTrip.driver!.phone}`)}>
                    <Ionicons name="call" size={16} color={T.success} />
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.destRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.destLabel}>Destination</Text>
                  <Text style={styles.destAddr} numberOfLines={1}>{activeTrip.dropoff?.address ?? '—'}</Text>
                </View>
                {['accepted', 'driver_arriving'].includes(activeTrip.status) && (
                  <TouchableOpacity style={styles.editDestBtn} onPress={() => { setNewDestInput(activeTrip.dropoff?.address ?? ''); setEditingDest(true); }}>
                    <Ionicons name="pencil-outline" size={16} color={T.teal} />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.fareLine}>
                <Text style={styles.fareLineLabel}>Tarif estimé</Text>
                <Text style={styles.fareLineAmount}>{activeTrip.estimatedFare.toLocaleString('fr-CI')} FCFA</Text>
              </View>

              {activeTrip.driver && (
                <TouchableOpacity style={styles.chatBtn} onPress={() => setChatOpen(true)}>
                  <Text style={styles.chatBtnText}>💬 Chat chauffeur</Text>
                </TouchableOpacity>
              )}

              <View style={styles.safetyRow}>
                <TouchableOpacity style={styles.shareBtn} onPress={handleShareTrip}>
                  <Ionicons name="share-social-outline" size={16} color={T.teal} />
                  <Text style={styles.shareBtnText}>Partager ma course</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sosBtnInline} onPress={handleSOS}>
                  <Ionicons name="alert-circle" size={16} color="#fff" />
                  <Text style={styles.sosBtnInlineText}>SOS</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Modal visible={chatOpen} animationType="slide" onRequestClose={() => setChatOpen(false)}>
              <TripChat tripId={activeTrip._id} myRole="passenger" onClose={() => setChatOpen(false)} />
            </Modal>

            <Modal visible={editingDest} animationType="slide" onRequestClose={() => { setEditingDest(false); setDestSuggestions([]); }}>
              <SafeAreaView style={styles.editDestModal}>
                <View style={styles.editDestHeader}>
                  <Text style={styles.editDestTitle}>Modifier la destination</Text>
                  <TouchableOpacity onPress={() => { setEditingDest(false); setDestSuggestions([]); }}>
                    <Text style={styles.editDestClose}>✕</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.editDestInputWrap}>
                  <Ionicons name="location-outline" size={18} color={T.teal} />
                  <TextInput
                    style={styles.editDestInput}
                    value={newDestInput}
                    onChangeText={async (t) => {
                      setNewDestInput(t);
                      const s = await fetchPlaceSuggestions(t, location);
                      setDestSuggestions(s);
                    }}
                    placeholder="Nouvelle destination…"
                    placeholderTextColor={T.muted}
                    autoFocus
                  />
                </View>
                {destSuggestions.map((s) => (
                  <TouchableOpacity key={s.placeId} style={styles.editDestSuggestion} onPress={async () => {
                    setSavingDest(true);
                    try {
                      const coords = await getPlaceCoords(s.placeId);
                      let newFare: number | null = null;
                      if (location && activeTrip?.vehicleType) {
                        try {
                          const { data: est } = await client.post('/rides/estimate', { pickupLat: location.latitude, pickupLng: location.longitude, dropoffLat: coords.lat, dropoffLng: coords.lng, vehicleType: activeTrip.vehicleType });
                          newFare = est.fare;
                        } catch {}
                      }
                      setSavingDest(false);
                      Alert.alert(
                        'Modifier la destination ?',
                        `${s.description}${newFare != null ? `\n\nNouveau tarif estimé : ${newFare.toLocaleString('fr-CI')} FCFA` : ''}`,
                        [
                          { text: 'Annuler', style: 'cancel' },
                          { text: 'Confirmer', onPress: async () => {
                            setSavingDest(true);
                            try {
                              const { data } = await client.put(`/rides/${activeTrip!._id}/destination`, { dropoffAddress: s.description, dropoffLat: coords.lat, dropoffLng: coords.lng });
                              setActiveTrip(data.trip);
                              setEditingDest(false); setDestSuggestions([]);
                            } catch (e: any) { Alert.alert('Erreur', e.message); }
                            finally { setSavingDest(false); }
                          }},
                        ]
                      );
                    } catch (e: any) { setSavingDest(false); Alert.alert('Erreur', e.message); }
                  }}>
                    <Ionicons name="location-outline" size={14} color={T.muted} style={{ marginTop: 2 }} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.suggMainText}>{s.mainText}</Text>
                      <Text style={styles.suggSecText}>{s.secondaryText}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
                {savingDest && <ActivityIndicator color={T.teal} style={{ marginTop: 20 }} />}
              </SafeAreaView>
            </Modal>
          </>
        ) : null}
      </View>

      {/* Receipt modal */}
      <Modal visible={!!receipt} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.receiptCard}>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <Ionicons name="checkmark-circle" size={56} color={T.success} />
            </View>
            <Text style={styles.receiptTitle}>Course terminée</Text>
            <View style={styles.receiptFareBox}>
              <Text style={styles.receiptFareLabel}>Montant payé</Text>
              <Text style={styles.receiptFareAmt}>{receipt?.finalFare.toLocaleString('fr-CI')} FCFA</Text>
            </View>
            {[
              receipt?.driverName && { label: 'Chauffeur', value: `${receipt.driverName} · ${receipt.vehiclePlate}` },
              receipt?.distanceKm != null && { label: 'Distance', value: `${Math.round(receipt.distanceKm * 10) / 10} km` },
              receipt?.dropoffAddress && { label: 'Destination', value: receipt.dropoffAddress },
            ].filter(Boolean).map((row: any) => (
              <View key={row.label} style={styles.receiptRow}>
                <Text style={styles.receiptRowLabel}>{row.label}</Text>
                <Text style={styles.receiptRowVal} numberOfLines={2}>{row.value}</Text>
              </View>
            ))}
            <Button label="Évaluer le chauffeur" onPress={() => { setCompletedTripId(receipt!.tripId); setReceipt(null); }} style={{ marginTop: 20 }} />
            <Button label="Fermer" variant="ghost" onPress={() => setReceipt(null)} style={{ marginTop: 6 }} />
          </View>
        </View>
      </Modal>

      <RatingModal
        visible={!!completedTripId}
        title="Évaluer votre chauffeur"
        subtitle="Comment s'est passée votre course ?"
        onSubmit={async (rating, comment) => {
          if (!completedTripId) return;
          try { await client.post(`/rides/${completedTripId}/rate`, { rating, comment }); } catch {}
          setCompletedTripId(null);
        }}
        onSkip={() => setCompletedTripId(null)}
      />

      <SupportChat />
    </View>
  );
}

const styles = StyleSheet.create({
  // ── SEARCH PHASE ──────────────────────────────────────────────────────────
  mapFloatHeader:     { position: 'absolute', top: 12, left: 16, zIndex: 10 },
  avatarFloatWrap:    { position: 'absolute', top: 12, right: 16, zIndex: 10 },
  floatBrand:         { color: T.teal, fontSize: 22, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } },
  floatSub:           { color: T.teal, fontSize: 13, marginTop: 2, textShadowColor: 'rgba(0,0,0,0.25)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
  avatarCircle:       { width: 40, height: 40, borderRadius: 20, backgroundColor: T.teal, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  avatarInitial:      { color: '#fff', fontSize: 17, fontWeight: '800' },

  pickupBar:          { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 12, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: T.elevated, borderRadius: 12, borderWidth: 1, borderColor: T.border },
  pickupDot:          { width: 10, height: 10, borderRadius: 5, backgroundColor: '#16A34A' },
  pickupBarText:      { flex: 1, color: T.sub, fontSize: 13, fontWeight: '500' },

  whereToBar:         { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginTop: 8, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: T.elevated, borderRadius: 16, borderWidth: 1, borderColor: T.border },
  whereToIconWrap:    { width: 34, height: 34, borderRadius: 17, backgroundColor: T.tealDim, alignItems: 'center', justifyContent: 'center' },
  whereToText:        { flex: 1, color: T.muted, fontSize: 15 },
  whereToScheduleBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: T.card, alignItems: 'center', justifyContent: 'center' },

  savedChip:          { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.elevated, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: T.border },
  savedChipIcon:      { width: 20, height: 20, borderRadius: 10, backgroundColor: T.tealDim, alignItems: 'center', justifyContent: 'center' },
  savedChipLabel:     { color: T.text, fontSize: 12, fontWeight: '600', maxWidth: 90 },

  vehicleGrid:        { marginTop: 10 },
  vehicleImageCard:   { width: 88, backgroundColor: T.surface, borderRadius: 14, alignItems: 'center', paddingVertical: 8, borderWidth: 1, borderColor: T.border, shadowOpacity: 0.18, shadowRadius: 10, elevation: 4 },
  vehicleImageBg:     { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  vehicleImageEmoji:  { fontSize: 24 },
  vehicleImageLabel:  { color: T.text, fontSize: 11, fontWeight: '700' },

  searchHint:         { alignItems: 'center', marginTop: 8, marginBottom: 2 },
  searchHintSub:      { color: T.muted, fontSize: 11, textAlign: 'center', paddingHorizontal: 24 },

  servicesTitle:      { color: T.text, fontSize: 13, fontWeight: '700', marginHorizontal: 16, marginTop: 10, marginBottom: 6 },
  servicesGrid:       { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 8 },
  courierSubRow:      { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginTop: 4 },
  courierSubCard:     { flex: 1, backgroundColor: T.surface, borderRadius: 14, padding: 8, borderWidth: 1, borderColor: T.tealBorder },
  serviceCard:        { width: (SCREEN_W - 48) / 3, backgroundColor: T.surface, borderRadius: 14, padding: 8, borderWidth: 1, borderColor: T.border },
  serviceIconWrap:    { width: 49, height: 49, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  serviceEmoji:       { fontSize: 24 },
  serviceLabel:       { color: T.text, fontSize: 11, fontWeight: '700', marginBottom: 1 },
  serviceDesc:        { color: T.muted, fontSize: 9 },

  // Search overlay
  searchOverlayHeader:  { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: T.border },
  searchOverlayBack:    { width: 40, height: 40, borderRadius: 20, backgroundColor: T.elevated, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  searchOverlayBox:     { flex: 1, flexDirection: 'row', gap: 12, backgroundColor: T.surface, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: T.border },
  searchTrack:          { alignItems: 'center', paddingTop: 6, width: 12 },
  trackDotGreen:        { width: 12, height: 12, borderRadius: 6, backgroundColor: T.success },
  trackLine:            { width: 2, flex: 1, backgroundColor: T.border, marginVertical: 4 },
  trackDotOrange:       { width: 12, height: 12, borderRadius: 3, backgroundColor: T.teal },
  searchInputsCol:      { flex: 1, gap: 0 },
  searchInputBox:       { paddingVertical: 8, justifyContent: 'center' },
  searchInputDivider:   { height: 1, backgroundColor: T.border, marginVertical: 2 },
  searchInputRow:       { flexDirection: 'row', alignItems: 'center' },
  searchInputLabel:     { color: T.sub, fontSize: 14 },
  searchTextInput:      { flex: 1, color: T.text, fontSize: 15, height: 34 },

  suggestionsList:    { flex: 1, paddingHorizontal: 16 },
  suggestionRow:      { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  suggestionRowBorder:{ borderBottomWidth: 1, borderBottomColor: T.border },
  suggestionIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: T.tealDim, alignItems: 'center', justifyContent: 'center' },
  suggestionMain:     { color: T.text, fontSize: 14, fontWeight: '600' },
  suggestionSub:      { color: T.muted, fontSize: 12, marginTop: 2 },
  savedAddrHeader:    { color: T.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 8, paddingTop: 4 },

  estimatingOverlay:  { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,10,10,0.75)', alignItems: 'center', justifyContent: 'center', gap: 16, zIndex: 50 },
  estimatingText:     { color: T.text, fontSize: 15 },

  sheetHandle:        { width: 40, height: 4, backgroundColor: T.border, borderRadius: 2, alignSelf: 'center', marginVertical: 10 },

  // ── BOOKING PHASE ─────────────────────────────────────────────────────────
  bookingSheet:       { position: 'absolute', bottom: 0, left: 0, right: 0, maxHeight: SCREEN_H * 0.64, backgroundColor: T.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderColor: T.border, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20, elevation: 20 },

  routeSummary:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: T.border, marginBottom: 4 },
  routeTrackSmall:    { alignItems: 'center', width: 10 },
  routeDotSmall:      { width: 10, height: 10, borderRadius: 5 },
  routeLineSmall:     { width: 2, height: 18, backgroundColor: T.border, marginVertical: 3 },
  routeAddr:          { color: T.sub, fontSize: 13, lineHeight: 22 },
  editRouteBtn:       { width: 34, height: 34, borderRadius: 17, backgroundColor: T.tealDim, alignItems: 'center', justifyContent: 'center' },

  saveAddrRow:        { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: T.border },
  saveAddrChip:       { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.tealDim, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: T.tealBorder },
  saveAddrChipText:   { color: T.teal, fontSize: 12, fontWeight: '600' },
  saveAddrInput:      { flex: 1, backgroundColor: T.card, borderRadius: 12, borderWidth: 1, borderColor: T.tealBorder, paddingHorizontal: 12, paddingVertical: 8, color: T.text, fontSize: 13 },
  saveAddrBtn:        { width: 34, height: 34, borderRadius: 17, backgroundColor: T.teal, alignItems: 'center', justifyContent: 'center' },
  saveAddrCancel:     { width: 34, height: 34, borderRadius: 17, backgroundColor: T.elevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.border },

  vehicleScroll:          { marginVertical: 12 },
  vehicleCard:            { width: 110, paddingVertical: 14, paddingHorizontal: 8, borderRadius: 16, borderWidth: 1.5, borderColor: T.border, alignItems: 'center', backgroundColor: T.card, gap: 3 },
  vehicleCardActive:      { borderColor: T.teal, backgroundColor: T.tealDim },
  vehicleEmoji:           { fontSize: 34, lineHeight: 42 },
  vehicleLabel:           { color: T.text, fontWeight: '700', fontSize: 13 },
  vehicleLabelActive:     { color: T.teal },
  vehicleDesc:            { color: T.muted, fontSize: 10, textAlign: 'center' },
  etaRow:                 { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 },
  etaText:                { color: T.muted, fontSize: 10, fontWeight: '600' },
  vehiclePriceBadge:      { marginTop: 6, backgroundColor: T.elevated, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  vehiclePriceBadgeActive:{ backgroundColor: T.teal },
  vehiclePrice:           { color: T.sub, fontSize: 11, fontWeight: '600' },
  vehiclePriceActive:     { color: '#fff', fontWeight: '700' },

  fareRow:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: T.border },
  fareLabel:          { color: T.muted, fontSize: 12, marginBottom: 2 },
  fareAmt:            { color: T.text, fontSize: 28, fontWeight: '800' },
  fareCur:            { fontSize: 14, color: T.sub, fontWeight: '600' },
  fareOriginal:       { color: T.muted, fontSize: 12, textDecorationLine: 'line-through' },
  surgeBadge:         { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F59E0B18', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start', marginTop: 4, borderWidth: 1, borderColor: '#F59E0B44' },
  surgeBadgeText:     { color: '#F59E0B', fontSize: 11, fontWeight: '600' },
  surgeBasePrice:     { color: T.muted, fontSize: 11, marginTop: 3, textDecorationLine: 'line-through' },
  fareMeta:           { alignItems: 'flex-end', gap: 6 },
  fareMetaItem:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fareMetaText:       { color: T.sub, fontSize: 13 },

  promoLinkRow:       { paddingHorizontal: 20, paddingVertical: 12 },
  promoLink:          { flexDirection: 'row', alignItems: 'center', gap: 8 },
  promoLinkText:      { color: T.teal, fontSize: 13, fontWeight: '600' },
  promoInputRow:      { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 4 },
  promoInput:         { flex: 1, backgroundColor: T.card, borderRadius: 12, borderWidth: 1, borderColor: T.border, paddingHorizontal: 14, paddingVertical: 10, color: T.text, fontSize: 14 },
  promoBtn:           { backgroundColor: T.teal, borderRadius: 12, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  promoBtnText:       { color: '#fff', fontWeight: '700', fontSize: 14 },

  paymentRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderTopColor: T.border, borderBottomWidth: 1, borderBottomColor: T.border },
  paymentRowLeft:     { flexDirection: 'row', alignItems: 'center', gap: 14 },
  paymentIconWrap:    { width: 44, height: 44, borderRadius: 22, backgroundColor: T.tealDim, alignItems: 'center', justifyContent: 'center' },
  paymentRowLabel:    { color: T.muted, fontSize: 11, fontWeight: '600' },
  paymentRowValue:    { color: T.text, fontSize: 14, fontWeight: '700', marginTop: 2 },

  confirmWrap:        { paddingHorizontal: 20, paddingBottom: 28, paddingTop: 8 },

  // Payment sheet
  paySheetOverlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  paySheet:             { backgroundColor: T.elevated, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, borderTopWidth: 1, borderColor: T.border },
  paySheetTitle:        { color: T.text, fontSize: 17, fontWeight: '700', marginBottom: 16, paddingHorizontal: 4 },
  paySheetOption:       { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderRadius: 16, paddingHorizontal: 12, marginBottom: 8 },
  paySheetOptionActive: { backgroundColor: T.tealDim, borderWidth: 1, borderColor: T.tealBorder },
  paySheetOptionIcon:   { width: 46, height: 46, borderRadius: 23, backgroundColor: T.elevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.border },
  paySheetOptionIconActive: { backgroundColor: T.tealDim, borderColor: T.tealBorder },
  paySheetOptionLabel:  { color: T.text, fontSize: 15, fontWeight: '700' },
  paySheetOptionSub:    { color: T.muted, fontSize: 12, marginTop: 2 },

  // ── TRIP PHASE ────────────────────────────────────────────────────────────
  sosSafeWrap:        { position: 'absolute', top: 0, right: 16, zIndex: 20 },
  sosFloatBtn:        { width: 54, height: 54, borderRadius: 27, backgroundColor: T.danger, alignItems: 'center', justifyContent: 'center', shadowColor: T.danger, shadowOpacity: 0.7, shadowRadius: 10, elevation: 12 },
  sosFloatText:       { color: '#fff', fontWeight: '800', fontSize: 12, letterSpacing: 0.8 },

  tripSheet:          { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: T.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28, maxHeight: '50%', borderTopWidth: 1, borderColor: T.border, overflow: 'hidden' },

  searchingWrap:      { alignItems: 'center', paddingVertical: 24 },
  searchingRing:      { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: T.tealBorder, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  searchingTitle:     { color: T.text, fontSize: 17, fontWeight: '700', marginBottom: 6 },
  searchingSub:       { color: T.sub, fontSize: 13 },

  activeTripWrap:     { paddingVertical: 4 },
  statusPill:         { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.tealDim, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start', marginBottom: 14 },
  statusDot:          { width: 8, height: 8, borderRadius: 4, backgroundColor: T.teal },
  statusPillText:     { color: T.teal, fontSize: 13, fontWeight: '600' },

  driverCard:         { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.card, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: T.border },
  driverAvatar:       { width: 44, height: 44, borderRadius: 22, backgroundColor: T.teal, alignItems: 'center', justifyContent: 'center' },
  driverAvatarText:   { color: '#fff', fontSize: 18, fontWeight: '800' },
  driverName:         { color: T.text, fontSize: 15, fontWeight: '700' },
  driverPlate:        { color: T.sub, fontSize: 13, marginTop: 2 },
  ratingBadge:        { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: T.elevated, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  ratingBadgeText:    { color: T.text, fontSize: 13, fontWeight: '600' },
  callDriverBtn:      { width: 34, height: 34, borderRadius: 17, backgroundColor: `${T.success}18`, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: `${T.success}44` },

  destRow:            { flexDirection: 'row', alignItems: 'center', backgroundColor: T.card, borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: T.border },
  destLabel:          { color: T.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 },
  destAddr:           { color: T.text, fontSize: 13 },
  editDestBtn:        { padding: 8, backgroundColor: T.tealDim, borderRadius: 8, borderWidth: 1, borderColor: T.tealBorder },

  fareLine:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fareLineLabel:      { color: T.sub, fontSize: 14 },
  fareLineAmount:     { color: T.text, fontSize: 18, fontWeight: '800' },

  chatBtn:            { marginTop: 12, backgroundColor: T.tealDim, borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: T.tealBorder },
  chatBtnText:        { color: T.teal, fontWeight: '600', fontSize: 14 },

  safetyRow:          { flexDirection: 'row', gap: 10, marginTop: 10 },
  shareBtn:           { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: T.tealDim, borderRadius: 12, paddingVertical: 11, borderWidth: 1, borderColor: T.tealBorder },
  shareBtnText:       { color: T.teal, fontSize: 13, fontWeight: '600' },
  sosBtnInline:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: T.danger, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 18 },
  sosBtnInlineText:   { color: '#fff', fontSize: 13, fontWeight: '700' },

  editDestModal:      { flex: 1, backgroundColor: T.bg },
  editDestHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: T.border },
  editDestTitle:      { color: T.text, fontSize: 17, fontWeight: '700' },
  editDestClose:      { color: T.muted, fontSize: 20 },
  editDestInputWrap:  { flexDirection: 'row', alignItems: 'center', margin: 16, backgroundColor: T.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1.5, borderColor: T.tealBorder },
  editDestInput:      { flex: 1, color: T.text, fontSize: 15, marginLeft: 10 },
  editDestSuggestion: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.border },
  suggMainText:       { color: T.text, fontSize: 14, fontWeight: '600' },
  suggSecText:        { color: T.muted, fontSize: 12, marginTop: 2 },

  overlay:            { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  receiptCard:        { backgroundColor: T.elevated, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, paddingBottom: 40, borderTopWidth: 1, borderColor: T.border },
  receiptTitle:       { color: T.text, fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 22 },
  receiptFareBox:     { backgroundColor: T.tealDim, borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: T.tealBorder },
  receiptFareLabel:   { color: T.sub, fontSize: 13, marginBottom: 4 },
  receiptFareAmt:     { color: T.teal, fontSize: 36, fontWeight: '800' },
  receiptRow:         { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.border },
  receiptRowLabel:    { color: T.muted, fontSize: 13, flex: 0.4 },
  receiptRowVal:      { color: T.sub, fontSize: 13, fontWeight: '500', flex: 0.6, textAlign: 'right' },

  driverPin:          { backgroundColor: '#1A1A2E', borderRadius: 20, padding: 5, borderWidth: 1.5, borderColor: T.teal },
  driverPinEmoji:     { fontSize: 15 },
});
