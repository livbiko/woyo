import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import client from '../../src/api/client';
import { T } from '../../src/theme';

const API_BASE = 'https://api.tekeche.com';

const safeImageUri = (url: string, token?: string): string => {
  try {
    const absolute = url.startsWith('http') ? url : `${API_BASE}${url}`;
    const parsed = new URL(absolute);
    if (!parsed.protocol.startsWith('http')) return '';
    if (token) parsed.searchParams.set('token', token);
    return parsed.toString();
  } catch { return ''; }
};

interface KycDoc { type: string; url: string; rejectionReason?: string; }

const DOC_TYPES: { key: string; label: string; desc: string; required: boolean }[] = [
  { key: 'national_id_front',      label: 'CNI (recto)',                  desc: "Face avant de votre Carte Nationale d'Identité",          required: true  },
  { key: 'national_id_back',       label: 'CNI (verso)',                  desc: "Face arrière de votre Carte Nationale d'Identité",         required: false },
  { key: 'drivers_license',        label: 'Permis de conduire',           desc: 'Votre permis de conduire valide',                          required: true  },
  { key: 'vehicle_insurance',      label: 'Assurance véhicule',           desc: "Attestation d'assurance en cours de validité",             required: true  },
  { key: 'vehicle_roadworthiness', label: 'Visite technique',             desc: 'Certificat de visite technique valide',                    required: true  },
  { key: 'criminal_record',        label: 'Casier judiciaire (B3)',       desc: 'Extrait de casier judiciaire bulletin n°3 (moins de 3 mois)', required: true },
  { key: 'vehicle_photo',          label: 'Photo du véhicule',            desc: 'Photo de votre véhicule avec la plaque visible',           required: true  },
  { key: 'selfie',                 label: 'Selfie de vérification',       desc: 'Photo de vous tenant votre CNI',                          required: false },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending:  { label: 'En attente de soumission', color: T.warning, bg: `${T.warning}18`, icon: '⏳' },
  verified: { label: 'En cours de vérification', color: '#60A5FA', bg: '#60A5FA18',      icon: '🔍' },
  approved: { label: 'Compte vérifié',           color: T.success, bg: `${T.success}18`, icon: '✅' },
  rejected: { label: 'Documents refusés',        color: T.danger,  bg: `${T.danger}18`,  icon: '❌' },
};

