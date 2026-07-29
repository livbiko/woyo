import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  passenger?: { name: string; phone: string; rating?: number };
  passengerRating?: number;
}

type StatusKey = 'completed' | 'cancelled';
const STATUS_CONFIG: Record<StatusKey, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  completed: { label: 'Terminée', color: T.success, bg: `${T.success}18`, icon: 'checkmark-circle' },
  cancelled: { label: 'Annulée',  color: T.danger,  bg: `${T.danger}18`,  icon: 'close-circle'     },
};

const FILTERS = [
  { key: 'all',       label: 'Toutes'    },
  { key: 'completed', label: 'Terminées' },
  { key: 'cancelled', label: 'Annulées'  },
];

function formatDate(iso: string) {
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60)     return 'À l\'instant';
  if (diff < 3600)   return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400)  return `Il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 172800) return 'Hier';
  return d.toLocaleDateString('fr-CI', { day: 'numeric', month: 'short' });
}

export default function DriverHistoryScreen() {
  const [trips, setTrips]             = useState<Trip[]>([]);
  const [filter, setFilter]           = useState('all');
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (pageNum = 1, currentFilter = filter, replace = true, quiet = false) => {
    if (pageNum === 1 && !quiet) setLoading(true); else if (pageNum > 1) setLoadingMore(true);
    try {
      const statusParam = currentFilter !== 'all' ? `&status=${currentFilter}` : '';
      const { data } = await client.get(`/drivers/trips/history?page=${pageNum}${statusParam}`);
      setTrips(prev => replace ? data.trips : [...prev, ...data.trips]);
      setTotalPages(data.pages);
      setPage(pageNum);
    } catch {}
    finally { setLoading(false); setLoadingMore(false); setRefreshing(false); }
  }, [filter]);

  useEffect(() => { load(1, filter, true); }, [filter]);

  const handleRefresh = () => { setRefreshing(true); load(1, filter, true, true); };

  const renderItem = ({ item }: { item: Trip }) => {
    const conf = STATUS_CONFIG[item.status as StatusKey] ?? { label: item.status, color: T.sub, bg: T.card, icon: 'ellipse-outline' as keyof typeof Ionicons.glyphMap };
    const fare = (item.finalFare ?? item.estimatedFare).toLocaleString('fr-CI');

    return (
      <View style={styles.card}>
        {/* Top row: status + fare */}
        <View style={styles.cardTop}>
          <View style={[styles.statusBadge, { backgroundColor: conf.bg }]}>
            <Ionicons name={conf.icon} size={12} color={conf.color} style={{ marginRight: 4 }} />
            <Text style={[styles.statusText, { color: conf.color }]}>{conf.label}</Text>
          </View>
          <Text style={styles.fare}>{fare} <Text style={styles.fareCur}>FCFA</Text></Text>
        </View>

        {/* Route */}
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

        {/* Meta */}
        <View style={styles.cardMeta}>
          {item.passenger && (
            <View style={styles.metaItem}>
              <Ionicons name="person-outline" size={13} color={T.muted} />
              <Text style={styles.metaText}>{item.passenger.name}</Text>
            </View>
          )}
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={13} color={T.muted} />
            <Text style={styles.metaText}>{formatDate(item.createdAt)}</Text>
          </View>
          {item.vehicleType ? (
            <View style={[styles.metaItem, styles.vehicleBadge]}>
              <Text style={styles.vehicleBadgeText}>{item.vehicleType}</Text>
            </View>
          ) : null}
        </View>

        {/* Passenger rating given */}
        {item.status === 'completed' && item.passengerRating != null && (
          <View style={styles.cardFooter}>
            <Text style={styles.ratingLabel}>Note passager :</Text>
            <View style={styles.starsRow}>
              {[1,2,3,4,5].map(s => (
                <Ionicons key={s} name={s <= item.passengerRating! ? 'star' : 'star-outline'} size={14} color="#FBBF24" />
              ))}
            </View>
          </View>
        )}
      </View>
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={T.teal} colors={[T.teal]} />}
          onEndReached={() => { if (page < totalPages && !loadingMore) load(page + 1, filter, false); }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={T.teal} style={{ margin: 16 }} /> : null}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="car-outline" size={40} color={T.muted} />
              </View>
              <Text style={styles.emptyTitle}>Aucune course</Text>
              <Text style={styles.emptySub}>Vos courses effectuées apparaîtront ici.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: T.bg },
  center:           { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:           { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8 },
  title:            { color: T.text, fontSize: 28, fontWeight: T.xbold },

  filterRow:        { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 16, gap: 8 },
  filterChip:       { paddingHorizontal: 18, paddingVertical: 8, borderRadius: T.rFull, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border },
  filterChipActive: { borderColor: T.teal, backgroundColor: T.tealDim },
  filterText:       { color: T.muted, fontSize: 13, fontWeight: T.semi },
  filterTextActive: { color: T.teal, fontWeight: T.bold },

  list:             { paddingHorizontal: 20, gap: 12, paddingBottom: 40 },

  card:             { backgroundColor: T.surface, borderRadius: T.r16, padding: 16, borderWidth: 1, borderColor: T.border },
  cardTop:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  statusBadge:      { flexDirection: 'row', alignItems: 'center', borderRadius: T.rFull, paddingHorizontal: 10, paddingVertical: 5 },
  statusText:       { fontSize: 12, fontWeight: T.bold },
  fare:             { color: T.text, fontWeight: T.xbold, fontSize: 17 },
  fareCur:          { color: T.sub, fontSize: 13, fontWeight: T.semi },

  routeRow:         { flexDirection: 'row', gap: 12, marginBottom: 14 },
  routeTrack:       { alignItems: 'center', paddingTop: 2, width: 10 },
  routeDot:         { width: 10, height: 10, borderRadius: 5 },
  routeLine:        { width: 2, flex: 1, backgroundColor: T.border, marginVertical: 4 },
  routeAddresses:   { flex: 1, gap: 10 },
  addressText:      { color: T.sub, fontSize: 13, lineHeight: 18 },

  cardMeta:         { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: T.border },
  metaItem:         { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:         { color: T.muted, fontSize: 12 },

  cardFooter:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: T.border },
  ratingLabel:      { color: T.muted, fontSize: 12 },
  starsRow:         { flexDirection: 'row', gap: 2 },

  vehicleBadge:     { backgroundColor: T.elevated, borderRadius: T.rFull, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: T.border },
  vehicleBadgeText: { color: T.sub, fontSize: 11, fontWeight: T.semi, textTransform: 'capitalize' },

  emptyWrap:        { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyIconWrap:    { width: 72, height: 72, borderRadius: 36, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle:       { color: T.text, fontSize: 18, fontWeight: T.bold, marginBottom: 8 },
  emptySub:         { color: T.muted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
