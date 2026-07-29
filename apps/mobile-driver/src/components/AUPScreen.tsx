import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { T } from '../theme';

interface Section { title: string; body: string; highlight?: boolean; }

const DRIVER_SECTIONS: Section[] = [
  {
    title: '1. Objet',
    body: 'Les présentes Conditions Générales d\'Utilisation pour Chauffeurs (CGUC) régissent l\'accès et l\'utilisation de l\'application Tekeche Driver. En vous inscrivant comme chauffeur partenaire, vous acceptez sans réserve les présentes conditions.',
  },
  {
    title: '2. Statut du chauffeur',
    body: 'Le chauffeur Tekeche est un prestataire indépendant. Il n\'est pas salarié de Tekeche. Il est seul responsable de son véhicule, de son assurance, de son permis de conduire et du respect du code de la route.',
  },
  {
    title: '3. Conditions d\'accès',
    body: 'Pour accéder à la plateforme, le chauffeur doit :\n• Être titulaire d\'un permis de conduire valide\n• Posséder un véhicule en bon état de fonctionnement\n• Fournir des documents KYC authentiques (pièce d\'identité, permis, carte grise)\n• Obtenir l\'approbation de Tekeche avant d\'accepter des courses\n• Maintenir une note moyenne satisfaisante (≥ 3,5/5)',
  },
  {
    title: '4. Obligations du chauffeur',
    body: 'Le chauffeur s\'engage à :\n• Traiter chaque passager avec respect et professionnalisme\n• Assurer la sécurité des passagers pendant toute la durée de la course\n• Respecter l\'itinéraire demandé ou convenu\n• Maintenir son véhicule propre et en bon état\n• Ne pas conduire sous l\'influence de l\'alcool ou de substances\n• Signaler tout incident via l\'application\n• Protéger la confidentialité des informations des passagers',
  },
  {
    title: '5. Comportements interdits',
    body: 'Sont strictement interdits et peuvent entraîner une suspension immédiate :\n• Tout acte de violence, harcèlement ou menace envers les passagers\n• Le détournement de trajet ou la retenue du passager contre sa volonté\n• La demande de paiements non autorisés en dehors de l\'application\n• L\'utilisation du véhicule à des fins criminelles\n• Le partage des données personnelles des passagers\n• Toute forme de discrimination envers les passagers',
  },
  {
    title: '6. Coopération avec les autorités',
    body: 'TEKECHE SE RÉSERVE EXPRESSÉMENT LE DROIT DE COOPÉRER PLEINEMENT AVEC LES AUTORITÉS JUDICIAIRES ET POLICIÈRES DANS TOUT CAS IMPLIQUANT UN CHAUFFEUR PARTENAIRE.\n\nEn cas de signalement, plainte déposée par un passager, ou enquête concernant des faits délictueux ou criminels commis par un chauffeur, Tekeche s\'engage à :\n\n• Transmettre immédiatement aux autorités compétentes l\'ensemble des informations disponibles : identité du chauffeur (nom, photo, pièce d\'identité), historique de courses, positions GPS, enregistrements de chat, plaque d\'immatriculation et tout autre élément pertinent\n• Suspendre le compte du chauffeur dès réception d\'un signalement crédible ou d\'une réquisition judiciaire, sans délai ni préavis\n• Bloquer le versement des gains en attente si une enquête est en cours\n• Collaborer activement et sans restriction avec la Police Nationale, la Gendarmerie, le Parquet et toute autorité judiciaire ou administrative compétente\n• Conserver les preuves numériques conformément aux réquisitions légales\n\nTout chauffeur impliqué dans un acte criminel contre un passager sera définitivement exclu de la plateforme. L\'utilisation de Tekeche ne confère aucune immunité ou protection en cas d\'activité illicite.',
    highlight: true,
  },
  {
    title: '7. Protection des passagers',
    body: 'Tekeche place la sécurité des passagers au cœur de ses priorités :\n• Chaque course est enregistrée avec données GPS complètes\n• Les passagers ont accès à un bouton SOS en cours de course\n• Les passagers peuvent partager leur course en temps réel avec leurs proches\n• Tout signalement de passager est examiné dans les 24 heures\n\nTout chauffeur faisant l\'objet de signalements répétés sera suspendu pending enquête.',
  },
  {
    title: '8. Rémunération et commissions',
    body: 'Le chauffeur perçoit 87,5% du tarif de chaque course. Tekeche prélève une commission de 12,5% pour couvrir les frais de plateforme. Les versements sont effectués selon les modalités définies dans l\'application.',
  },
  {
    title: '9. Suspension et résiliation',
    body: 'Tekeche peut suspendre ou résilier l\'accès d\'un chauffeur en cas de :\n• Violation des présentes CGUC\n• Note inférieure à 3,0/5 sur 30 dernières courses\n• Signalement de comportement dangereux ou criminel\n• Documents KYC invalides ou expirés\n• Réquisition des autorités judiciaires',
  },
  {
    title: '10. Acceptation',
    body: 'En utilisant l\'application Tekeche Driver, vous reconnaissez avoir lu, compris et accepté sans réserve les présentes conditions, y compris la clause de coopération avec les autorités (article 6).\n\nDernière mise à jour : juin 2026\nContact : support@tekeche.com',
  },
];

interface Props {
  onAccept?: () => void;
  onBack?: () => void;
  showAcceptButton?: boolean;
}

const CONFIG = { sections: DRIVER_SECTIONS, title: 'Conditions Chauffeur', emoji: '🛡', sub: 'Chauffeurs Partenaires' };

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