export default function KycScreen() {
  const router = useRouter();
  const [kycStatus, setKycStatus]             = useState<string>('pending');
  const [documents, setDocuments]             = useState<KycDoc[]>([]);
  const [licenseExpiry, setLicenseExpiry]     = useState('');
  const [uploading, setUploading]             = useState<string | null>(null);
  const [submitting, setSubmitting]           = useState(false);
  const [loadingInit, setLoadingInit]         = useState(true);
  const [authToken, setAuthToken]             = useState<string | undefined>(undefined);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [kycRes, token] = await Promise.all([
        client.get('/drivers/kyc'),
        SecureStore.getItemAsync('token'),
      ]);
      setAuthToken(token ?? undefined);
      setKycStatus(kycRes.data.kycStatus);
      setDocuments(kycRes.data.documents ?? []);
      if (kycRes.data.driversLicenseExpiry) {
        const d = new Date(kycRes.data.driversLicenseExpiry);
        setLicenseExpiry(`${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`);
      }
    } catch {}
    finally { setLoadingInit(false); }
  };

  const getDoc = (key: string) => documents.find((d) => d.type === key);

  const pickAndUpload = async (docType: string) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', "Autorisez l'accès à la galerie pour uploader un document.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true });
    if (result.canceled || !result.assets.length) return;
    const asset = result.assets[0];

    setUploading(docType);
    try {
      const form = new FormData();
      form.append('docType', docType);
      form.append('document', { uri: asset.uri, name: 'doc.jpg', type: 'image/jpeg' } as any);
      const { data } = await client.post('/drivers/kyc/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setDocuments((prev) => [...prev.filter((d) => d.type !== docType), { type: docType, url: data.url }]);
    } catch (err: any) { Alert.alert('Erreur', err.message ?? 'Upload échoué.'); }
    finally { setUploading(null); }
  };

  const handleDateChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    let formatted = digits;
    if (digits.length > 4) formatted = `${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4)}`;
    else if (digits.length > 2) formatted = `${digits.slice(0,2)}/${digits.slice(2)}`;
    setLicenseExpiry(formatted);
  };

  const parseDateFR = (val: string): string | null => {
    // Accepts DD/MM/YYYY
    const parts = val.split('/');
    if (parts.length !== 3) return null;
    const [d, m, y] = parts;
    const date = new Date(`${y}-${m}-${d}`);
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
  };

  const handleSubmit = async () => {
    const isoExpiry = parseDateFR(licenseExpiry);
    if (!isoExpiry) {
      Alert.alert('Date invalide', 'Entrez la date d\'expiration du permis au format JJ/MM/AAAA.');
      return;
    }
    if (new Date(isoExpiry) <= new Date()) {
      Alert.alert('Permis expiré', 'La date d\'expiration du permis doit être dans le futur.');
      return;
    }
    setSubmitting(true);
    try {
      await client.post('/drivers/kyc/submit', { driversLicenseExpiry: isoExpiry });
      setKycStatus('verified');
      Alert.alert('Soumis !', 'Vos documents ont été soumis. Vérification sous 24-48h.');
    } catch (err: any) { Alert.alert('Erreur', err.message); }
    finally { setSubmitting(false); }
  };

  const requiredUploaded = DOC_TYPES.filter((d) => d.required).every((d) => !!getDoc(d.key));
  const canSubmit    = requiredUploaded && licenseExpiry.length >= 8;
  const isApproved   = kycStatus === 'approved';
  const isSubmitted  = kycStatus === 'verified';

  if (loadingInit) return <View style={styles.center}><ActivityIndicator color={T.teal} size="large" /></View>;

  const statusConf = STATUS_CONFIG[kycStatus] ?? STATUS_CONFIG.pending;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Vérification KYC</Text>
        <Text style={styles.subtitle}>Soumettez vos documents pour activer votre compte chauffeur et commencer à recevoir des courses.</Text>

        {/* Status banner */}
        <View style={[styles.statusBanner, { backgroundColor: statusConf.bg, borderColor: statusConf.color + '33' }]}>
          <Text style={styles.statusIcon}>{statusConf.icon}</Text>
          <Text style={[styles.statusText, { color: statusConf.color }]}>{statusConf.label}</Text>
        </View>

        {/* Licence expiry date */}
        {!isApproved && !isSubmitted && (
          <View style={styles.dateCard}>
            <Text style={styles.docLabel}>
              Date d'expiration du permis <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.docDesc}>Format : JJ/MM/AAAA — ex. 15/06/2028</Text>
            <TextInput
              style={styles.dateInput}
              value={licenseExpiry}
              onChangeText={handleDateChange}
              placeholder="JJ/MM/AAAA"
              placeholderTextColor={T.muted}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
          </View>
        )}

        {isApproved && licenseExpiry ? (
          <View style={styles.dateCard}>
            <Text style={styles.docLabel}>Date d'expiration du permis</Text>
            <Text style={[styles.docDesc, { color: T.success }]}>✓ {licenseExpiry}</Text>
          </View>
        ) : null}

        {/* Document cards */}
        {DOC_TYPES.map((doc) => {
          const uploaded    = getDoc(doc.key);
          const isUploading = uploading === doc.key;

          return (
            <View key={doc.key} style={[styles.docCard, uploaded && styles.docCardUploaded]}>
              <View style={styles.docHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docLabel}>
                    {doc.label}
                    {doc.required && <Text style={styles.required}> *</Text>}
                  </Text>
                  <Text style={styles.docDesc}>{doc.desc}</Text>
                </View>
                {uploaded && (
                  <View style={styles.checkBadge}>
                    <Text style={styles.checkText}>✓</Text>
                  </View>
                )}
              </View>

              {uploaded?.rejectionReason && (
                <Text style={styles.rejectionReason}>❌ {uploaded.rejectionReason}</Text>
              )}

              {uploaded && (
                <Image source={{ uri: safeImageUri(uploaded.url, authToken) }} style={styles.preview} resizeMode="cover" />
              )}

              {!isApproved && !isSubmitted && (
                <TouchableOpacity
                  style={[styles.uploadBtn, (isUploading || !!uploading) && styles.uploadBtnDisabled]}
                  onPress={() => pickAndUpload(doc.key)}
                  disabled={isUploading || !!uploading}
                >
                  {isUploading
                    ? <ActivityIndicator color={T.teal} size="small" />
                    : <Text style={styles.uploadBtnText}>{uploaded ? '🔄 Remplacer' : '📷 Choisir une photo'}</Text>
                  }
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        {/* Submit button */}
        {!isApproved && !isSubmitted && (
          <TouchableOpacity
            style={[styles.submitBtn, (!canSubmit || submitting) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit || submitting}
          >
            {submitting
              ? <ActivityIndicator color={T.bg} />
              : <Text style={styles.submitBtnText}>Soumettre les documents →</Text>
            }
          </TouchableOpacity>
        )}

        {!isApproved && !isSubmitted && (
          <Text style={styles.hint}>* Documents obligatoires</Text>
        )}

        {isSubmitted && (
          <View style={[styles.statusBanner, { backgroundColor: T.warning + '18', borderColor: T.warning + '33', marginTop: 8 }]}>
            <Text style={styles.statusIcon}>⏳</Text>
            <Text style={[styles.statusText, { color: T.warning }]}>Documents soumis — vérification en cours (24-48h)</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: T.bg },
  center:            { flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' },
  scroll:            { padding: 20, paddingBottom: 48 },

  backBtn:           { marginBottom: 16 },
  backText:          { color: T.teal, fontSize: 15, fontWeight: T.semi },

  title:             { color: T.text, fontSize: 22, fontWeight: T.xbold, marginBottom: 6 },
  subtitle:          { color: T.sub, fontSize: 14, marginBottom: 20, lineHeight: 20 },

  statusBanner:      { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: T.r16, padding: 16, marginBottom: 20, borderWidth: 1 },
  statusIcon:        { fontSize: 20 },
  statusText:        { fontSize: 13, fontWeight: T.bold, flex: 1 },

  dateCard:          { backgroundColor: T.surface, borderRadius: T.r16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: T.border },
  dateInput:         { backgroundColor: T.card, borderRadius: T.r12, borderWidth: 1.5, borderColor: T.border, paddingHorizontal: 14, paddingVertical: 12, color: T.text, fontSize: 16, marginTop: 10, letterSpacing: 2 },

  docCard:           { backgroundColor: T.surface, borderRadius: T.r16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: T.border },
  docCardUploaded:   { borderColor: T.tealBorder },
  docHeader:         { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 10 },
  docLabel:          { color: T.text, fontSize: 15, fontWeight: T.semi },
  required:          { color: T.danger },
  docDesc:           { color: T.muted, fontSize: 12, marginTop: 2 },
  checkBadge:        { width: 28, height: 28, borderRadius: 14, backgroundColor: `${T.success}18`, borderWidth: 1.5, borderColor: `${T.success}44`, alignItems: 'center', justifyContent: 'center' },
  checkText:         { color: T.success, fontWeight: T.xbold, fontSize: 14 },

  rejectionReason:   { color: T.danger, fontSize: 12, marginBottom: 8, lineHeight: 18 },

  preview:           { width: '100%', height: 150, borderRadius: T.r12, marginBottom: 12, backgroundColor: T.card },

  uploadBtn:         { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: T.tealDim, borderRadius: T.r12, paddingVertical: 13, borderWidth: 1.5, borderColor: T.tealBorder },
  uploadBtnDisabled: { opacity: 0.5 },
  uploadBtnText:     { color: T.teal, fontWeight: T.semi, fontSize: 14 },

  submitBtn:         { backgroundColor: T.teal, borderRadius: T.rFull, paddingVertical: 16, alignItems: 'center', marginTop: 12 },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnText:     { color: T.bg, fontWeight: T.xbold, fontSize: 16 },

  hint:              { color: T.muted, fontSize: 12, textAlign: 'center', marginTop: 12 },
});
