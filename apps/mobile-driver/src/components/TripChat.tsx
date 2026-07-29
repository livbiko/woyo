import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, SafeAreaView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSocket } from '../hooks/useSocket';
import client from '../api/client';
import { T } from '../theme';

interface Msg {
  _id: string;
  senderRole: 'passenger' | 'driver';
  text: string;
  createdAt: string;
  seen: boolean;
}

interface Props {
  tripId: string;
  myRole: 'passenger' | 'driver';
  onClose: () => void;
}

export default function TripChat({ tripId, myRole, onClose }: Props) {
  const { socket } = useSocket();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [sendFailed, setSendFailed] = useState(false);
  const listRef = useRef<FlatList>(null);
  const ackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    client.get(`/chat/${tripId}/messages`)
      .then(r => setMessages(r.data.messages ?? []))
      .catch(() => {});
    socket?.emit('mark_seen', { tripId });
  }, [tripId]);

  useEffect(() => {
    if (!socket) return;
    const handler = (msg: Msg) => {
      if (msg.trip !== undefined && (msg as any).trip !== tripId) return;
      setMessages(prev => [...prev, msg]);
      socket.emit('mark_seen', { tripId });
      listRef.current?.scrollToEnd({ animated: true });
      // Clear pending state when our message comes back
      if (ackTimer.current) clearTimeout(ackTimer.current);
      setPendingText(null); setSendFailed(false);
    };
    socket.on('receive_message', handler);
    return () => { socket.off('receive_message', handler); };
  }, [socket, tripId]);

  const send = (retryText?: string) => {
    const trimmed = (retryText ?? text).trim();
    if (!trimmed || !socket) return;
    setSendFailed(false);
    setPendingText(trimmed);
    if (!retryText) setText('');
    socket.emit('send_message', { tripId, text: trimmed });
    if (ackTimer.current) clearTimeout(ackTimer.current);
    ackTimer.current = setTimeout(() => { setPendingText(null); setSendFailed(true); }, 8000);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chat de course</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m._id}
        contentContainerStyle={styles.list}
        onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => {
          const isMine = item.senderRole === myRole;
          return (
            <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
              <Text style={[styles.bubbleText, isMine ? styles.bubbleTextMine : styles.bubbleTextOther]}>
                {item.text}
              </Text>
              <Text style={[styles.bubbleTime, !isMine && styles.bubbleTimeOther]}>
                {new Date(item.createdAt).toLocaleTimeString('fr-CI', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Aucun message — dites bonjour 👋</Text>
          </View>
        }
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {sendFailed && (
          <View style={styles.retryBar}>
            <Text style={styles.retryText}>Échec d'envoi</Text>
            <TouchableOpacity onPress={() => send(pendingText ?? undefined)} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        )}
        {pendingText && !sendFailed && (
          <View style={styles.retryBar}>
            <ActivityIndicator size="small" color={T.muted} />
            <Text style={[styles.retryText, { marginLeft: 8 }]}>Envoi en cours…</Text>
          </View>
        )}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Votre message…"
            placeholderTextColor={T.muted}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => send()}
          />
          <TouchableOpacity style={[styles.sendBtn, (!text.trim() || !!pendingText) && styles.sendBtnDisabled]} onPress={() => send()} disabled={!text.trim() || !!pendingText}>
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: T.bg },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: T.border },
  headerTitle:      { color: T.text, fontSize: 17, fontWeight: T.bold },
  closeBtn:         { padding: 4 },
  closeText:        { color: T.muted, fontSize: 18 },

  list:             { padding: 16, gap: 8 },

  bubble:           { maxWidth: '80%', borderRadius: T.r16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine:       { alignSelf: 'flex-end', backgroundColor: T.teal },
  bubbleOther:      { alignSelf: 'flex-start', backgroundColor: T.surface, borderWidth: 1, borderColor: T.border },
  bubbleText:       { fontSize: 15, lineHeight: 20 },
  bubbleTextMine:   { color: '#fff' },
  bubbleTextOther:  { color: T.text },
  bubbleTime:       { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 4, alignSelf: 'flex-end' },
  bubbleTimeOther:  { color: T.muted },

  empty:            { flex: 1, alignItems: 'center', paddingTop: 60 },
  emptyText:        { color: T.muted, fontSize: 14 },

  retryBar:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: T.card, borderTopWidth: 1, borderTopColor: T.border },
  retryText:        { color: T.muted, fontSize: 13, flex: 1 },
  retryBtn:         { backgroundColor: T.teal, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 5 },
  retryBtnText:     { color: '#fff', fontSize: 13, fontWeight: '600' },
  inputRow:         { flexDirection: 'row', alignItems: 'flex-end', padding: 12, gap: 10, borderTopWidth: 1, borderTopColor: T.border, backgroundColor: T.surface },
  input:            { flex: 1, backgroundColor: T.card, borderRadius: T.r16, paddingHorizontal: 16, paddingVertical: 10, color: T.text, fontSize: 15, maxHeight: 120, borderWidth: 1, borderColor: T.border },
  sendBtn:          { width: 44, height: 44, borderRadius: 22, backgroundColor: T.teal, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled:  { opacity: 0.4 },
  sendIcon:         { color: '#fff', fontSize: 16 },
});
