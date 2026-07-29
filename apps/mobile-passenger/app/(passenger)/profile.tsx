import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Alert, BackHandler, FlatList, Linking, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import { useAuth } from '../../src/context/AuthContext';
import client from '../../src/api/client';
import { T } from '../../src/theme';

const PRIVACY_URL = 'https://tekeche.com/privacy';

interface Contact { _id: string; name: string; phone: string; relationship?: string; }
interface SavedAddress { _id: string; label: string; address: string; }

const CONTACT_COLORS = [T.teal, T.success, '#7C3AED', '#F59E0B', T.danger];

export default function PassengerProfileScreen() {
  const { user, signOut, refreshUser } = useAuth();
  const router = useRouter();
  const [name, setName]     = useState(user?.name ?? '');
  const [email, setEmail]   = useState((user?.email as string) ?? '');
  const [saving, setSaving] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showAdd, setShowAdd]   = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [cName, setCName] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cRel, setCRel]   = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadContacts();
    client.get('/address').then(({ data }) => setSavedAddresses(data.addresses ?? [])).catch(() => {});
  }, []);

  const loadContacts = async () => {
    try {
      const { data } = await client.get('/emergency/contacts');
      setContacts(data.contacts ?? []);
    } catch {}
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await client.put('/auth/profile', { name, email });
      refreshUser(data.user);
      Alert.alert('Succès', 'Profil mis à jour.');
    } catch (err: any) { Alert.alert('Erreur', err.message); }
    finally { setSaving(false); }
  };

  const handleAddContact = async () => {
    if (!cName.trim() || !cPhone.trim()) return Alert.alert('Erreur', 'Nom et téléphone requis.');
    setAdding(true);
    try {
      await client.post('/emergency/contacts', { name: cName.trim(), phone: cPhone.trim(), relationship: cRel.trim() });
      setCName(''); setCPhone(''); setCRel('');
      setShowAdd(false);
      loadContacts();
    } catch (err: any) { Alert.alert('Erreur', err.message); }
    finally { setAdding(false); }
  };

  const handleDelete = (id: string, contactName: string) => {
    Alert.alert('Supprimer', `Supprimer ${contactName} ?`, [
      { text: 'Annuler' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        setDeletingId(id);
        try { await client.delete(`/emergency/contacts/${id}`); loadContacts(); } catch {}
        finally { setDeletingId(null); }
      }},
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={contacts}
        keyExtractor={(c) => c._id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={() => (
          <>
            {/* Avatar header */}
            <View style={styles.headerWrap}>
              <View style={styles.avatarRing}>
                <Text style={styles.avatarText}>{(user?.name as string)?.[0]?.toUpperCase() ?? '?'}</Text>
              </View>
              <Text style={styles.userName}>{user?.name as string ?? 'Profil'}</Text>
              <Text style={styles.userPhone}>{user?.phone as string}</Text>
            </View>

            {/* Personal info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Informations personnelles</Text>
              <Input label="Nom complet" value={name} onChangeText={setName} placeholder="Votre nom" />
              <Input label="Email (optionnel)" value={email} onChangeText={setEmail} placeholder="votre@email.com" keyboardType="email-address" autoCapitalize="none" />
              <Button label="Enregistrer les modifications" onPress={handleSave} loading={saving} />
            </View>

            {/* Emergency contacts */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Contacts SOS</Text>
                  <Text style={styles.sectionSub}>Alertés automatiquement en cas d'urgence</Text>
                </View>
                {contacts.length < 3 && (
                  <TouchableOpacity style={styles.addChip} onPress={() => setShowAdd(!showAdd)}>
                    <Ionicons name={showAdd ? 'close' : 'add'} size={14} color={T.teal} />
                    <Text style={styles.addChipText}>{showAdd ? 'Fermer' : 'Ajouter'}</Text>
                  </TouchableOpacity>
                )}
                {contacts.length >= 3 && (
                  <View style={styles.maxChip}>
                    <Text style={styles.maxChipText}>3/3 max</Text>
                  </View>
                )}
              </View>

              {showAdd && (
                <View style={styles.addForm}>
                  <Input value={cName} onChangeText={setCName} placeholder="Nom (ex : Maman)" />
                  <Input value={cPhone} onChangeText={setCPhone} placeholder="Téléphone (+22507…)" keyboardType="phone-pad" />
                  <Input value={cRel} onChangeText={setCRel} placeholder="Relation (optionnel)" />
                  <Button label="Ajouter ce contact" onPress={handleAddContact} loading={adding} />
                </View>
              )}

              {contacts.length === 0 && !showAdd && (
                <View style={styles.emptyContacts}>
                  <Text style={styles.emptyContactsText}>Aucun contact d'urgence ajouté.</Text>
                </View>
              )}
            </View>

            {contacts.length > 0 && (
              <Text style={styles.contactsLabel}>Vos contacts d'urgence</Text>
            )}
          </>
        )}
        renderItem={({ item, index }) => (
          <View style={styles.contactRow}>
            <View style={[styles.contactAvatar, { backgroundColor: CONTACT_COLORS[index % CONTACT_COLORS.length] + '22', borderColor: CONTACT_COLORS[index % CONTACT_COLORS.length] + '44' }]}>
              <Text style={[styles.contactInitial, { color: CONTACT_COLORS[index % CONTACT_COLORS.length] }]}>
                {item.name?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.contactName}>{item.name}</Text>
              <Text style={styles.contactPhone}>{item.phone}{item.relationship ? ` · ${item.relationship}` : ''}</Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(item._id, item.name)} disabled={deletingId === item._id} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              {deletingId === item._id
                ? <ActivityIndicator size="small" color={T.danger} />
                : <Ionicons name="trash-outline" size={18} color={T.danger} />
              }
            </TouchableOpacity>
          </View>
        )}
        ListFooterComponent={() => (
          <View style={styles.footer}>
            {savedAddresses.length > 0 && (
              <View style={[styles.section, { marginHorizontal: 0 }]}>
                <Text style={styles.sectionTitle}>Adresses sauvegardées</Text>
                {savedAddresses.map((a) => (
                  <View key={a._id} style={styles.addrRow}>
                    <View style={styles.addrIconWrap}>
                      <Ionicons name="bookmark" size={16} color={T.teal} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.addrLabel}>{a.label}</Text>
                      <Text style={styles.addrText} numberOfLines={1}>{a.address}</Text>
                    </View>
                    <TouchableOpacity onPress={() => {
                      Alert.alert('Supprimer', `Supprimer "${a.label}" ?`, [
                        { text: 'Annuler' },
                        { text: 'Supprimer', style: 'destructive', onPress: async () => {
                          try { await client.delete(`/address/${a._id}`); setSavedAddresses(prev => prev.filter(x => x._id !== a._id)); } catch {}
                        }},
                      ]);
                    }} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                      <Ionicons name="trash-outline" size={18} color={T.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            <Button
              label="Fermer l'application"
              variant="outline"
              onPress={() => Alert.alert('Fermer', 'Voulez-vous fermer l\'application ?', [{ text: 'Annuler' }, { text: 'Fermer', style: 'destructive', onPress: () => BackHandler.exitApp() }])}
            />
            <View style={styles.legalRow}>
              <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)}>
                <Text style={styles.legalLink}>Confidentialité</Text>
              </TouchableOpacity>
              <Text style={styles.legalDot}>·</Text>
              <TouchableOpacity onPress={() => router.push('/(passenger)/aup')}>
                <Text style={styles.legalLink}>Conditions d'utilisation</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: T.bg },
  list:              { paddingBottom: 48 },

  // Header
  headerWrap:        { alignItems: 'center', paddingTop: 32, paddingBottom: 24, paddingHorizontal: 20 },
  avatarRing:        { width: 88, height: 88, borderRadius: 44, backgroundColor: T.teal, alignItems: 'center', justifyContent: 'center', marginBottom: 14, shadowColor: T.teal, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
  avatarText:        { color: '#fff', fontSize: 34, fontWeight: T.xbold },
  userName:          { color: T.text, fontSize: 20, fontWeight: T.bold, marginBottom: 4 },
  userPhone:         { color: T.sub, fontSize: 14 },

  // Sections
  section:           { marginHorizontal: 20, marginBottom: 16, backgroundColor: T.surface, borderRadius: T.r20, padding: 18, borderWidth: 1, borderColor: T.border },
  sectionHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  sectionTitle:      { color: T.text, fontSize: 15, fontWeight: T.bold, marginBottom: 4 },
  sectionSub:        { color: T.muted, fontSize: 12 },
  addChip:           { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: T.tealDim, borderRadius: T.rFull, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: T.tealBorder },
  addChipText:       { color: T.teal, fontSize: 12, fontWeight: T.bold },
  addForm:           { borderTopWidth: 1, borderTopColor: T.border, paddingTop: 14, marginTop: 8 },
  emptyContacts:     { paddingVertical: 16, alignItems: 'center' },
  emptyContactsText: { color: T.muted, fontSize: 13 },
  maxChip:           { backgroundColor: T.surface, borderRadius: T.rFull, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: T.border },
  maxChipText:       { color: T.muted, fontSize: 11, fontWeight: T.semi },

  // Contacts list
  contactsLabel:     { color: T.muted, fontSize: 11, fontWeight: T.semi, textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 20, marginBottom: 8 },
  contactRow:        { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, backgroundColor: T.surface, borderRadius: T.r16, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: T.border },
  contactAvatar:     { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  contactInitial:    { fontSize: 18, fontWeight: T.xbold },
  contactName:       { color: T.text, fontWeight: T.semi, fontSize: 14 },
  contactPhone:      { color: T.sub, fontSize: 12, marginTop: 2 },
  deleteIcon:        { fontSize: 18 },

  addrRow:           { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: T.border, gap: 12 },
  addrIconWrap:      { width: 32, height: 32, borderRadius: T.r8, backgroundColor: T.tealDim, alignItems: 'center', justifyContent: 'center' },
  addrLabel:         { color: T.text, fontWeight: T.semi, fontSize: 14 },
  addrText:          { color: T.sub, fontSize: 12, marginTop: 2 },

  // Footer
  footer:            { marginHorizontal: 20, marginTop: 24 },
  legalRow:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  legalLink:         { color: T.muted, fontSize: 12, textDecorationLine: 'underline' },
  legalDot:          { color: T.muted, fontSize: 12 },
});
