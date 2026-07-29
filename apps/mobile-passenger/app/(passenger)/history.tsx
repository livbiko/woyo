import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Modal, SafeAreaView,
  ScrollView, Share, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import client from '../../src/api/client';
import { T } from '../../src/theme';

interface Trip {
  _id: string;
  status: string;
  estimatedFare: number;
  finalFare?: number;
  createdAt: string;
  vehicleType: string;
  pickup: { address: string };
  dropoff: { address: string };
  driver?: { name: string; rating: number; vehiclePlate: string };
  driverRating?: number;
  distanceKm?: number;
  durationMin?: number;
}

type StatusKey = 'completed' | 'cancelled' | 'searching';
const STATUS_CONFIG: Record<StatusKey, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  completed: { label: 'Terminée',  color: T.success, bg: `${T.success}18`, icon: 'checkmark-circle' },
  cancelled: { label: 'Annulée',   color: T.danger,  bg: `${T.danger}18`,  icon: 'close-circle' },
  searching: { label: 'Recherche', color: T.warning, bg: `${T.warning}18`, icon: 'time-outline' },
};

const VEHICLE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  moto: 'bicycle-outline', standard: 'car-outline', comfort: 'car-sport-outline',
  xl: 'bus-outline', delivery: 'cube-outline',
};

const VEHICLE_LABELS: Record<string, string> = {
  moto: 'Moto', standard: 'Standard', comfort: 'Comfort', xl: 'XL', delivery: 'Livraison',
};

const FILTERS = [
  { key: 'all',       label: 'Toutes' },
  { key: 'completed', label: 'Terminées' },
  { key: 'cancelled', label: 'Annulées' },
];

const REPORT_REASONS = [
  'Facturation incorrecte',
  'Comportement du conducteur',
  'Trajet incorrect',
  'Problème de sécurité',
  'Autre',
];

