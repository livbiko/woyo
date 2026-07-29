import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import { useAuth } from '../../src/context/AuthContext';
import client from '../../src/api/client';
import { T } from '../../src/theme';

interface Contact { _id: string; name: string; phone: string; relationship?: string; }

interface DocRecord {
  type: string;
  status: 'not_submitted' | 'pending' | 'approved' | 'rejected';
  url?: string;
  rejectionReason?: string;
}

const CONTACT_COLORS = [T.teal, T.success, '#7C3AED'];

const PRIVACY_URL = 'https://tekeche.com/privacy';

const KYC_CONFIG: Record<string, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  pending:  { label: 'En attente',  color: T.warning, bg: `${T.warning}15`, icon: 'time-outline' },
  verified: { label: 'En vérif.',   color: '#60A5FA',  bg: '#60A5FA15',      icon: 'search-outline' },
  approved: { label: 'Approuvé',   color: T.success, bg: `${T.success}15`, icon: 'checkmark-circle' },
  rejected: { label: 'Refusé',     color: T.danger,  bg: `${T.danger}15`,  icon: 'close-circle' },
};

const VEHICLE_LABELS: Record<string, string> = {
  moto: 'Moto', standard: 'Standard', comfort: 'Comfort', xl: 'XL', delivery: 'Livraison',
};

const DOC_TYPES: { id: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'license',      label: 'Permis de conduire',  icon: 'id-card-outline' },
  { id: 'insurance',    label: 'Assurance',            icon: 'shield-checkmark-outline' },
  { id: 'registration', label: 'Carte grise',          icon: 'document-text-outline' },
];

const DOC_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  not_submitted: { label: 'Non soumis',    color: T.muted   },
  pending:       { label: 'En attente',    color: T.warning },
  approved:      { label: 'Approuvé',      color: T.success },
  rejected:      { label: 'Refusé',        color: T.danger  },
};

