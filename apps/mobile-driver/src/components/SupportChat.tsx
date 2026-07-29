import { useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import client from '../api/client';
import { T } from '../theme';

interface Message { id: string; role: 'user' | 'assistant'; content: string; }

export default function SupportChat() {
  const insets = useSafeAreaInsets();
  const [open, setOpen]           = useState(false);
  const [mode, setMode]           = useState<'chat' | 'ticket'>('chat');
  const [messages, setMessages]   = useState<Message[]>([
    { id: '0', role: 'assistant', content: 'Bonjour ! Je suis l\'assistant Woyo 👋\nComment puis-je vous aider ?' },
  ]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [subject, setSubject]     = useState('');
  const [ticketMsg, setTicketMsg] = useState('');
  const [sending, setSending]     = useState(false);
  const listRef = useRef<FlatList>(null);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const { data } = await client.post('/support/chat', {
        messages: next.map(m => ({ role: m.role, content: m.content })),
      });
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: data.reply }]);
    } catch (err: any) {
      const aiUnavailable = err.response?.data?.aiUnavailable;
      const reply = aiUnavailable
        ? 'L\'assistant est temporairement indisponible.\nVous pouvez soumettre un ticket et notre équipe vous répondra dans les 24h. 👇'
        : 'Une erreur est survenue. Réessayez ou soumettez un ticket.';
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: reply }]);
      if (aiUnavailable) setTimeout(() => setMode('ticket'), 1200);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  async function submitTicket() {
    if (!subject.trim() || !ticketMsg.trim()) {
      Alert.alert('Champs requis', 'Veuillez renseigner le sujet et votre message.');
      return;
    }
    setSending(true);
    try {
      const { data } = await client.post('/support/ticket', { subject: subject.trim(), message: ticketMsg.trim() });
      Alert.alert(
        'Ticket envoyé ✅',
        `Ticket #${data.ticketId} créé.\nNotre équipe vous contactera dans les 24h.`,
        [{ text: 'OK', onPress: () => setOpen(false) }]
      );
      setSubject(''); setTicketMsg(''); setMode('chat');
    } catch (err: any) {
      Alert.alert('Erreur', err.response?.data?.message ?? 'Impossible d\'envoyer le ticket.');
    } finally { setSending(false); }
  }

  return (
    <>
      <TouchableOpacity style={s.fab} onPress={() => setOpen(true)} activeOpacity={0.85}>
        <Ionicons name="chatbubble-ellipses" size={22} color="#fff" />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={[s.safe, { paddingTop: insets.top }]}>

          {/* Header */}
          <View style={s.header}>
            <View style={s.headerLeft}>
              <View style={s.avatar}>
                <Ionicons name={mode === 'ticket' ? 'mail' : 'sparkles'} size={16} color="#fff" />
              </View>
              <View>
                <Text style={s.headerTitle}>{mode === 'ticket' ? 'Ticket support' : 'Assistant Woyo'}</Text>
                <Text style={s.headerSub}>{mode === 'ticket' ? 'Réponse sous 24h' : 'Support 24/7'}</Text>
              </View>
            </View>
            <View style={s.headerActions}>
              <TouchableOpacity
                style={s.modeBtn}
                onPress={() => setMode(mode === 'chat' ? 'ticket' : 'chat')}
              >
                <Ionicons name={mode === 'ticket' ? 'chatbubble-outline' : 'mail-outline'} size={18} color={T.teal} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setOpen(false)} style={s.closeBtn}>
                <Ionicons name="close" size={24} color={T.sub} />
              </TouchableOpacity>
            </View>
          </View>

          {mode === 'chat' ? (
            <KeyboardAvoidingView style={s.flex} behavior="padding" keyboardVerticalOffset={insets.top}>
              <FlatList
                ref={listRef}
                style={s.flex}
                data={messages}
                keyExtractor={m => m.id}
                contentContainerStyle={s.list}
                onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
                renderItem={({ item: m }) => (
                  <View style={[s.bubble, m.role === 'user' ? s.bubbleUser : s.bubbleAssistant]}>
                    <Text style={[s.bubbleText, m.role === 'user' ? s.bubbleTextUser : s.bubbleTextAssistant]}>
                      {m.content}
                    </Text>
                  </View>
                )}
              />
              {loading && (
                <View style={s.typingRow}>
                  <View style={s.typingDot} /><View style={[s.typingDot, { opacity: 0.6 }]} /><View style={[s.typingDot, { opacity: 0.3 }]} />
                </View>
              )}
              <View style={[s.inputRow, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                <TextInput
                  style={s.input} placeholder="Posez votre question…" placeholderTextColor={T.muted}
                  value={input} onChangeText={setInput} onSubmitEditing={send}
                  returnKeyType="send" editable={!loading} multiline
                />
                <TouchableOpacity
                  style={[s.sendBtn, (!input.trim() || loading) && s.sendBtnDisabled]}
                  onPress={send} disabled={!input.trim() || loading}
                >
                  {loading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          ) : (
            <KeyboardAvoidingView style={s.flex} behavior="padding" keyboardVerticalOffset={insets.top}>
              <View style={s.ticketForm}>
                <Text style={s.ticketLabel}>Sujet</Text>
                <TextInput
                  style={s.ticketInput} placeholder="Ex: Problème de paiement, course annulée…"
                  placeholderTextColor={T.muted} value={subject} onChangeText={setSubject}
                  maxLength={120}
                />
                <Text style={s.ticketLabel}>Décrivez votre problème</Text>
                <TextInput
                  style={[s.ticketInput, s.ticketTextarea]}
                  placeholder="Décrivez votre problème en détail…"
                  placeholderTextColor={T.muted} value={ticketMsg} onChangeText={setTicketMsg}
                  multiline numberOfLines={6} maxLength={2000} textAlignVertical="top"
                />
                <TouchableOpacity
                  style={[s.submitBtn, sending && { opacity: 0.6 }]}
                  onPress={submitTicket} disabled={sending}
                >
                  {sending
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <><Ionicons name="send" size={16} color="#fff" /><Text style={s.submitBtnText}>Envoyer le ticket</Text></>
                  }
                </TouchableOpacity>
                <Text style={s.ticketNote}>Notre équipe vous contactera dans les 24h par téléphone ou email.</Text>
              </View>
            </KeyboardAvoidingView>
          )}
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  fab: {
    position: 'absolute', bottom: 88, right: 20,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: T.teal, alignItems: 'center', justifyContent: 'center',
    shadowColor: T.teal, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 8, zIndex: 100,
  },
  safe:   { flex: 1, backgroundColor: T.bg },
  flex:   { flex: 1 },

  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.border },
  headerLeft:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar:        { width: 38, height: 38, borderRadius: 19, backgroundColor: T.teal, alignItems: 'center', justifyContent: 'center' },
  headerTitle:   { color: T.text, fontSize: 15, fontWeight: T.bold },
  headerSub:     { color: T.muted, fontSize: 12, marginTop: 1 },
  modeBtn:       { padding: 8, borderRadius: 20, backgroundColor: T.tealDim, borderWidth: 1, borderColor: T.tealBorder },
  closeBtn:      { padding: 6, borderRadius: 20, backgroundColor: T.surface },

  list:            { padding: 16, gap: 10, paddingBottom: 8 },
  bubble:          { maxWidth: '82%', borderRadius: T.r16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser:      { alignSelf: 'flex-end', backgroundColor: T.teal },
  bubbleAssistant: { alignSelf: 'flex-start', backgroundColor: T.surface, borderWidth: 1, borderColor: T.border },
  bubbleText:          { fontSize: 14, lineHeight: 21 },
  bubbleTextUser:      { color: '#fff' },
  bubbleTextAssistant: { color: T.text },

  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 20, paddingBottom: 10 },
  typingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: T.muted },

  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 12, borderTopWidth: 1, borderTopColor: T.border, backgroundColor: T.bg },
  input:    { flex: 1, backgroundColor: T.surface, borderRadius: T.r20, paddingHorizontal: 16, paddingVertical: 10, color: T.text, fontSize: 15, maxHeight: 120, borderWidth: 1, borderColor: T.border, lineHeight: 20 },
  sendBtn:         { width: 42, height: 42, borderRadius: 21, backgroundColor: T.teal, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },

  ticketForm:     { flex: 1, padding: 20, gap: 10 },
  ticketLabel:    { color: T.sub, fontSize: 12, fontWeight: T.semi, textTransform: 'uppercase', letterSpacing: 0.6 },
  ticketInput:    { backgroundColor: T.surface, borderRadius: T.r12, paddingHorizontal: 14, paddingVertical: 12, color: T.text, fontSize: 15, borderWidth: 1, borderColor: T.border },
  ticketTextarea: { height: 140, paddingTop: 12 },
  submitBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: T.teal, borderRadius: T.rFull, paddingVertical: 14, marginTop: 4 },
  submitBtnText:  { color: '#fff', fontWeight: T.xbold, fontSize: 15 },
  ticketNote:     { color: T.muted, fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
