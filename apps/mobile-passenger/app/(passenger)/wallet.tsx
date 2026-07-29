import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Linking, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSocket } from '../../src/hooks/useSocket';
import Input from '../../src/components/Input';
import Button from '../../src/components/Button';
import client from '../../src/api/client';
import { safeError } from '../../src/utils/errorMessage';
import { T } from '../../src/theme';

interface Tx { _id: string; type: string; amount: number; description: string; status: string; createdAt: string; }

const AMOUNTS = [1000, 2000, 5000, 10000];
const LOW_BALANCE_THRESHOLD = 1000;

const TX_FILTERS = [
  { key: 'all',     label: 'Toutes' },
  { key: 'topup',   label: 'Recharges' },
  { key: 'payment', label: 'Paiements' },
  { key: 'refund',  label: 'Remboursements' },
];

const txIcon  = (type: string) => ({ topup: '↓', payment: '↑', refund: '↩' }[type] ?? '·');
const txColor = (type: string) => type === 'payment' ? T.danger : T.success;
const txLabel = (type: string) => ({ topup: 'Recharge', payment: 'Paiement', refund: 'Remboursement' }[type] ?? type);

export default function WalletScreen() {
  const { socket } = useSocket();
  const [balance, setBalance]           = useState(0);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [amount, setAmount]             = useState('');
  const [loading, setLoading]           = useState(false);
  const [refreshing, setRefreshing]     = useState(false);
  const [txFilter, setTxFilter]         = useState('all');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async () => {
    try {
      const [b, t] = await Promise.all([client.get('/wallet/balance'), client.get('/wallet/transactions')]);
      setBalance(b.data.balance);
      setTransactions(t.data.transactions ?? []);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('wallet_topup_success', async (data: { amount: number; balance: number }) => {
      await load();
      Alert.alert('Recharge confirmée !', `${data.amount.toLocaleString('fr-CI')} FCFA ajoutés à votre solde.`);
    });
    return () => { socket.off('wallet_topup_success'); };
  }, [socket]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleTopUp = async () => {
    const n = parseInt(amount);
    if (!n || n < 500) return Alert.alert('Erreur', 'Montant minimum : 500 FCFA.');
    setLoading(true);
    try {
      const { data } = await client.post('/payment/paystack/topup', { amount: n });
      const balanceBefore = balance;
      await Linking.openURL(data.paymentUrl);
      Alert.alert('Paiement ouvert', "Complétez le paiement sur la page qui vient de s'ouvrir. Votre solde sera mis à jour automatiquement.");
      setAmount('');
      // Poll for balance change every 5s, up to 2 minutes
      if (pollRef.current) clearInterval(pollRef.current);
      let attempts = 0;
      pollRef.current = setInterval(async () => {
        attempts++;
        if (attempts > 24) { clearInterval(pollRef.current!); pollRef.current = null; return; }
        try {
          const { data: b } = await client.get('/wallet/balance');
          if (b.balance !== balanceBefore) {
            setBalance(b.balance);
            clearInterval(pollRef.current!); pollRef.current = null;
          }
        } catch {}
      }, 5000);
    } catch (err: any) {
      Alert.alert('Erreur', safeError(err));
    } finally { setLoading(false); }
  };

  const filtered = txFilter === 'all' ? transactions : transactions.filter(t => t.type === txFilter);

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={filtered}
        keyExtractor={(t) => t._id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={() => (
          <>
            {/* Low balance warning */}
            {balance < LOW_BALANCE_THRESHOLD && (
              <View style={styles.lowBalanceWarn}>
                <Ionicons name="warning-outline" size={16} color="#92400E" />
                <Text style={styles.lowBalanceText}>Solde faible · Rechargez pour continuer à utiliser Woyo</Text>
              </View>
            )}

            {/* Balance card */}
            <View style={styles.balanceCard}>
              <View style={styles.balanceEyebrowRow}>
                <Text style={styles.balanceEyebrow}>Solde disponible</Text>
                <TouchableOpacity onPress={handleRefresh} disabled={refreshing} style={styles.refreshBtn}>
                  {refreshing ? <ActivityIndicator size="small" color={T.teal} /> : <Ionicons name="refresh-outline" size={18} color={T.teal} />}
                </TouchableOpacity>
              </View>
              <Text style={[styles.balanceAmt, balance < LOW_BALANCE_THRESHOLD && { color: T.danger }]}>
                {balance.toLocaleString('fr-CI')}
              </Text>
              <Text style={styles.balanceCur}>FCFA</Text>
            </View>

            {/* Top-up section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recharger</Text>
              <View style={styles.methodBadge}>
                <Text style={styles.methodText}>Orange Money · MTN MoMo · Wave</Text>
              </View>
              <View style={styles.quickRow}>
                {AMOUNTS.map((a) => {
                  const active = amount === String(a);
                  return (
                    <TouchableOpacity key={a} style={[styles.quickBtn, active && styles.quickBtnActive]} onPress={() => setAmount(String(a))}>
                      <Text style={[styles.quickBtnText, active && styles.quickBtnTextActive]}>{a.toLocaleString('fr-CI')} F</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Input value={amount} onChangeText={setAmount} placeholder="Autre montant (min. 500 FCFA)" keyboardType="numeric" />
              <Button label={loading ? 'Chargement…' : 'Recharger maintenant'} onPress={handleTopUp} disabled={!amount || loading} />
            </View>

            {/* Transaction filters */}
            {transactions.length > 0 && (
              <>
                <Text style={styles.txHeader}>Historique</Text>
                <View style={styles.txFilterRow}>
                  {TX_FILTERS.map(f => (
                    <TouchableOpacity key={f.key} style={[styles.txFilterChip, txFilter === f.key && styles.txFilterChipActive]} onPress={() => setTxFilter(f.key)}>
                      <Text style={[styles.txFilterText, txFilter === f.key && styles.txFilterTextActive]}>{f.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </>
        )}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>
              {txFilter === 'all' ? "Aucune transaction pour l'instant" : 'Aucune transaction dans cette catégorie'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.txRow}>
            <View style={[styles.txIconBubble, { backgroundColor: `${txColor(item.type)}18` }]}>
              <Text style={[styles.txIconText, { color: txColor(item.type) }]}>{txIcon(item.type)}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.txDesc}>{item.description}</Text>
              <View style={styles.txMeta}>
                <Text style={styles.txDate}>{new Date(item.createdAt).toLocaleDateString('fr-CI')}</Text>
                <Text style={styles.txType}> · {txLabel(item.type)}</Text>
                {item.status === 'pending' && <Text style={styles.txPending}> · En attente</Text>}
              </View>
            </View>
            <Text style={[styles.txAmt, { color: txColor(item.type) }]}>
              {item.type === 'payment' ? '−' : '+'}{item.amount.toLocaleString('fr-CI')} F
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:               { flex: 1, backgroundColor: T.bg },
  list:               { paddingBottom: 40 },

  lowBalanceWarn:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginTop: 16, marginBottom: 4, backgroundColor: '#FEF3C7', borderRadius: T.r12, padding: 12, borderWidth: 1, borderColor: '#F59E0B44' },
  lowBalanceText:     { flex: 1, color: '#92400E', fontSize: 13, fontWeight: '600' },

  balanceCard:        { margin: 20, marginBottom: 16, backgroundColor: T.surface, borderRadius: T.r24, padding: 28, alignItems: 'center', borderWidth: 1.5, borderColor: T.tealBorder, shadowColor: T.teal, shadowOpacity: 0.15, shadowRadius: 20, elevation: 8 },
  balanceEyebrowRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  balanceEyebrow:     { color: T.sub, fontSize: 13, fontWeight: T.semi },
  refreshBtn:         { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  balanceAmt:         { color: T.teal, fontSize: 44, fontWeight: T.xbold, lineHeight: 50 },
  balanceCur:         { color: T.sub, fontSize: 14, marginTop: 2 },

  section:            { marginHorizontal: 20, backgroundColor: T.surface, borderRadius: T.r20, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: T.border },
  sectionTitle:       { color: T.text, fontSize: 16, fontWeight: T.bold, marginBottom: 14 },
  methodBadge:        { backgroundColor: T.card, borderRadius: T.r8, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 14, alignItems: 'center' },
  methodText:         { color: T.muted, fontSize: 12 },
  quickRow:           { flexDirection: 'row', gap: 8, marginBottom: 14 },
  quickBtn:           { flex: 1, backgroundColor: T.card, borderRadius: T.r8, paddingVertical: 11, alignItems: 'center', borderWidth: 1.5, borderColor: T.border },
  quickBtnActive:     { borderColor: T.teal, backgroundColor: T.tealDim },
  quickBtnText:       { color: T.sub, fontSize: 12, fontWeight: T.semi },
  quickBtnTextActive: { color: T.teal },

  txHeader:           { color: T.muted, fontSize: 12, fontWeight: T.semi, paddingHorizontal: 20, marginBottom: 8, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.8 },
  txFilterRow:        { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 12, flexWrap: 'wrap' },
  txFilterChip:       { paddingHorizontal: 14, paddingVertical: 6, borderRadius: T.rFull, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border },
  txFilterChipActive: { borderColor: T.teal, backgroundColor: T.tealDim },
  txFilterText:       { color: T.muted, fontSize: 12, fontWeight: T.semi },
  txFilterTextActive: { color: T.teal },

  txRow:              { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: T.border },
  txIconBubble:       { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  txIconText:         { fontSize: 18, fontWeight: T.bold },
  txDesc:             { color: T.text, fontSize: 14 },
  txMeta:             { flexDirection: 'row', marginTop: 2, flexWrap: 'wrap' },
  txDate:             { color: T.muted, fontSize: 12 },
  txType:             { color: T.muted, fontSize: 12 },
  txPending:          { color: T.warning, fontSize: 12 },
  txAmt:              { fontSize: 15, fontWeight: T.bold },

  emptyWrap:          { alignItems: 'center', paddingVertical: 32 },
  emptyIcon:          { fontSize: 36, marginBottom: 8 },
  emptyText:          { color: T.muted, fontSize: 14, textAlign: 'center' },
});
