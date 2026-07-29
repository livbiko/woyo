import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import Button from '../../src/components/Button';
import client from '../../src/api/client';
import { useAuth } from '../../src/context/AuthContext';
import { safeError } from '../../src/utils/errorMessage';
import { T } from '../../src/theme';

const CODE_LENGTH = 6;

export default function OTPScreen() {
  const { phone, role, email, channel } = useLocalSearchParams<{
    phone: string;
    role: 'passenger' | 'driver';
    email?: string;
    channel?: string;
  }>();
  const router = useRouter();
  const { signIn, deviceToken } = useAuth();
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const refs = useRef<(TextInput | null)[]>([]);

  const code = digits.join('');
  const sentByEmail = channel === 'email';

  const setDigit = (idx: number, val: string) => {
    const char = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[idx] = char;
    setDigits(next);
    if (char && idx < CODE_LENGTH - 1) refs.current[idx + 1]?.focus();
  };

  const onKeyPress = (idx: number, key: string) => {
    if (key === 'Backspace' && !digits[idx] && idx > 0) {
      const next = [...digits];
      next[idx - 1] = '';
      setDigits(next);
      refs.current[idx - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    if (code.length !== CODE_LENGTH) return Alert.alert('Erreur', 'Entrez le code à 6 chiffres.');
    setLoading(true);
    try {
      // Always resolve device token — fallback to SecureStore if context not yet ready
      const dt = deviceToken ?? await SecureStore.getItemAsync('deviceToken') ?? undefined;
      const { data } = await client.post('/auth/verify-otp', { phone, code, role, email, deviceToken: dt });
      await signIn(data.token, data.role, data.user, data.refreshToken);
      if (data.isNew) {
        router.replace('/(auth)/emergency-setup');
      } else {
        router.replace('/(passenger)/');
      }
    } catch (err: any) {
      Alert.alert('Erreur', safeError(err));
      setDigits(Array(CODE_LENGTH).fill(''));
      refs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* Logo */}
        <View style={styles.logoCircle}>
          <Text style={styles.logoLetter}>W</Text>
        </View>

        <Text style={styles.heading}>Vérification</Text>
        {sentByEmail ? (
          <Text style={styles.sub}>
            Code envoyé par email à{'\n'}
            <Text style={styles.phoneHighlight}>{email}</Text>
            {'\n'}<Text style={styles.emailHint}>Vérifiez aussi vos spams.</Text>
          </Text>
        ) : (
          <Text style={styles.sub}>
            Code envoyé au{'\n'}
            <Text style={styles.phoneHighlight}>{phone}</Text>
          </Text>
        )}

        {/* OTP digit boxes */}
        <View style={styles.codeRow}>
          {digits.map((d, i) => (
            <View key={i} style={[styles.digitBox, d && styles.digitBoxFilled]}>
              <TextInput
                ref={(r) => { refs.current[i] = r; }}
                style={styles.digitInput}
                value={d}
                onChangeText={(v) => setDigit(i, v)}
                onKeyPress={({ nativeEvent }) => onKeyPress(i, nativeEvent.key)}
                keyboardType="number-pad"
                maxLength={1}
                autoFocus={i === 0}
                caretHidden
                selectTextOnFocus
              />
            </View>
          ))}
        </View>

        <Button
          label="Vérifier le code"
          onPress={handleVerify}
          loading={loading}
          disabled={code.length !== CODE_LENGTH}
          style={styles.btn}
        />

        <TouchableOpacity onPress={() => router.back()} style={styles.backWrap}>
          <Ionicons name="arrow-back" size={15} color={T.muted} />
          <Text style={styles.backText}>Modifier le numéro ou renvoyer un code</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const BOX = 38;

const styles = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: T.bg },
  container:        { flex: 1, paddingHorizontal: 28, justifyContent: 'center', alignItems: 'center' },

  logoCircle:       { width: 68, height: 68, borderRadius: 34, backgroundColor: T.teal, alignItems: 'center', justifyContent: 'center', marginBottom: 28, shadowColor: T.teal, shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 5 }, elevation: 10 },
  logoLetter:       { color: T.bg, fontSize: 28, fontWeight: T.xbold },

  heading:          { color: T.text, fontSize: 26, fontWeight: T.xbold, marginBottom: 8 },
  sub:              { color: T.sub, fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 36 },
  phoneHighlight:   { color: T.text, fontWeight: T.bold },
  emailHint:        { color: T.muted, fontSize: 12, fontStyle: 'italic' },

  codeRow:          { flexDirection: 'row', gap: 8, marginBottom: 36 },
  digitBox:         { width: BOX, height: BOX + 6, borderRadius: T.r8, borderWidth: 2, borderColor: T.border, backgroundColor: T.card, alignItems: 'center', justifyContent: 'center' },
  digitBoxFilled:   { borderColor: T.teal, backgroundColor: T.tealDim },
  digitInput:       { width: BOX, height: BOX + 6, color: T.text, fontSize: 18, fontWeight: T.xbold, textAlign: 'center' },

  btn:              { width: '100%' },

  backWrap:         { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 24 },
  backText:         { color: T.muted, fontSize: 13 },
});