function formatDate(iso: string) {
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60)     return "À l'instant";
  if (diff < 3600)   return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400)  return `Il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 172800) return 'Hier';
  return d.toLocaleDateString('fr-CI', { day: 'numeric', month: 'short' });
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-CI', { day: 'numeric', month: 'long', year: 'numeric' }) +
    ' à ' + d.toLocaleTimeString('fr-CI', { hour: '2-digit', minute: '2-digit' });
}

export default function HistoryScreen() {
  const router = useRouter();
  const [trips, setTrips]               = useState<Trip[]>([]);
  const [filter, setFilter]             = useState('all');
  const [page, setPage]                 = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [loading, setLoading]           = useState(true);
  const [loadingMore, setLoadingMore]   = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [reporting, setReporting]       = useState(false);

  const load = useCallback(async (pageNum = 1, currentFilter = filter, replace = true) => {
    if (pageNum === 1) setLoading(true); else setLoadingMore(true);
    try {
      const statusParam = currentFilter !== 'all' ? `&status=${currentFilter}` : '';
      const { data } = await client.get(`/rides/history?page=${pageNum}${statusParam}`);
      setTrips(prev => replace ? data.trips : [...prev, ...data.trips]);
      setTotalPages(data.pages);
      setPage(pageNum);
    } catch {}
    finally { setLoading(false); setLoadingMore(false); }
  }, [filter]);

  useEffect(() => { load(1, filter, true); }, [filter]);

  const shareReceipt = async (trip: Trip) => {
    const fare = (trip.finalFare ?? trip.estimatedFare).toLocaleString('fr-CI');
    const lines = [
      '🧾 Reçu Woyo',
      '',
      `📅 ${formatDateTime(trip.createdAt)}`,
      `🚗 ${VEHICLE_LABELS[trip.vehicleType] ?? trip.vehicleType}`,
      `📍 Départ : ${trip.pickup.address}`,
      `📍 Arrivée : ${trip.dropoff.address}`,
      trip.distanceKm ? `📏 Distance : ${trip.distanceKm.toFixed(1)} km` : null,
      `💰 Montant : ${fare} FCFA`,
      trip.driver ? `👤 Conducteur : ${trip.driver.name} (${trip.driver.vehiclePlate})` : null,
      '',
      'Merci de voyager avec Woyo !',
    ].filter(Boolean).join('\n');
    try { await Share.share({ message: lines, title: 'Reçu Woyo' }); } catch {}
  };

  const reportTrip = (trip: Trip) => {
    Alert.alert(
      'Signaler un problème',
      'Quel est le problème ?',
      [
        ...REPORT_REASONS.map(reason => ({
          text: reason,
          onPress: async () => {
            setReporting(true);
            try {
              await client.post(`/rides/${trip._id}/report`, { reason });
              Alert.alert('Signalement envoyé', 'Notre équipe examinera votre signalement sous 24 h.');
            } catch {
              Alert.alert('Erreur', "Impossible d'envoyer le signalement.");
            } finally { setReporting(false); }
          },
        })),
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  };

  const renderItem = ({ item }: { item: Trip }) => {
    const conf = STATUS_CONFIG[item.status as StatusKey] ?? { label: item.status, color: T.sub, bg: T.card, icon: 'ellipse-outline' as keyof typeof Ionicons.glyphMap };
    const fare = (item.finalFare ?? item.estimatedFare).toLocaleString('fr-CI');
    const vehicleIcon = VEHICLE_ICONS[item.vehicleType] ?? 'car-outline';

    return (
      <TouchableOpacity style={styles.card} onPress={() => setSelectedTrip(item)} activeOpacity={0.85}>
        <View style={styles.cardTop}>
          <View style={[styles.statusBadge, { backgroundColor: conf.bg }]}>
            <Ionicons name={conf.icon} size={12} color={conf.color} style={{ marginRight: 4 }} />
            <Text style={[styles.statusText, { color: conf.color }]}>{conf.label}</Text>
          </View>
          <Text style={styles.fare}>{fare} <Text style={styles.fareCur}>FCFA</Text></Text>
        </View>

        <View style={styles.routeRow}>
          <View style={styles.routeTrack}>
            <View style={[styles.routeDot, { backgroundColor: T.success }]} />
            <View style={styles.routeLine} />
            <View style={[styles.routeDot, { backgroundColor: T.teal, borderRadius: 2 }]} />
          </View>
          <View style={styles.routeAddresses}>
            <Text style={styles.addressText} numberOfLines={1}>{item.pickup.address}</Text>
            <Text style={styles.addressText} numberOfLines={1}>{item.dropoff.address}</Text>
          </View>
        </View>

        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Ionicons name={vehicleIcon} size={13} color={T.muted} />
            <Text style={styles.metaText}>{VEHICLE_LABELS[item.vehicleType] ?? item.vehicleType}</Text>
          </View>
          {item.driver && (
            <View style={styles.metaItem}>
              <Ionicons name="person-outline" size={13} color={T.muted} />
              <Text style={styles.metaText}>{item.driver.name}</Text>
            </View>
          )}
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={13} color={T.muted} />
            <Text style={styles.metaText}>{formatDate(item.createdAt)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={13} color={T.muted} style={{ marginLeft: 'auto' }} />
        </View>

        {item.status === 'completed' && (
          <View style={styles.cardFooter}>
            <View style={styles.starsRow}>
              {[1,2,3,4,5].map(s => (
                <Ionicons key={s} name={s <= (item.driverRating ?? 0) ? 'star' : 'star-outline'} size={14} color="#FBBF24" />
              ))}
            </View>
            <TouchableOpacity
              style={styles.rebookBtn}
              onPress={() => router.push({ pathname: '/(passenger)/', params: { prefillDest: item.dropoff.address } })}
            >
              <Ionicons name="refresh-outline" size={13} color={T.teal} />
              <Text style={styles.rebookText}>Réserver à nouveau</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Historique</Text>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => { setFilter(f.key); setPage(1); }}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={T.teal} size="large" /></View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(t) => t._id}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          onEndReached={() => { if (page < totalPages && !loadingMore) load(page + 1, filter, false); }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={T.teal} style={{ margin: 16 }} /> : null}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="car-outline" size={40} color={T.muted} />
              </View>
              <Text style={styles.emptyTitle}>Aucune course</Text>
              <Text style={styles.emptySub}>Vos courses apparaîtront ici une fois terminées.</Text>
            </View>
          }
        />
      )}

      {/* Trip detail modal */}
      <Modal visible={!!selectedTrip} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedTrip(null)}>
        {selectedTrip && (() => {
          const trip = selectedTrip;
          const conf = STATUS_CONFIG[trip.status as StatusKey] ?? { label: trip.status, color: T.sub, bg: T.card, icon: 'ellipse-outline' as keyof typeof Ionicons.glyphMap };
          const fare = (trip.finalFare ?? trip.estimatedFare).toLocaleString('fr-CI');
          const vehicleIcon = VEHICLE_ICONS[trip.vehicleType] ?? 'car-outline';
          return (
            <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
              <View style={styles.detailHeader}>
                <TouchableOpacity onPress={() => setSelectedTrip(null)} style={styles.detailClose}>
                  <Ionicons name="close" size={22} color={T.text} />
                </TouchableOpacity>
                <Text style={styles.detailTitle}>Détails de la course</Text>
                <View style={{ width: 40 }} />
              </View>
              <ScrollView contentContainerStyle={styles.detailScroll} showsVerticalScrollIndicator={false}>
                {/* Status + fare */}
                <View style={styles.detailTopRow}>
                  <View style={[styles.statusBadge, { backgroundColor: conf.bg }]}>
                    <Ionicons name={conf.icon} size={12} color={conf.color} style={{ marginRight: 4 }} />
                    <Text style={[styles.statusText, { color: conf.color }]}>{conf.label}</Text>
                  </View>
                  <Text style={styles.detailFare}>{fare} FCFA</Text>
                </View>
                <Text style={styles.detailDate}>{formatDateTime(trip.createdAt)}</Text>

                {/* Route */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Trajet</Text>
                  <View style={styles.routeRow}>
                    <View style={styles.routeTrack}>
                      <View style={[styles.routeDot, { backgroundColor: T.success }]} />
                      <View style={styles.routeLine} />
                      <View style={[styles.routeDot, { backgroundColor: T.teal, borderRadius: 2 }]} />
                    </View>
                    <View style={styles.routeAddresses}>
                      <Text style={styles.detailAddr}>{trip.pickup.address}</Text>
                      <Text style={styles.detailAddr}>{trip.dropoff.address}</Text>
                    </View>
                  </View>
                  {trip.distanceKm ? (
                    <Text style={styles.detailMeta}>{trip.distanceKm.toFixed(1)} km · {trip.durationMin ?? '—'} min</Text>
                  ) : null}
                </View>

                {/* Vehicle */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Véhicule</Text>
                  <View style={styles.metaItem}>
                    <Ionicons name={vehicleIcon} size={16} color={T.sub} />
                    <Text style={styles.detailMetaVal}>{VEHICLE_LABELS[trip.vehicleType] ?? trip.vehicleType}</Text>
                  </View>
                </View>

                {/* Driver */}
                {trip.driver && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Conducteur</Text>
                    <View style={styles.driverRow}>
                      <View style={styles.driverAvatar}>
                        <Text style={styles.driverInitial}>{trip.driver.name[0]?.toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.driverName}>{trip.driver.name}</Text>
                        <Text style={styles.driverPlate}>{trip.driver.vehiclePlate}</Text>
                      </View>
                      <View style={styles.starsRow}>
                        {[1,2,3,4,5].map(s => (
                          <Ionicons key={s} name={s <= (trip.driver!.rating ?? 0) ? 'star' : 'star-outline'} size={13} color="#FBBF24" />
                        ))}
                      </View>
                    </View>
                  </View>
                )}

                {/* Fare breakdown */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Récapitulatif</Text>
                  <View style={styles.fareRow}>
                    <Text style={styles.fareLine}>Tarif estimé</Text>
                    <Text style={styles.fareLineVal}>{trip.estimatedFare.toLocaleString('fr-CI')} FCFA</Text>
                  </View>
                  {trip.finalFare !== undefined && trip.finalFare !== trip.estimatedFare && (
                    <View style={styles.fareRow}>
                      <Text style={styles.fareLine}>Montant final</Text>
                      <Text style={[styles.fareLineVal, { color: T.teal, fontWeight: T.bold }]}>{trip.finalFare.toLocaleString('fr-CI')} FCFA</Text>
                    </View>
                  )}
                </View>

                {/* Actions */}
                <View style={styles.detailActions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => shareReceipt(trip)}>
                    <Ionicons name="share-outline" size={18} color={T.teal} />
                    <Text style={styles.actionBtnText}>Partager le reçu</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => reportTrip(trip)} disabled={reporting}>
                    <Ionicons name="flag-outline" size={18} color={T.danger} />
                    <Text style={[styles.actionBtnText, { color: T.danger }]}>Signaler un problème</Text>
                  </TouchableOpacity>
                </View>

                {trip.status === 'completed' && (
                  <TouchableOpacity
                    style={styles.rebookBtnLarge}
                    onPress={() => { setSelectedTrip(null); router.push({ pathname: '/(passenger)/', params: { prefillDest: trip.dropoff.address } }); }}
                  >
                    <Ionicons name="refresh-outline" size={18} color="#fff" />
                    <Text style={styles.rebookBtnLargeText}>Réserver à nouveau</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </SafeAreaView>
          );
        })()}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:               { flex: 1, backgroundColor: T.bg },
  center:             { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:             { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8 },
  title:              { color: T.text, fontSize: 28, fontWeight: T.xbold },

  filterRow:          { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 16, gap: 8 },
  filterChip:         { paddingHorizontal: 18, paddingVertical: 8, borderRadius: T.rFull, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border },
  filterChipActive:   { borderColor: T.teal, backgroundColor: T.tealDim },
  filterText:         { color: T.muted, fontSize: 13, fontWeight: T.semi },
  filterTextActive:   { color: T.teal, fontWeight: T.bold },

  list:               { paddingHorizontal: 20, gap: 12, paddingBottom: 40 },

  card:               { backgroundColor: T.surface, borderRadius: T.r16, padding: 16, borderWidth: 1, borderColor: T.border },
  cardTop:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  statusBadge:        { flexDirection: 'row', alignItems: 'center', borderRadius: T.rFull, paddingHorizontal: 10, paddingVertical: 5 },
  statusText:         { fontSize: 12, fontWeight: T.bold },
  fare:               { color: T.text, fontWeight: T.xbold, fontSize: 17 },
  fareCur:            { color: T.sub, fontSize: 13, fontWeight: T.semi },

  routeRow:           { flexDirection: 'row', gap: 12, marginBottom: 14 },
  routeTrack:         { alignItems: 'center', paddingTop: 2, width: 10 },
  routeDot:           { width: 10, height: 10, borderRadius: 5 },
  routeLine:          { width: 2, flex: 1, backgroundColor: T.border, marginVertical: 4 },
  routeAddresses:     { flex: 1, gap: 10 },
  addressText:        { color: T.sub, fontSize: 13, lineHeight: 18 },

  cardMeta:           { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: T.border, alignItems: 'center' },
  metaItem:           { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:           { color: T.muted, fontSize: 12 },

  cardFooter:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: T.border },
  starsRow:           { flexDirection: 'row', gap: 2 },
  rebookBtn:          { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: T.tealDim, borderRadius: T.r8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: T.tealBorder },
  rebookText:         { color: T.teal, fontSize: 12, fontWeight: T.semi },

  emptyWrap:          { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyIconWrap:      { width: 72, height: 72, borderRadius: 36, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle:         { color: T.text, fontSize: 18, fontWeight: T.bold, marginBottom: 8 },
  emptySub:           { color: T.muted, fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // Detail modal
  detailHeader:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.border },
  detailClose:        { width: 40, height: 40, borderRadius: 20, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  detailTitle:        { color: T.text, fontSize: 16, fontWeight: T.bold },
  detailScroll:       { padding: 20 },
  detailTopRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  detailFare:         { color: T.teal, fontSize: 24, fontWeight: T.xbold },
  detailDate:         { color: T.muted, fontSize: 13, marginBottom: 20 },
  detailSection:      { backgroundColor: T.surface, borderRadius: T.r16, padding: 16, borderWidth: 1, borderColor: T.border, marginBottom: 12 },
  detailSectionTitle: { color: T.sub, fontSize: 11, fontWeight: T.bold, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  detailAddr:         { color: T.text, fontSize: 14, lineHeight: 22 },
  detailMeta:         { color: T.muted, fontSize: 12, marginTop: 10 },
  detailMetaVal:      { color: T.text, fontSize: 14, marginLeft: 8 },
  driverRow:          { flexDirection: 'row', alignItems: 'center', gap: 12 },
  driverAvatar:       { width: 44, height: 44, borderRadius: 22, backgroundColor: T.tealDim, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.tealBorder },
  driverInitial:      { color: T.teal, fontSize: 18, fontWeight: T.xbold },
  driverName:         { color: T.text, fontSize: 14, fontWeight: T.semi },
  driverPlate:        { color: T.muted, fontSize: 12, marginTop: 2 },
  fareRow:            { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  fareLine:           { color: T.sub, fontSize: 14 },
  fareLineVal:        { color: T.text, fontSize: 14 },
  detailActions:      { gap: 10, marginBottom: 16 },
  actionBtn:          { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: T.tealDim, borderRadius: T.r12, padding: 14, borderWidth: 1, borderColor: T.tealBorder },
  actionBtnDanger:    { backgroundColor: `${T.danger}10`, borderColor: `${T.danger}30` },
  actionBtnText:      { color: T.teal, fontSize: 14, fontWeight: T.semi },
  rebookBtnLarge:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: T.teal, borderRadius: T.rFull, paddingVertical: 14, marginBottom: 20 },
  rebookBtnLargeText: { color: '#fff', fontSize: 15, fontWeight: T.bold },
});