export default function DriverProfileScreen() {
  const { user, refreshUser, signOut } = useAuth();
  const router = useRouter();
  const [name, setName]         = useState(user?.name ?? '');
  const [loading, setLoading]   = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showAdd, setShowAdd]   = useState(false);
  const [cName, setCName]       = useState('');
  const [cPhone, setCPhone]     = useState('');
  const [cRel, setCRel]         = useState('');
  const [adding, setAdding]     = useState(false);
  const [docs, setDocs]         = useState<DocRecord[]>([]);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [woyoEnabled, setWoyoEnabled] = useState<boolean>((user as any)?.woyo ?? false);
  const [woyoLoading, setWoyoLoading] = useState(false);
  const [woyoModal, setWoyoModal] = useState(false);
  type Quartier = { _id: string; name: string; fare: number };
  type LocaliteCity = { _id: string; name: string; fare: number; quartiers: Quartier[] };
  const [localites, setLocalites] = useState<LocaliteCity[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedLocalite, setSelectedLocalite] = useState<string>('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => { loadContacts(); loadDocs(); loadLocalites(); }, []);
  useEffect(() => { setWoyoEnabled((user as any)?.woyo ?? false); }, [user]);

  const loadLocalites = async () => {
    try {
      const { data } = await client.get('/woyo/localites');
      setLocalites(data.localites ?? []);
    } catch {}
  };

  const loadContacts = async () => {
    try {
      const { data } = await client.get('/emergency/contacts');
      setContacts(data.contacts ?? []);
    } catch {}
  };

  const loadDocs = async () => {
    try {
      const { data } = await client.get('/drivers/documents');
      setDocs(data.documents ?? []);
    } catch {}
  };

  const getDocStatus = (type: string): DocRecord =>
    docs.find(d => d.type === type) ?? { type, status: 'not_submitted' };

  const uploadDocument = async (type: string) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Autorisez l\'accès à la galerie pour soumettre vos documents.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const formData = new FormData();
    formData.append('type', type);
    formData.append('document', { uri: asset.uri, type: 'image/jpeg', name: `${type}.jpg` } as any);
    setUploadingType(type);
    try {
      await client.post('/drivers/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await loadDocs();
      Alert.alert('Document soumis', 'Votre document a été soumis pour vérification.');
    } catch (err: any) {
      Alert.alert('Erreur', err.message ?? 'Impossible de soumettre le document.');
    } finally {
      setUploadingType(null);
    }
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
        try { await client.delete(`/emergency/contacts/${id}`); loadContacts(); } catch {}
      }},
    ]);
  };

  const kycStatus   = (user as any)?.kycStatus ?? 'pending';
  const kycConf     = KYC_CONFIG[kycStatus] ?? KYC_CONFIG.pending;
  const rating      = (user as any)?.rating ?? 5.0;
  const totalTrips  = (user as any)?.totalTrips ?? 0;
  const vehicleType  = (user as any)?.vehicleType ?? '';
  const vehiclePlate = (user as any)?.vehiclePlate ?? '—';
  const vehicleModel = (user as any)?.vehicleModel ?? '';

  const openWoyoRegistration = () => {
    const kycStatus = (user as any)?.kycStatus;
    if (!['verified', 'approved'].includes(kycStatus)) {
      Alert.alert('KYC requis', 'Votre dossier KYC doit être approuvé pour rejoindre le service Woyo.');
      return;
    }
    const vehicleType = (user as any)?.vehicleType;
    if (!['standard', 'comfort', 'xl'].includes(vehicleType)) {
      Alert.alert('Véhicule non éligible', 'Seuls les véhicules Standard, Comfort et XL peuvent rejoindre le service Woyo.');
      return;
    }
    setSelectedCity('');
    setSelectedLocalite('');
    setTermsAccepted(false);
    setWoyoModal(true);
  };

  const selectedCityObj  = localites.find(c => c._id === selectedCity);
  const hasQuartiers     = (selectedCityObj?.quartiers?.length ?? 0) > 0;
  const registrationReady = termsAccepted && (
    hasQuartiers ? !!selectedLocalite : !!selectedCity
  );
  const effectiveLocaliteId = hasQuartiers ? selectedLocalite : selectedCity;

  const confirmWoyoRegistration = async () => {
    if (!termsAccepted) {
      Alert.alert('Conditions requises', 'Vous devez accepter les conditions du service Woyo.');
      return;
    }
    if (!effectiveLocaliteId) {
      Alert.alert('Localité requise', hasQuartiers ? 'Veuillez sélectionner votre quartier.' : 'Veuillez sélectionner votre localité.');
      return;
    }
    setWoyoModal(false);
    setWoyoLoading(true);
    try {
      const { data } = await client.put('/drivers/woyo', { enabled: true, termsAccepted: true, localiteId: effectiveLocaliteId });
      setWoyoEnabled(true);
      refreshUser({ ...(user as any), woyo: true });
      Alert.alert('🚐 Woyo activé !', data.message);
    } catch (err: any) {
      Alert.alert('Erreur', err.message ?? 'Impossible d\'activer le service Woyo.');
    } finally {
      setWoyoLoading(false);
    }
  };

  const handleWoyoDeactivate = () => {
    Alert.alert('Quitter Woyo ?', 'Vous ne recevrez plus de courses partagées.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Quitter', style: 'destructive',
        onPress: async () => {
          setWoyoLoading(true);
          try {
            await client.put('/drivers/woyo', { enabled: false });
            setWoyoEnabled(false);
            refreshUser({ ...(user as any), woyo: false });
          } catch (err: any) {
            Alert.alert('Erreur', err.message ?? 'Impossible de désactiver le service Woyo.');
          } finally {
            setWoyoLoading(false);
          }
        },
      },
    ]);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data } = await client.put('/drivers/profile', { name });
      refreshUser(data.driver);
      Alert.alert('Succès', 'Profil mis à jour.');
    } catch (err: any) { Alert.alert('Erreur', err.message); }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Avatar header */}
        <View style={styles.headerWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.name as string)?.[0]?.toUpperCase() ?? '?'}</Text>
          </View>
          <Text style={styles.userName}>{user?.name as string ?? 'Chauffeur'}</Text>
          <Text style={styles.userPhone}>{user?.phone as string ?? (user?.email as string)}</Text>

          {/* KYC status chip */}
          <TouchableOpacity
            style={[styles.kycChip, { backgroundColor: kycConf.bg, borderColor: kycConf.color + '50' }]}
            onPress={() => router.push('/(driver)/kyc')}
          >
            <Ionicons name={kycConf.icon} size={13} color={kycConf.color} />
            <Text style={[styles.kycChipText, { color: kycConf.color }]}>KYC : {kycConf.label}</Text>
            <Ionicons name="chevron-forward" size={13} color={kycConf.color} />
          </TouchableOpacity>
        </View>

        {/* Stats banner */}
        <View style={styles.statsBanner}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{rating.toFixed(1)}</Text>
            <View style={styles.statLabelRow}>
              <Ionicons name="star" size={12} color="#FBBF24" />
              <Text style={styles.statLabel}>Note</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalTrips}</Text>
            <View style={styles.statLabelRow}>
              <Ionicons name="car-outline" size={12} color={T.sub} />
              <Text style={styles.statLabel}>Courses</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{VEHICLE_LABELS[vehicleType] || vehicleType || '—'}</Text>
            <View style={styles.statLabelRow}>
              <Ionicons name="settings-outline" size={12} color={T.sub} />
              <Text style={styles.statLabel}>Véhicule</Text>
            </View>
          </View>
        </View>

        {/* Vehicle info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Véhicule</Text>
          {[
            { icon: 'car-outline' as keyof typeof Ionicons.glyphMap,        label: 'Type',    value: VEHICLE_LABELS[vehicleType] || vehicleType || '—' },
            { icon: 'card-outline' as keyof typeof Ionicons.glyphMap,       label: 'Plaque',  value: vehiclePlate },
            ...(vehicleModel ? [{ icon: 'construct-outline' as keyof typeof Ionicons.glyphMap, label: 'Modèle', value: vehicleModel }] : []),
            { icon: 'star-outline' as keyof typeof Ionicons.glyphMap,       label: 'Note',    value: rating.toFixed(1) + ' / 5.0' },
            ...(user?.phone ? [{ icon: 'call-outline' as keyof typeof Ionicons.glyphMap, label: 'Téléphone', value: user.phone as string }] : []),
          ].map((row) => (
            <View key={row.label} style={styles.infoRow}>
              <View style={styles.infoLeft}>
                <View style={styles.infoIconWrap}>
                  <Ionicons name={row.icon} size={16} color={T.sub} />
                </View>
                <Text style={styles.infoLabel}>{row.label}</Text>
              </View>
              <Text style={styles.infoValue}>{row.value}</Text>
            </View>
          ))}
        </View>

        {/* Documents */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Documents</Text>
          <Text style={[styles.sectionSub, { marginBottom: 14 }]}>Soumettez vos documents pour activer votre compte</Text>
          {DOC_TYPES.map((doc) => {
            const rec = getDocStatus(doc.id);
            const stConf = DOC_STATUS_CONFIG[rec.status];
            const isUploading = uploadingType === doc.id;
            return (
              <View key={doc.id} style={styles.docRow}>
                <View style={styles.docIconWrap}>
                  <Ionicons name={doc.icon} size={18} color={T.teal} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docLabel}>{doc.label}</Text>
                  <View style={styles.docStatusRow}>
                    <View style={[styles.docStatusDot, { backgroundColor: stConf.color }]} />
                    <Text style={[styles.docStatusText, { color: stConf.color }]}>{stConf.label}</Text>
                  </View>
                  {rec.status === 'rejected' && rec.rejectionReason && (
                    <Text style={styles.docRejectReason}>{rec.rejectionReason}</Text>
                  )}
                </View>
                {(rec.status === 'not_submitted' || rec.status === 'rejected') && (
                  <TouchableOpacity
                    style={[styles.docUploadBtn, isUploading && { opacity: 0.5 }]}
                    onPress={() => uploadDocument(doc.id)}
                    disabled={isUploading}
                  >
                    {isUploading
                      ? <ActivityIndicator size="small" color={T.teal} />
                      : <Ionicons name="cloud-upload-outline" size={18} color={T.teal} />
                    }
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        {/* Woyo */}
        <View style={styles.section}>
          <View style={styles.woyoTitleRow}>
            <Text style={styles.woyoIcon}>🚐</Text>
            <Text style={styles.sectionTitle}>Service Woyo</Text>
            {woyoEnabled && (
              <View style={styles.woyoActiveBadge}>
                <Text style={styles.woyoActiveBadgeText}>Actif</Text>
              </View>
            )}
          </View>
          <Text style={[styles.sectionSub, { marginBottom: 14 }]}>
            Course partagée à tarif fixe selon votre localité, jusqu'à 4 passagers
          </Text>

          <View style={styles.woyoInfoGrid}>
            {[
              { icon: '💰', label: 'Tarif fixe',   value: 'Par localité'      },
              { icon: '👥', label: 'Max passagers', value: '4 par trajet'      },
              { icon: '🗺️', label: 'Direction',     value: 'Même sens (±45°)'  },
              { icon: '📍', label: 'Rayon pickup',  value: '≤ 5 km'            },
            ].map(item => (
              <View key={item.label} style={styles.woyoInfoCard}>
                <Text style={styles.woyoInfoIcon}>{item.icon}</Text>
                <Text style={styles.woyoInfoLabel}>{item.label}</Text>
                <Text style={styles.woyoInfoValue}>{item.value}</Text>
              </View>
            ))}
          </View>

          {woyoLoading ? (
            <ActivityIndicator size="small" color={T.teal} style={{ marginVertical: 8 }} />
          ) : woyoEnabled ? (
            <TouchableOpacity style={styles.woyoDeactivateBtn} onPress={handleWoyoDeactivate}>
              <Ionicons name="close-circle-outline" size={16} color={T.danger} />
              <Text style={styles.woyoDeactivateBtnText}>Quitter le service Woyo</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.woyoRegisterBtn} onPress={openWoyoRegistration}>
              <Text style={styles.woyoRegisterBtnText}>S'inscrire à Woyo</Text>
              <Ionicons name="arrow-forward" size={15} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Woyo Registration Modal */}
        <Modal visible={woyoModal} animationType="slide" transparent onRequestClose={() => setWoyoModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>🚐 Inscription Woyo</Text>
              <Text style={styles.modalSub}>Lisez et acceptez les conditions avant de vous inscrire</Text>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              <View style={styles.termsBox}>
                {[
                  'Le tarif est fixe selon votre localité (ex. 200 FCFA à Divo, 300 FCFA à Gagnoa).',
                  'Vous pouvez transporter jusqu\'à 4 passagers allant dans la même direction (±45°).',
                  'Le passager peut se trouver dans un rayon de 5 km de votre position.',
                  'L\'admin peut activer ou désactiver votre accès Woyo à tout moment.',
                  'Vous conservez votre activité normale (courses individuelles) en parallèle.',
                ].map((term, i) => (
                  <View key={i} style={styles.termRow}>
                    <Text style={styles.termBullet}>•</Text>
                    <Text style={styles.termText}>{term}</Text>
                  </View>
                ))}
              </View>

              {/* Step 1: city picker */}
              <Text style={styles.modalSectionLabel}>Votre ville</Text>
              <View style={[styles.localiteGrid, { marginBottom: 16 }]}>
                {localites.length === 0 && <ActivityIndicator size="small" color={T.teal} />}
                {localites.map(city => (
                  <TouchableOpacity
                    key={city._id}
                    style={[styles.localiteChip, selectedCity === city._id && styles.localiteChipSelected]}
                    onPress={() => { setSelectedCity(city._id); setSelectedLocalite(''); }}
                  >
                    <Text style={[styles.localiteChipText, selectedCity === city._id && styles.localiteChipTextSelected]}>
                      {city.name}
                    </Text>
                    {city.quartiers.length === 0 && (
                      <Text style={[styles.localiteFare, selectedCity === city._id && styles.localiteChipTextSelected]}>
                        {city.fare} FCFA
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Step 2: quartier picker (only if city has quartiers) */}
              {selectedCityObj && hasQuartiers && (
                <>
                  <Text style={styles.modalSectionLabel}>Votre quartier — {selectedCityObj.name}</Text>
                  <View style={[styles.localiteGrid, { marginBottom: 16 }]}>
                    {selectedCityObj.quartiers.map(q => (
                      <TouchableOpacity
                        key={q._id}
                        style={[styles.localiteChip, selectedLocalite === q._id && styles.localiteChipSelected]}
                        onPress={() => setSelectedLocalite(q._id)}
                      >
                        <Text style={[styles.localiteChipText, selectedLocalite === q._id && styles.localiteChipTextSelected]}>
                          {q.name}
                        </Text>
                        <Text style={[styles.localiteFare, selectedLocalite === q._id && styles.localiteChipTextSelected]}>
                          {q.fare} FCFA
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <TouchableOpacity style={styles.termsAcceptRow} onPress={() => setTermsAccepted(!termsAccepted)}>
                <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                  {termsAccepted && <Ionicons name="checkmark" size={12} color="#fff" />}
                </View>
                <Text style={styles.termsAcceptText}>J'ai lu et j'accepte les conditions du service Woyo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmBtn, !registrationReady && styles.modalConfirmBtnDisabled]}
                onPress={confirmWoyoRegistration}
              >
                <Text style={styles.modalConfirmBtnText}>Confirmer l'inscription</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setWoyoModal(false)}>
                <Text style={styles.modalCancelBtnText}>Annuler</Text>
              </TouchableOpacity>

              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Edit name */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Modifier le profil</Text>
          <Input label="Nom complet" value={name} onChangeText={setName} placeholder="Votre nom" />
          <Button label="Enregistrer" onPress={handleSave} loading={loading} />
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

          {contacts.map((c, index) => (
            <View key={c._id} style={styles.contactRow}>
              <View style={[styles.contactAvatar, { backgroundColor: CONTACT_COLORS[index % CONTACT_COLORS.length] + '22', borderColor: CONTACT_COLORS[index % CONTACT_COLORS.length] + '44' }]}>
                <Text style={[styles.contactInitial, { color: CONTACT_COLORS[index % CONTACT_COLORS.length] }]}>
                  {c.name?.[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactName}>{c.name}</Text>
                <Text style={styles.contactPhone}>{c.phone}{c.relationship ? ` · ${c.relationship}` : ''}</Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(c._id, c.name)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <Ionicons name="trash-outline" size={18} color={T.danger} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Logout */}
        <View style={styles.logoutWrap}>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
              { text: 'Annuler' },
              { text: 'Déconnecter', style: 'destructive', onPress: () => signOut() },
            ])}
          >
            <Ionicons name="log-out-outline" size={18} color={T.danger} />
            <Text style={styles.logoutText}>Déconnexion</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.legalRow}>
          <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)}>
            <Text style={styles.legalLink}>Confidentialité</Text>
          </TouchableOpacity>
          <Text style={styles.legalDot}>·</Text>
          <TouchableOpacity onPress={() => router.push('/(driver)/aup')}>
            <Text style={styles.legalLink}>Conditions d'utilisation</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: T.bg },
  scroll:         { paddingBottom: 48 },

  // Header
  headerWrap:     { alignItems: 'center', paddingTop: 32, paddingBottom: 24, paddingHorizontal: 20 },
  avatar:         { width: 88, height: 88, borderRadius: 44, backgroundColor: T.teal, alignItems: 'center', justifyContent: 'center', marginBottom: 14, shadowColor: T.teal, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
  avatarText:     { color: '#fff', fontSize: 34, fontWeight: T.xbold },
  userName:       { color: T.text, fontSize: 20, fontWeight: T.bold, marginBottom: 4 },
  userPhone:      { color: T.sub, fontSize: 14, marginBottom: 16 },
  kycChip:        { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: T.rFull, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1 },
  kycChipText:    { fontSize: 13, fontWeight: T.bold },

  // Stats banner
  statsBanner:    { flexDirection: 'row', marginHorizontal: 20, marginBottom: 16, backgroundColor: T.surface, borderRadius: T.r20, borderWidth: 1, borderColor: T.border, overflow: 'hidden' },
  statItem:       { flex: 1, alignItems: 'center', paddingVertical: 18, gap: 4 },
  statDivider:    { width: 1, backgroundColor: T.border, marginVertical: 14 },
  statValue:      { color: T.text, fontSize: 18, fontWeight: T.xbold },
  statLabelRow:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statLabel:      { color: T.sub, fontSize: 12 },

  // Sections
  section:        { marginHorizontal: 20, marginBottom: 14, backgroundColor: T.surface, borderRadius: T.r20, padding: 18, borderWidth: 1, borderColor: T.border },
  sectionTitle:   { color: T.text, fontSize: 15, fontWeight: T.bold, marginBottom: 4 },
  sectionSub:     { color: T.muted, fontSize: 12 },
  sectionHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  addChip:        { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: T.tealDim, borderRadius: T.rFull, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: T.tealBorder },
  addChipText:    { color: T.teal, fontSize: 12, fontWeight: T.bold },
  maxChip:        { backgroundColor: T.surface, borderRadius: T.rFull, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: T.border },
  maxChipText:    { color: T.muted, fontSize: 11, fontWeight: T.semi },
  addForm:        { borderTopWidth: 1, borderTopColor: T.border, paddingTop: 14, marginTop: 8 },
  emptyContacts:  { paddingVertical: 16, alignItems: 'center' },
  emptyContactsText: { color: T.muted, fontSize: 13 },
  contactRow:     { flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: T.elevated, borderRadius: T.r12, padding: 12, borderWidth: 1, borderColor: T.border },
  contactAvatar:  { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  contactInitial: { fontSize: 16, fontWeight: T.xbold },
  contactName:    { color: T.text, fontWeight: T.semi, fontSize: 14 },
  contactPhone:   { color: T.sub, fontSize: 12, marginTop: 2 },
  infoRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.border },
  infoLeft:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoIconWrap:   { width: 30, height: 30, borderRadius: T.r8, backgroundColor: T.elevated, alignItems: 'center', justifyContent: 'center' },
  infoLabel:      { color: T.sub, fontSize: 13 },
  infoValue:      { color: T.text, fontSize: 13, fontWeight: T.semi },

  // Documents
  docRow:         { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: T.border },
  docIconWrap:    { width: 38, height: 38, borderRadius: T.r8, backgroundColor: T.tealDim, alignItems: 'center', justifyContent: 'center' },
  docLabel:       { color: T.text, fontSize: 14, fontWeight: T.semi },
  docStatusRow:   { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  docStatusDot:   { width: 6, height: 6, borderRadius: 3 },
  docStatusText:  { fontSize: 12 },
  docRejectReason:{ color: T.danger, fontSize: 11, marginTop: 2 },
  docUploadBtn:   { width: 38, height: 38, borderRadius: T.r8, backgroundColor: T.tealDim, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.tealBorder },

  // Woyo section
  woyoTitleRow:        { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  woyoIcon:            { fontSize: 18 },
  woyoActiveBadge:     { backgroundColor: `${T.teal}18`, borderRadius: T.rFull, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: `${T.teal}40` },
  woyoActiveBadgeText: { color: T.teal, fontSize: 11, fontWeight: T.bold },
  woyoInfoGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  woyoInfoCard:        { flex: 1, minWidth: '45%', backgroundColor: T.elevated, borderRadius: T.r12, padding: 12, borderWidth: 1, borderColor: T.border, alignItems: 'center' },
  woyoInfoIcon:        { fontSize: 20, marginBottom: 4 },
  woyoInfoLabel:       { color: T.muted, fontSize: 10, fontWeight: T.semi, textAlign: 'center', marginBottom: 2 },
  woyoInfoValue:       { color: T.text, fontSize: 12, fontWeight: T.bold, textAlign: 'center' },
  woyoRegisterBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: T.teal, borderRadius: T.r12, paddingVertical: 13 },
  woyoRegisterBtnText: { color: '#fff', fontSize: 14, fontWeight: T.bold },
  woyoDeactivateBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: T.r12, paddingVertical: 11, borderWidth: 1, borderColor: `${T.danger}40`, backgroundColor: `${T.danger}08` },
  woyoDeactivateBtnText: { color: T.danger, fontSize: 13, fontWeight: T.semi },

  // Woyo modal
  modalOverlay:       { flex: 1, backgroundColor: '#000000cc', justifyContent: 'flex-end' },
  modalSheet:         { backgroundColor: T.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHandle:        { width: 40, height: 4, backgroundColor: T.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle:         { color: T.text, fontSize: 20, fontWeight: T.bold, marginBottom: 4 },
  modalSub:           { color: T.sub, fontSize: 13, marginBottom: 18 },
  termsBox:           { backgroundColor: T.elevated, borderRadius: T.r12, padding: 14, marginBottom: 18, borderWidth: 1, borderColor: T.border },
  termRow:            { flexDirection: 'row', gap: 8, marginBottom: 8 },
  termBullet:         { color: T.teal, fontSize: 14, lineHeight: 20 },
  termText:           { color: T.sub, fontSize: 13, flex: 1, lineHeight: 20 },
  modalSectionLabel:  { color: T.muted, fontSize: 11, fontWeight: T.bold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  localiteGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  localiteChip:       { paddingHorizontal: 14, paddingVertical: 9, borderRadius: T.r12, borderWidth: 1, borderColor: T.border, backgroundColor: T.elevated, alignItems: 'center' },
  localiteChipSelected: { borderColor: T.teal, backgroundColor: `${T.teal}18` },
  localiteChipText:   { color: T.text, fontSize: 13, fontWeight: T.semi },
  localiteChipTextSelected: { color: T.teal },
  localiteFare:       { color: T.muted, fontSize: 11, marginTop: 2 },
  termsAcceptRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  checkbox:           { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: T.muted, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked:    { backgroundColor: T.teal, borderColor: T.teal },
  termsAcceptText:    { color: T.sub, fontSize: 13, flex: 1, lineHeight: 18 },
  modalConfirmBtn:    { backgroundColor: T.teal, borderRadius: T.r12, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  modalConfirmBtnDisabled: { opacity: 0.4 },
  modalConfirmBtnText: { color: '#fff', fontSize: 15, fontWeight: T.bold },
  modalCancelBtn:     { alignItems: 'center', paddingVertical: 10 },
  modalCancelBtnText: { color: T.muted, fontSize: 14 },

  // Logout
  logoutWrap:     { marginHorizontal: 20, marginBottom: 8 },
  logoutBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: `${T.danger}12`, borderRadius: T.r16, paddingVertical: 14, borderWidth: 1, borderColor: `${T.danger}30` },
  logoutText:     { color: T.danger, fontSize: 15, fontWeight: T.bold },

  // Legal
  legalRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  legalLink:      { color: T.muted, fontSize: 12, textDecorationLine: 'underline' },
  legalDot:       { color: T.muted, fontSize: 12 },
});
