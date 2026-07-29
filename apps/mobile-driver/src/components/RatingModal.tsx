import { useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Button from './Button';
import { T } from '../theme';

interface Props {
  visible: boolean;
  title: string;
  subtitle?: string;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  onSkip: () => void;
}

const RATING_LABELS = ['', 'Très mauvais', 'Mauvais', 'Correct', 'Bien', 'Excellent !'];

export default function RatingModal({ visible, title, subtitle, onSubmit, onSkip }: Props) {
  const [rating, setRating]   = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!rating) return;
    setLoading(true);
    try { await onSubmit(rating, comment); }
    finally { setLoading(false); setRating(0); setComment(''); }
  };

  const handleSkip = () => { setRating(0); setComment(''); onSkip(); };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)} style={styles.starBtn}>
                <Text style={[styles.star, star <= rating && styles.starActive]}>★</Text>
              </TouchableOpacity>
            ))}
          </View>

          {rating > 0 && (
            <View style={styles.ratingPill}>
              <Text style={styles.ratingPillText}>{RATING_LABELS[rating]}</Text>
            </View>
          )}

          <TextInput
            style={styles.input}
            placeholder="Ajouter un commentaire (optionnel)"
            placeholderTextColor={T.muted}
            value={comment}
            onChangeText={(t) => setComment(t.slice(0, 500))}
            multiline
            numberOfLines={2}
            maxLength={500}
          />

          <Button label="Envoyer l'évaluation" onPress={handleSubmit} loading={loading} disabled={!rating} style={{ marginBottom: 8 }} />
          <TouchableOpacity onPress={handleSkip} style={styles.skip}>
            <Text style={styles.skipText}>Passer pour l'instant</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  card:           { backgroundColor: T.elevated, borderTopLeftRadius: T.r24, borderTopRightRadius: T.r24, padding: 28, paddingBottom: 40, borderTopWidth: 1, borderColor: T.border },
  title:          { color: T.text, fontSize: 20, fontWeight: T.bold, textAlign: 'center', marginBottom: 4 },
  subtitle:       { color: T.sub, fontSize: 14, textAlign: 'center', marginBottom: 18 },
  stars:          { flexDirection: 'row', justifyContent: 'center', gap: 6, marginVertical: 16 },
  starBtn:        { padding: 4 },
  star:           { fontSize: 44, color: T.border },
  starActive:     { color: '#FBBF24' },
  ratingPill:     { backgroundColor: 'rgba(251,191,36,0.1)', borderRadius: T.rFull, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 6, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)' },
  ratingPillText: { color: '#FBBF24', fontWeight: T.semi, fontSize: 13 },
  input:          { backgroundColor: T.card, borderRadius: T.r12, padding: 14, color: T.text, fontSize: 14, marginBottom: 16, minHeight: 64, textAlignVertical: 'top', borderWidth: 1, borderColor: T.border },
  skip:           { alignItems: 'center', paddingVertical: 10 },
  skipText:       { color: T.muted, fontSize: 14 },
});
