import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../../src/api/client';
import { T } from '../../src/theme';

type Period = 'today' | 'week' | 'month';

interface PeriodData { trips: number; earnings: number; avgFare: number; }
interface EarningsResponse { today: PeriodData; week: PeriodData; month: PeriodData; total: PeriodData; }

interface TripRecord {
  _id: string;
  fare: number;
  distanceKm?: number;
  createdAt: string;
  pickup?: { address: string };
  dropoff?: { address: string };
}

const PERIODS: { id: Period; label: string }[] = [
  { id: 'today', label: "Aujourd'hui" },
  { id: 'week',  label: 'Semaine' },
  { id: 'month', label: 'Mois' },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-CI', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function DriverEarningsScreen() {
  const [period, setPeriod]           = useState<Period>('today');
  const [allData, setAllData]         = useState<EarningsResponse | null>(null);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [tripRecords, setTripRecords] = useState<TripRecord[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [acceptanceRate, setAcceptanceRate] = useState<number | null>(null);
  const [rating, setRating]           = useState<number | null>(null);

  const loadSummary = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const [earningsRes, statsRes] = await Promise.all([
        client.get('/drivers/earnings'),
        client.get('/drivers/stats').catch(() => ({ data: {} })),
      ]);
      setAllData(earningsRes.data);
      const rate = statsRes.data.acceptanceRate;
      if (rate !== undefined) setAcceptanceRate(rate);
      const r = statsRes.data.rating;
      if (r !== undefined) setRating(r);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  const handleRefresh = () => { setRefreshing(true); loadSummary(true); };

  useEffect(() => {
    setLoadingTrips(true);
    client.get(`/drivers/trips?period=${period}&limit=50`)
      .then(({ data }) => setTripRecords(data.trips ?? []))
      .catch(() => setTripRecords([]))
      .finally(() => setLoadingTrips(false));
  }, [period]);

  const data: PeriodData = allData?.[period] ?? { trips: 0, earnings: 0, avgFare: 0 };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Gains</Text>
      </View>

      {/* Period tabs */}
      <View style={styles.tabs}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={[styles.tab, period === p.id && styles.tabActive]}
            onPress={() => setPeriod(p.id)}
          >
            <Text style={[styles.tabText, period === p.id && styles.tabTextActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={T.teal} size="large" /></View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={T.teal} colors={[T.teal]} />}
        >

          {/* Main earnings card */}
          <View style={styles.mainCard}>
            <Text style={styles.mainEyebrow}>Total gagné</Text>
            <View style={styles.mainAmtRow}>
              <Text style={styles.mainAmt}>{data.earnings.toLocaleString('fr-CI')}</Text>
              <Text style={styles.mainCur}> FCFA</Text>
            </View>
            <View style={styles.mainDivider} />
            <Text style={styles.mainSub}>{data.trips} course{data.trips !== 1 ? 's' : ''} effectuée{data.trips !== 1 ? 's' : ''}</Text>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={styles.statIconWrap}>
                <Ionicons name="car-outline" size={20} color={T.teal} />
              </View>
              <Text style={styles.statValue}>{data.trips}</Text>
              <Text style={styles.statLabel}>Courses</Text>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statIconWrap}>
                <Ionicons name="trending-up-outline" size={20} color={T.teal} />
              </View>
              <Text style={styles.statValue}>{data.avgFare.toLocaleString('fr-CI')}</Text>
              <Text style={styles.statLabel}>Tarif moyen (F)</Text>
            </View>
            {acceptanceRate !== null && (
              <View style={styles.statCard}>
                <View style={styles.statIconWrap}>
                  <Ionicons name="checkmark-circle-outline" size={20} color={T.success} />
                </View>
                <Text style={[styles.statValue, { color: acceptanceRate >= 80 ? T.success : acceptanceRate >= 60 ? T.warning : T.danger }]}>
                  {Math.round(acceptanceRate)}%
                </Text>
                <Text style={styles.statLabel}>Acceptation</Text>
              </View>
            )}
            {rating !== null && (
              <View style={styles.statCard}>
                <View style={[styles.statIconWrap, { backgroundColor: '#FBBF2418' }]}>
                  <Ionicons name="star-outline" size={20} color="#FBBF24" />
                </View>
                <Text style={[styles.statValue, { color: '#FBBF24' }]}>{rating.toFixed(1)}</Text>
                <Text style={styles.statLabel}>Note / 5</Text>
              </View>
            )}
          </View>

          {/* All-time totals */}
          {allData && (
            <View style={styles.totalCard}>
              <View style={styles.totalLeft}>
                <Text style={styles.totalEyebrow}>GAINS TOTAUX</Text>
                <Text style={styles.totalAmt}>{allData.total.earnings.toLocaleString('fr-CI')} FCFA</Text>
              </View>
              <View style={styles.totalRight}>
                <Ionicons name="ribbon-outline" size={28} color={T.teal} />
                <Text style={styles.totalTrips}>{allData.total.trips} courses</Text>
              </View>
            </View>
          )}

          {/* Per-trip breakdown */}
          <View style={styles.tripsSection}>
            <Text style={styles.tripsSectionTitle}>Détail des courses</Text>
            {loadingTrips ? (
              <View style={styles.tripsLoading}>
                <ActivityIndicator color={T.teal} size="small" />
              </View>
            ) : tripRecords.length === 0 ? (
              <View style={styles.tripsEmpty}>
                <Ionicons name="car-outline" size={32} color={T.muted} />
                <Text style={styles.tripsEmptyText}>Aucune course sur cette période</Text>
              </View>
            ) : (
              tripRecords.map((trip, idx) => (
                <View key={trip._id} style={[styles.tripRow, idx < tripRecords.length - 1 && styles.tripRowBorder]}>
                  <View style={styles.tripRowLeft}>
                    <View style={styles.tripRowIconWrap}>
                      <Ionicons name="car-outline" size={15} color={T.teal} />
                    </View>
                    <View style={{ flex: 1 }}>
                      {trip.pickup && (
                        <Text style={styles.tripAddr} numberOfLines={1}>{trip.pickup.address}</Text>
                      )}
                      {trip.dropoff && (
                        <Text style={styles.tripAddrSub} numberOfLines={1}>{trip.dropoff.address}</Text>
                      )}
                      <Text style={styles.tripDate}>{formatDate(trip.createdAt)}</Text>
                    </View>
                  </View>
                  <View style={styles.tripRowRight}>
                    <Text style={styles.tripFare}>{trip.fare.toLocaleString('fr-CI')} F</Text>
                    {trip.distanceKm !== undefined && (
                      <Text style={styles.tripDist}>{trip.distanceKm.toFixed(1)} km</Text>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: T.bg },
  header:         { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 },
  title:          { color: T.text, fontSize: 28, fontWeight: T.xbold },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center' },

  tabs:           { flexDirection: 'row', marginHorizontal: 20, backgroundColor: T.surface, borderRadius: T.r12, padding: 4, marginBottom: 24, borderWidth: 1, borderColor: T.border },
  tab:            { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: T.r8 },
  tabActive:      { backgroundColor: T.teal },
  tabText:        { color: T.muted, fontSize: 13, fontWeight: T.semi },
  tabTextActive:  { color: '#fff', fontWeight: T.bold },

  content:        { paddingHorizontal: 20, gap: 16, paddingBottom: 32 },

  mainCard:       { backgroundColor: T.surface, borderRadius: T.r24, padding: 28, borderWidth: 1, borderColor: T.border },
  mainEyebrow:    { color: T.sub, fontSize: 12, fontWeight: T.semi, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  mainAmtRow:     { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 16 },
  mainAmt:        { color: T.text, fontSize: 48, fontWeight: T.xbold, lineHeight: 56 },
  mainCur:        { color: T.sub, fontSize: 18, fontWeight: T.semi, marginBottom: 6 },
  mainDivider:    { height: 1, backgroundColor: T.border, marginBottom: 12 },
  mainSub:        { color: T.sub, fontSize: 13 },

  statsRow:       { flexDirection: 'row', gap: 12 },
  statCard:       { flex: 1, backgroundColor: T.surface, borderRadius: T.r16, padding: 14, borderWidth: 1, borderColor: T.border, alignItems: 'center' },
  statIconWrap:   { width: 36, height: 36, borderRadius: T.r8, backgroundColor: T.tealDim, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue:      { color: T.text, fontSize: 20, fontWeight: T.xbold, marginBottom: 2 },
  statLabel:      { color: T.muted, fontSize: 11, textAlign: 'center' },

  totalCard:      { backgroundColor: T.surface, borderRadius: T.r16, padding: 20, borderWidth: 1, borderColor: T.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLeft:      { gap: 4 },
  totalEyebrow:   { color: T.muted, fontSize: 11, fontWeight: T.semi, textTransform: 'uppercase', letterSpacing: 0.8 },
  totalAmt:       { color: T.text, fontSize: 20, fontWeight: T.bold },
  totalRight:     { alignItems: 'center', gap: 4 },
  totalTrips:     { color: T.sub, fontSize: 11 },

  tripsSection:       { backgroundColor: T.surface, borderRadius: T.r20, borderWidth: 1, borderColor: T.border, overflow: 'hidden' },
  tripsSectionTitle:  { color: T.text, fontSize: 14, fontWeight: T.bold, padding: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: T.border },
  tripsLoading:       { padding: 24, alignItems: 'center' },
  tripsEmpty:         { padding: 32, alignItems: 'center', gap: 10 },
  tripsEmptyText:     { color: T.muted, fontSize: 13 },
  tripRow:            { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  tripRowBorder:      { borderBottomWidth: 1, borderBottomColor: T.border },
  tripRowLeft:        { flex: 1, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  tripRowIconWrap:    { width: 30, height: 30, borderRadius: 15, backgroundColor: T.tealDim, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  tripAddr:           { color: T.text, fontSize: 13, fontWeight: T.semi },
  tripAddrSub:        { color: T.sub, fontSize: 12, marginTop: 1 },
  tripDate:           { color: T.muted, fontSize: 11, marginTop: 3 },
  tripRowRight:       { alignItems: 'flex-end', gap: 2 },
  tripFare:           { color: T.teal, fontSize: 14, fontWeight: T.bold },
  tripDist:           { color: T.muted, fontSize: 11 },
});
