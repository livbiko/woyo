import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Button from '../../src/components/Button';
import client from '../../src/api/client';
import { safeError } from '../../src/utils/errorMessage';
import { T } from '../../src/theme';

const COUNTRY_CODE  = '+225';
const ROLE = 'passenger' as const;

const toE164 = (local: string) => { const d = local.replace(/\D/g, ''); return d ? COUNTRY_CODE + d : ''; };
const isValidCIPhone = (local: string) => { const d = local.replace(/\D/g, ''); return d.length >= 8 && d.length <= 10; };

export default function PhoneScreen() {
  const router = useRouter();
  const [localPhone, setLocalPhone] = useState('');
  const [email, setEmail]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [lastOtpSentAt, setLastOtpSentAt] = useState(0);

  const handleSendOTP = async () => {
    const phone = toE164(localPhone);
    if (!phone || !isValidCIPhone(localPhone)) return Alert.alert('Erreur', 'Veuillez entrer un numéro valide.');
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) return Alert.alert('Erreur', 'Veuillez entrer une adresse email valide.');
    if (Date.now() - lastOtpSentAt < 30000) return Alert.alert('Patientez', 'Attendez 30 secondes avant de renvoyer un code.');

    setLoading(true);
    try {
      const { data } = await client.post('/auth/send-otp', { phone, role: ROLE, email: trimmedEmail });
      setLastOtpSentAt(Date.now());
      router.push({
        pathname: '/(auth)/otp',
        params: { phone, role: ROLE, channel: data.channel ?? 'email', email: trimmedEmail },
      });
    } catch (err: any) {
      Alert.alert('Erreur', safeError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kav}>
        <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Branding */}
          <View style={styles.brandRow}>
            <View style={styles.logoRing}>
              <View style={styles.logoCircle}>
                <Text style={styles.logoLetter}>W</Text>
              </View>
            </View>
            <View>
              <Text style={styles.appName}>Woyo</Text>
              <Text style={styles.appTagline}>Mobilité en Côte d'Ivoire</Text>
            </View>
          </View>

          <Text style={styles.heading}>👋 Bon retour !</Text>
          <Text style={styles.sub}>Entrez vos informations pour recevoir un code de connexion</Text>

          {/* Phone */}
          <Text style={styles.label}>Numéro de téléphone</Text>
          <View style={styles.phoneRow}>
            <View style={styles.dialCode}>
              <Text style={styles.dialCodeText}>🇨🇮 {COUNTRY_CODE}</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              value={localPhone}
              onChangeText={(t) => setLocalPhone(t.replace(/[^\d\s]/g, ''))}
              keyboardType="phone-pad"
              placeholder="07 00 00 00 00"
              placeholderTextColor={T.muted}
              autoFocus
              returnKeyType="next"
            />
          </View>

          {/* Email — always visible */}
          <View style={styles.labelRow}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.labelHint}>Le code sera envoyé par email</Text>
          </View>
          <TextInput
            style={[styles.input, styles.mb20]}
            value={email}
            onChangeText={setEmail}
            placeholder="votre@email.com"
            placeholderTextColor={T.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleSendOTP}
          />

          <Button label="Recevoir le code" onPress={handleSendOTP} loading={loading} />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>
          <TouchableOpacity style={styles.registerBtn} onPress={() => router.replace('/(auth)/register')} activeOpacity={0.8}>
            <Text style={styles.registerBtnText}>Pas encore de compte ? S'inscrire</Text>
          </TouchableOpacity>

          <Text style={styles.legal}>
            En continuant vous acceptez nos{' '}
            <Text style={styles.legalLink}>Conditions d'utilisation</Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: T.bg },
  kav:            { flex: 1 },
  inner:          { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },

  brandRow:       { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 32 },
  logoRing:       { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: T.tealBorder, alignItems: 'center', justifyContent: 'center' },
  logoCircle:     { width: 50, height: 50, borderRadius: 25, backgroundColor: T.teal, alignItems: 'center', justifyContent: 'center', shadowColor: T.teal, shadowOpacity: 0.45, shadowRadius: 14, elevation: 10 },
  logoLetter:     { color: '#FFFFFF', fontSize: 22, fontWeight: T.xbold },
  appName:        { color: T.text, fontSize: 19, fontWeight: T.xbold },
  appNameAccent:  { color: T.teal, fontWeight: T.xbold },
  appTagline:     { color: T.accent, fontSize: 12, fontWeight: T.semi, marginTop: 2 },

  heading:        { color: T.teal, fontSize: 24, fontWeight: T.xbold, marginBottom: 6 },
  sub:            { color: T.sub, fontSize: 14, marginBottom: 24, lineHeight: 20 },

  labelRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  label:          { color: T.sub, fontSize: 12, fontWeight: T.semi },
  labelHint:      { color: T.muted, fontSize: 11 },

  input:          { backgroundColor: T.card, borderRadius: T.r12, borderWidth: 1.5, borderColor: T.border, paddingHorizontal: 14, paddingVertical: 13, color: T.text, fontSize: 14 },
  mb20:           { marginBottom: 20 },

  phoneRow:       { flexDirection: 'row', alignItems: 'center', backgroundColor: T.card, borderRadius: T.r12, borderWidth: 1.5, borderColor: T.border, marginBottom: 16, overflow: 'hidden' },
  dialCode:       { width: '25%', paddingHorizontal: 12, paddingVertical: 13, borderRightWidth: 1.5, borderRightColor: T.border, backgroundColor: T.elevated, alignItems: 'center' },
  dialCodeText:   { color: T.text, fontSize: 13, fontWeight: T.semi },
  phoneInput:     { flex: 1, paddingHorizontal: 14, color: T.text, fontSize: 14, height: 48 },

  divider:        { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  dividerLine:    { flex: 1, height: 1, backgroundColor: T.border },
  dividerText:    { color: T.muted, fontSize: 13 },

  registerBtn:    { borderWidth: 1.5, borderColor: T.border, borderRadius: T.r12, paddingVertical: 14, alignItems: 'center', backgroundColor: T.elevated },
  registerBtnText:{ color: T.text, fontSize: 14, fontWeight: T.semi },

  legal:          { color: T.muted, fontSize: 11, textAlign: 'center', marginTop: 20, lineHeight: 17 },
  legalLink:      { color: T.teal },
});
