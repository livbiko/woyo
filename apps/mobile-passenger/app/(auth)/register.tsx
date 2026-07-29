import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Button from '../../src/components/Button';
import client from '../../src/api/client';
import { safeError } from '../../src/utils/errorMessage';
import { T } from '../../src/theme';

const COUNTRY_CODE = '+225';
const toE164 = (local: string) => { const d = local.replace(/\D/g, ''); return d ? COUNTRY_CODE + d : ''; };
const isValidCIPhone = (local: string) => { const d = local.replace(/\D/g, ''); return d.length >= 8 && d.length <= 10; };
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName]         = useState('');
  const [surname, setSurname]   = useState('');
  const [localPhone, setLocalPhone] = useState('');
  const [email, setEmail]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleRegister = async () => {
    if (!name.trim())    return Alert.alert('Erreur', 'Veuillez entrer votre prénom.');
    if (!surname.trim()) return Alert.alert('Erreur', 'Veuillez entrer votre nom.');
    if (!isValidCIPhone(localPhone)) return Alert.alert('Erreur', 'Veuillez entrer un numéro valide.');
    if (!isValidEmail(email.trim())) return Alert.alert('Erreur', 'Veuillez entrer une adresse email valide.');

    const phone = toE164(localPhone);
    const trimmedEmail = email.trim().toLowerCase();
    setLoading(true);
    try {
      const { data } = await client.post('/auth/send-otp', {
        phone, email: trimmedEmail, name: name.trim(), surname: surname.trim(), role: 'passenger',
      });
      router.push({ pathname: '/(auth)/otp', params: { phone, role: 'passenger', email: trimmedEmail, channel: data.channel ?? 'sms' } });
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
                <Text style={styles.logoLetter}>T</Text>
              </View>
            </View>
            <View>
              <Text style={styles.appName}>Woyo</Text>
              <Text style={styles.appTagline}>Mobilité en Côte d'Ivoire</Text>
            </View>
          </View>

          {/* Header */}
          <Text style={styles.heading}>✨ Créer un compte</Text>
          <Text style={styles.sub}>Remplissez vos informations pour commencer</Text>

          {/* Name row — side by side */}
          <View style={styles.nameRow}>
            <View style={styles.nameField}>
              <Text style={styles.label}>Prénom</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Prénom"
                placeholderTextColor={T.muted}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>
            <View style={styles.nameField}>
              <Text style={styles.label}>Nom</Text>
              <TextInput
                style={styles.input}
                value={surname}
                onChangeText={setSurname}
                placeholder="Nom"
                placeholderTextColor={T.muted}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Phone */}
          <Text style={styles.label}>Téléphone</Text>
          <View style={styles.phoneRow}>
            <View style={styles.dialCode}>
              <Text style={styles.dialCodeText}>🇨🇮 +225</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              value={localPhone}
              onChangeText={(t) => setLocalPhone(t.replace(/[^\d\s]/g, ''))}
              keyboardType="phone-pad"
              placeholder="07 00 00 00 00"
              placeholderTextColor={T.muted}
              returnKeyType="next"
            />
          </View>

          {/* Email */}
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, styles.mb24]}
            value={email}
            onChangeText={setEmail}
            placeholder="votre@email.com"
            placeholderTextColor={T.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleRegister}
          />

          <Button label="Recevoir le code de vérification" onPress={handleRegister} loading={loading} />

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Sign in option */}
          <TouchableOpacity style={styles.signInBtn} onPress={() => router.replace('/(auth)/phone')} activeOpacity={0.8}>
            <Text style={styles.signInBtnText}>Déjà un compte ? Se connecter</Text>
          </TouchableOpacity>

          <Text style={styles.legal}>
            En créant un compte vous acceptez nos{' '}
            <Text style={styles.legalLink} onPress={() => router.push('/(auth)/aup')}>
              Conditions d'utilisation
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: T.bg },
  kav:          { flex: 1 },
  inner:        { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },

  brandRow:       { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 32 },
  logoRing:       { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: T.tealBorder, alignItems: 'center', justifyContent: 'center' },
  logoCircle:     { width: 50, height: 50, borderRadius: 25, backgroundColor: T.teal, alignItems: 'center', justifyContent: 'center', shadowColor: T.teal, shadowOpacity: 0.45, shadowRadius: 14, elevation: 10 },
  logoLetter:     { color: '#FFFFFF', fontSize: 22, fontWeight: T.xbold },
  appName:        { color: T.text, fontSize: 19, fontWeight: T.xbold },
  appNameAccent:  { color: T.teal, fontWeight: T.xbold },
  appTagline:     { color: T.accent, fontSize: 12, fontWeight: T.semi, marginTop: 2 },

  heading:        { color: T.teal, fontSize: 24, fontWeight: T.xbold, marginBottom: 6 },
  sub:            { color: T.sub, fontSize: 14, marginBottom: 24, lineHeight: 20 },

  nameRow:      { flexDirection: 'row', gap: 12, marginBottom: 0 },
  nameField:    { flex: 1 },

  label:        { color: T.sub, fontSize: 12, fontWeight: T.semi, marginBottom: 6 },
  input:        { backgroundColor: T.card, borderRadius: T.r12, borderWidth: 1.5, borderColor: T.border, paddingHorizontal: 14, paddingVertical: 13, color: T.text, fontSize: 14, marginBottom: 16 },
  mb24:         { marginBottom: 24 },

  phoneRow:     { flexDirection: 'row', alignItems: 'center', backgroundColor: T.card, borderRadius: T.r12, borderWidth: 1.5, borderColor: T.border, marginBottom: 16, overflow: 'hidden' },
  dialCode:     { width: '25%', paddingHorizontal: 12, paddingVertical: 13, borderRightWidth: 1.5, borderRightColor: T.border, backgroundColor: T.elevated, alignItems: 'center' },
  dialCodeText: { color: T.text, fontSize: 13, fontWeight: T.semi },
  phoneInput:   { flex: 1, paddingHorizontal: 14, color: T.text, fontSize: 14, height: 48 },

  divider:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  dividerLine:  { flex: 1, height: 1, backgroundColor: T.border },
  dividerText:  { color: T.muted, fontSize: 13 },

  signInBtn:    { borderWidth: 1.5, borderColor: T.border, borderRadius: T.r12, paddingVertical: 14, alignItems: 'center', backgroundColor: T.elevated },
  signInBtnText:{ color: T.text, fontSize: 14, fontWeight: T.semi },

  legal:        { color: T.muted, fontSize: 11, textAlign: 'center', marginTop: 20, lineHeight: 17 },
  legalLink:    { color: T.teal },
});
