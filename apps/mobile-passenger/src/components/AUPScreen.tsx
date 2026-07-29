import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { T } from '../theme';

interface Section { title: string; body: string; highlight?: boolean; }

const PASSENGER_SECTIONS: Section[] = [
  {
    title: '1. Objet',
    body: 'Les présentes Conditions Générales d\'Utilisation (CGU) régissent l\'accès et l\'utilisation de l\'application Tekeche par tout passager. En utilisant l\'application, vous acceptez sans réserve les présentes conditions.',
  },
  {
    title: '2. Description du service',
    body: 'Tekeche est une plateforme de mise en relation entre passagers et chauffeurs professionnels à Abidjan, Côte d\'Ivoire. Tekeche agit en qualité d\'intermédiaire et n\'est pas une entreprise de transport.',
  },
  {
    title: '3. Obligations du passager',
    body: 'Le passager s\'engage à :\n• Fournir des informations exactes lors de l\'inscription\n• Respecter les chauffeurs et leur véhicule\n• Ne pas demander de courses à des fins illicites\n• Régler les courses selon les modalités prévues\n• Ne pas enregistrer, photographier ou filmer le chauffeur sans son consentement\n• Signaler tout comportement inapproprié via l\'application',
  },
  {
    title: '4. Comportements interdits',
    body: 'Sont strictement interdits :\n• Toute forme de harcèlement, menace ou violence verbale ou physique envers les chauffeurs\n• L\'utilisation de l\'application à des fins frauduleuses\n• La création de faux comptes ou l\'usurpation d\'identité\n• Toute tentative de contournement du système de paiement\n• L\'utilisation de l\'application pour des activités illégales',
  },
  {
    title: '5. Coopération avec les autorités',
    body: 'TEKECHE SE RÉSERVE EXPRESSÉMENT LE DROIT DE COOPÉRER PLEINEMENT AVEC LES AUTORITÉS JUDICIAIRES ET POLICIÈRES.\n\nEn cas de signalement, plainte ou enquête concernant des faits délictueux ou criminels impliquant un utilisateur (passager ou chauffeur), Tekeche s\'engage à :\n\n• Communiquer aux autorités compétentes toutes les informations en sa possession : historique de courses, données de localisation GPS, informations d\'identification, échanges via le chat et tout autre élément pertinent\n• Suspendre immédiatement le compte concerné dès réception d\'une réquisition judiciaire ou d\'un signalement crédible\n• Conserver les données pertinentes conformément aux obligations légales en vigueur\n• Collaborer activement avec la Police Nationale, la Gendarmerie, le Parquet ou toute autre autorité compétente\n\nL\'utilisation de Tekeche implique l\'acceptation explicite de cette coopération. Aucune expectative de confidentialité ne peut être invoquée en cas d\'activité criminelle.',
    highlight: true,
  },
  {
    title: '6. Sécurité et signalement',
    body: 'Tekeche met à disposition :\n• Un bouton SOS permettant d\'alerter les contacts d\'urgence et l\'équipe Tekeche\n• Un système de partage de course en temps réel\n• Un historique complet de chaque course\n\nTout incident grave doit être signalé à la Police (110) ou à la Gendarmerie. Tekeche ne se substitue pas aux services d\'urgence.',
  },
  {
    title: '7. Suspension et résiliation',
    body: 'Tekeche se réserve le droit de suspendre ou supprimer tout compte en cas de :\n• Violation des présentes CGU\n• Signalement d\'un comportement dangereux ou frauduleux\n• Réquisition judiciaire\n• Avis négatifs répétés de la part des chauffeurs',
  },
  {
    title: '8. Données personnelles',
    body: 'Vos données personnelles (nom, numéro de téléphone, email, historique de courses, positions GPS) sont collectées et traitées conformément à notre Politique de confidentialité disponible sur tekeche.com/privacy.\n\nCes données peuvent être communiquées aux autorités sur réquisition judiciaire.',
  },
  {
    title: '9. Acceptation',
    body: 'En utilisant l\'application Tekeche, vous reconnaissez avoir lu, compris et accepté sans réserve les présentes conditions, y compris la clause de coopération avec les autorités (article 5).\n\nDernier mise à jour : juin 2026\nContact : support@tekeche.com',
  },
];

interface Props {
  onAccept?: () => void;
  onBack?: () => void;
  showAcceptButton?: boolean;
}

const CONFIG = { sections: PASSENGER_SECTIONS, title: 'Conditions d\'utilisation', emoji: '📋', sub: 'Passagers' };

export default function AUPScreen({ onAccept, onBack, showAcceptButton = false }: Props) {
  const cfg      = CONFIG;
  const sections = cfg.sections;
  const title    = cfg.title;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        {onBack && (
          <TouchableOpacity style={s.backBtn} onPress={onBack}>
            <Ionicons name="arrow-back" size={22} color={T.text} />
          </TouchableOpacity>
        )}
        <Text style={s.headerTitle}>{title}</Text>
        <View style={{ width: onBack ? 36 : 0 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <View style={s.heroBox}>
          <Text style={s.heroEmoji}>{cfg.emoji}</Text>
          <Text style={s.heroTitle}>Politique d'utilisation acceptable</Text>
          <Text style={s.heroSub}>Tekeche — {cfg.sub}</Text>
        </View>

        {sections.map(sec => (
          <View key={sec.title} style={[s.section, sec.highlight && s.sectionHighlight]}>
            <Text style={[s.sectionTitle, sec.highlight && s.sectionTitleHighlight]}>{sec.title}</Text>
            <Text style={[s.sectionBody, sec.highlight && s.sectionBodyHighlight]}>{sec.body}</Text>
          </View>
        ))}

        <View style={s.footer}>
          <Text style={s.footerText}>Tekeche — Abidjan, Côte d\'Ivoire</Text>
          <Text style={s.footerText}>support@tekeche.com · tekeche.com</Text>
        </View>

        {showAcceptButton && onAccept && (
          <TouchableOpacity style={s.acceptBtn} onPress={onAccept}>
            <Text style={s.acceptBtnText}>J\'ai lu et j\'accepte les conditions</Text>
          </TouchableOpacity>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: T.bg },
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.border },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: T.text, fontSize: 16, fontWeight: T.bold, flex: 1, textAlign: 'center' },

  scroll: { paddingHorizontal: 20, paddingTop: 20 },

  heroBox:  { backgroundColor: T.surface, borderRadius: T.r20, padding: 24, alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: T.border },
  heroEmoji: { fontSize: 40, marginBottom: 10 },
  heroTitle: { color: T.text, fontSize: 18, fontWeight: T.xbold, textAlign: 'center', marginBottom: 4 },
  heroSub:   { color: T.sub, fontSize: 13, textAlign: 'center' },

  section:              { backgroundColor: T.surface, borderRadius: T.r12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: T.border },
  sectionHighlight:     { backgroundColor: '#1A0A0A', borderColor: '#DC262640', borderWidth: 1.5 },
  sectionTitle:         { color: T.text, fontSize: 14, fontWeight: T.bold, marginBottom: 8 },
  sectionTitleHighlight:{ color: '#DC2626' },
  sectionBody:          { color: T.sub, fontSize: 13, lineHeight: 20 },
  sectionBodyHighlight: { color: '#FCA5A5' },

  footer:      { alignItems: 'center', marginTop: 8, marginBottom: 20, gap: 4 },
  footerText:  { color: T.muted, fontSize: 12 },

  acceptBtn:     { backgroundColor: T.teal, borderRadius: T.r16, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  acceptBtnText: { color: '#fff', fontSize: 15, fontWeight: T.bold },
});
