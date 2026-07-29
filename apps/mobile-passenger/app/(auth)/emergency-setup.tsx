import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import client from '../../src/api/client';
import { T } from '../../src/theme';

const MAX = 3;
const COLORS = [T.teal, T.success, '#7C3AED'];

interface Contact { name: string; phone: string; relationship: string; }

export default function EmergencySetupScreen() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [name, setName]     = useState('');
  const [phone, setPhone]   = useState('');
  const [rel, setRel]       = useState('');
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async () => {
    if (!name.trim() || !phone.trim()) return Alert.alert('Erreur', 'Nom et téléphone requis.');
    if (contacts.length >= MAX) return;
    setSaving(true);
    try {
      await client.post('/emergency/contacts', {
        name: name.trim(), phone: phone.trim(), relationship: rel.trim(),
      });
      setContacts(prev => [...prev, { name: name.trim(), phone: phone.trim(), relationship: rel.trim() }]);
      setName(''); setPhone(''); setRel('');
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleContinue = async () => {
    if (contacts.length === 0) {
      Alert.alert(
        'Contact requis',
        'Ajoutez au moins un contact d\'urgence pour continuer. Ces contacts seront alertés par SMS si vous activez le SOS.',
        [{ text: 'OK' }]
      );
      return;
    }
    setSubmitting(true);
    router.replace('/(passenger)/');
  };

  const canAdd = contacts.length < MAX && name.trim().length > 0 && phone.trim().length > 0;

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={s.headerIcon}>
            <Ionicons name="shield-checkmark" size={32} color="#fff" />
          </View>
          <Text style={s.heading}>Contacts d'urgence</Text>
          <Text style={s.sub}>
            En cas d'urgence, Woyo alertera automatiquement ces contacts par SMS avec votre position.
            Ajoutez au moins <Text style={s.subBold}>1 contact</Text> pour continuer.
          </Text>

          {/* Added contacts */}
          {contacts.length > 0 && (
            <View style={s.addedList}>
              {contacts.map((c, i) => (
                <View key={i} style={s.addedRow}>
                  <View style={[s.addedAvatar, { backgroundColor: COLORS[i] + '22' }]}>
                    <Text style={[s.addedInitial, { color: COLORS[i] }]}>{c.name[0].toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.addedName}>{c.name}</Text>
                    <Text style={s.addedPhone}>{c.phone}{c.relationship ? ` · ${c.relationship}` : ''}</Text>
                  </View>
                  <View style={s.addedBadge}>
                    <Ionicons name="checkmark-circle" size={20} color={T.success} />
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Add form — hide when max reached */}
          {contacts.length < MAX && (
            <View style={s.form}>
              <Text style={s.formLabel}>
                {contacts.length === 0 ? 'Contact 1 (obligatoire)' : `Contact ${contacts.length + 1} (optionnel)`}
              </Text>
              <Input value={name} onChangeText={setName} placeholder="Prénom et nom (ex : Maman)" autoCapitalize="words" />
              <Input value={phone} onChangeText={setPhone} placeholder="Téléphone (+22507…)" keyboardType="phone-pad" />
              <Input value={rel} onChangeText={setRel} placeholder="Relation (ex : Mère, Ami, Frère…)" />
              <Button
                label="Ajouter ce contact"
                onPress={handleAdd}
                loading={saving}
                disabled={!canAdd}
              />
            </View>
          )}

          {contacts.length >= MAX && (
            <View style={s.maxReached}>
              <Ionicons name="checkmark-circle" size={18} color={T.success} />
              <Text style={s.maxReachedText}>Maximum de {MAX} contacts atteint</Text>
            </View>
          )}

          {/* Counter */}
          <View style={s.counterRow}>
            {Array.from({ length: MAX }).map((_, i) => (
              <View key={i} style={[s.counterDot, i < contacts.length && s.counterDotFilled]} />
            ))}
            <Text style={s.counterText}>{contacts.length}/{MAX}</Text>
          </View>

          {/* Continue */}
          <View style={s.continueWrap}>
            <Button
              label={contacts.length === 0 ? 'Ajouter un contact pour continuer' : 'Continuer vers Woyo'}
              onPress={handleContinue}
              loading={submitting}
              disabled={contacts.length === 0}
            />
            <Text style={s.note}>
              Vous pourrez modifier vos contacts d'urgence à tout moment depuis votre profil.
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: T.bg },
  flex:  { flex: 1 },
  inner: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 48 },

  headerIcon: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: T.teal,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center',
    marginBottom: 20, shadowColor: T.teal, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  heading: { color: T.text, fontSize: 24, fontWeight: T.xbold, textAlign: 'center', marginBottom: 10 },
  sub:     { color: T.sub, fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 28 },
  subBold: { color: T.text, fontWeight: T.bold },

  addedList: { marginBottom: 16, gap: 8 },
  addedRow:  { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface, borderRadius: T.r12, padding: 12, borderWidth: 1, borderColor: T.border, gap: 12 },
  addedAvatar:  { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  addedInitial: { fontSize: 16, fontWeight: T.xbold },
  addedName:    { color: T.text, fontSize: 14, fontWeight: T.semi },
  addedPhone:   { color: T.muted, fontSize: 12, marginTop: 2 },
  addedBadge:   { paddingLeft: 4 },

  form:      { backgroundColor: T.surface, borderRadius: T.r16, padding: 16, borderWidth: 1, borderColor: T.border, marginBottom: 16 },
  formLabel: { color: T.sub, fontSize: 12, fontWeight: T.semi, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.6 },

  maxReached:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 16 },
  maxReachedText: { color: T.success, fontSize: 13, fontWeight: T.semi },

  counterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 28 },
  counterDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: T.border },
  counterDotFilled: { backgroundColor: T.teal },
  counterText: { color: T.muted, fontSize: 13, marginLeft: 4 },

  continueWrap: { gap: 12 },
  note: { color: T.muted, fontSize: 12, textAlign: 'center', lineHeight: 17 },
});
