const KNOWN_SAFE: Record<string, string> = {
  'Code OTP introuvable ou expiré.': 'Code invalide ou expiré.',
  'Code expiré.': 'Code expiré.',
  'Code incorrect.': 'Code incorrect.',
  'Trop de tentatives.': 'Trop de tentatives. Réessayez plus tard.',
  'Non authentifié.': 'Session expirée. Veuillez vous reconnecter.',
  'Token invalide ou expiré.': 'Session expirée. Veuillez vous reconnecter.',
  'Session expirée. Veuillez vous reconnecter.': 'Session expirée. Veuillez vous reconnecter.',
  'Service temporairement indisponible. Réessayez.': 'Service temporairement indisponible. Réessayez.',
  'Erreur serveur. Veuillez réessayer.': 'Erreur serveur. Veuillez réessayer.',
  'Appareil non reconnu.': 'Appareil non reconnu. Veuillez vous connecter.',
  'Accès refusé.': 'Accès non autorisé.',
  'Montant minimum : 500 FCFA.': 'Montant minimum : 500 FCFA.',
  'Solde insuffisant.': 'Solde insuffisant.',
  'Course déjà prise ou annulée.': 'Course déjà prise ou annulée.',
  'Erreur réseau.': 'Erreur réseau. Vérifiez votre connexion.',
  'Impossible d\'envoyer le code. Vérifiez votre adresse email et réessayez.': 'Impossible d\'envoyer le code. Vérifiez votre adresse email et réessayez.',
  'Votre KYC doit être approuvé pour rejoindre le service Woyo.': 'Votre KYC doit être approuvé pour rejoindre le service Woyo.',
  'Vous devez accepter les conditions du service Woyo.': 'Vous devez accepter les conditions du service Woyo.',
  'Vous devez sélectionner votre localité.': 'Vous devez sélectionner votre localité.',
  'Localité invalide ou inactive.': 'Localité invalide ou inactive.',
  'Vous avez déjà une course en cours.': 'Vous avez déjà une course en cours.',
  'Coordonnées de départ et destination requises.': 'Veuillez entrer votre départ et destination.',
  'Aucun chauffeur Woyo disponible actuellement. Réessayez dans quelques minutes.': 'Aucun chauffeur Woyo disponible. Réessayez dans quelques minutes.',
};

const SAFE_PREFIXES = [
  'Montant',
  'Solde',
  'Numéro',
  'Code',
  'Email',
  'Course',
  'Document',
  'Le permis',
  'Documents manquants',
  'Trop de',
  'Aucun chauffeur',
  'Recharge',
  'Type de véhicule',
  'Vous participez',
  'Vous avez quitté',
  'Veuillez compléter',
];

export function safeError(err: any): string {
  const raw: string = err?.message ?? '';
  if (KNOWN_SAFE[raw]) return KNOWN_SAFE[raw];
  if (SAFE_PREFIXES.some(p => raw.startsWith(p))) return raw;
  return 'Une erreur est survenue. Réessayez.';
}
