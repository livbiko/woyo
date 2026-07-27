import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// NOTE: business names/contact info below are fictional placeholder demo
// data for local development and screenshots -- not real Ivorian
// businesses. Replace via the real "Become a Provider" flow before launch.

const CATEGORIES = [
  { slug: 'electriciens', nameFr: 'Electriciens', nameEn: 'Electricians', icon: 'Zap', featuredOrder: 5 },
  { slug: 'plombiers', nameFr: 'Plombiers', nameEn: 'Plumbers', icon: 'Wrench', featuredOrder: null },
  { slug: 'mecaniciens-auto', nameFr: 'Mecaniciens Auto', nameEn: 'Car Mechanics', icon: 'Car', featuredOrder: 4 },
  { slug: 'avocats', nameFr: 'Avocats', nameEn: 'Lawyers', icon: 'Scale', featuredOrder: 6 },
  { slug: 'medecins', nameFr: 'Medecins', nameEn: 'Doctors', icon: 'Stethoscope', featuredOrder: 2 },
  { slug: 'dentistes', nameFr: 'Dentistes', nameEn: 'Dentists', icon: 'Smile', featuredOrder: null },
  { slug: 'restaurants', nameFr: 'Restaurants', nameEn: 'Restaurants', icon: 'UtensilsCrossed', featuredOrder: 1 },
  { slug: 'hotels', nameFr: 'Hotels', nameEn: 'Hotels', icon: 'Building2', featuredOrder: 3 },
  { slug: 'artisans-btp', nameFr: 'Batiment et Travaux', nameEn: 'Builders', icon: 'HardHat', featuredOrder: 9 },
  { slug: 'architectes', nameFr: 'Architectes', nameEn: 'Architects', icon: 'Ruler', featuredOrder: null },
  { slug: 'entreprises-nettoyage', nameFr: 'Entreprises de Nettoyage', nameEn: 'Cleaning Companies', icon: 'Sparkles', featuredOrder: 8 },
  { slug: 'entreprises-securite', nameFr: 'Entreprises de Securite', nameEn: 'Security Companies', icon: 'ShieldCheck', featuredOrder: null },
  { slug: 'photographes', nameFr: 'Photographes', nameEn: 'Photographers', icon: 'Camera', featuredOrder: null },
  { slug: 'salons-beaute', nameFr: 'Salons de Beaute', nameEn: 'Beauty Salons', icon: 'Flower2', featuredOrder: null },
  { slug: 'coiffeurs', nameFr: 'Coiffeurs', nameEn: 'Hairdressers', icon: 'Scissors', featuredOrder: null },
  { slug: 'organisateurs-evenements', nameFr: "Organisateurs d'Evenements", nameEn: 'Event Planners', icon: 'PartyPopper', featuredOrder: null },
  { slug: 'professeurs-particuliers', nameFr: 'Professeurs Particuliers', nameEn: 'Tutors', icon: 'GraduationCap', featuredOrder: null },
  { slug: 'consultants-it', nameFr: 'Consultants IT', nameEn: 'IT Consultants', icon: 'Laptop', featuredOrder: 10 },
  { slug: 'ingenieurs-reseaux', nameFr: 'Ingenieurs Reseaux', nameEn: 'Network Engineers', icon: 'Network', featuredOrder: null },
  { slug: 'experts-cybersecurite', nameFr: 'Experts Cybersecurite', nameEn: 'Cybersecurity Experts', icon: 'ShieldAlert', featuredOrder: null },
  { slug: 'agences-immobilieres', nameFr: 'Agences Immobilieres', nameEn: 'Real Estate Agencies', icon: 'Home', featuredOrder: 7 },
  { slug: 'entreprises-demenagement', nameFr: 'Entreprises de Demenagement', nameEn: 'Moving Companies', icon: 'Truck', featuredOrder: null },
  { slug: 'services-taxi', nameFr: 'Services de Taxi', nameEn: 'Taxi Services', icon: 'CarTaxiFront', featuredOrder: null },
];

const CITIES = [
  { slug: 'abidjan', nameFr: 'Abidjan', nameEn: 'Abidjan', region: 'Lagunes', latitude: 5.36, longitude: -4.0083 },
  { slug: 'yamoussoukro', nameFr: 'Yamoussoukro', nameEn: 'Yamoussoukro', region: 'Lacs', latitude: 6.8276, longitude: -5.2893 },
  { slug: 'bouake', nameFr: 'Bouake', nameEn: 'Bouake', region: 'Vallee du Bandama', latitude: 7.69, longitude: -5.03 },
  { slug: 'san-pedro', nameFr: 'San-Pedro', nameEn: 'San-Pedro', region: 'Bas-Sassandra', latitude: 4.7485, longitude: -6.6363 },
  { slug: 'korhogo', nameFr: 'Korhogo', nameEn: 'Korhogo', region: 'Savanes', latitude: 9.458, longitude: -5.6296 },
  { slug: 'daloa', nameFr: 'Daloa', nameEn: 'Daloa', region: 'Haut-Sassandra', latitude: 6.877, longitude: -6.4502 },
];

// [name, categorySlug, citySlug, lat offset, lng offset, isVerified, servicePriceFrom, [service names]]
const BUSINESSES: Array<{
  name: string;
  category: string;
  city: string;
  lat: number;
  lng: number;
  verified: boolean;
  services: { name: string; priceFrom: number | null }[];
  short: string;
}> = [
  { name: 'Cocody Electric Pro', category: 'electriciens', city: 'abidjan', lat: 5.359, lng: -3.986, verified: true, short: 'Installation et depannage electrique residentiel et commercial.', services: [{ name: 'Depannage urgence', priceFrom: 15000 }, { name: 'Installation tableau electrique', priceFrom: 45000 }] },
  { name: 'Plateau Plomberie Express', category: 'plombiers', city: 'abidjan', lat: 5.325, lng: -4.021, verified: true, short: 'Reparation de fuites, sanitaires et chauffe-eau, intervention rapide.', services: [{ name: 'Debouchage canalisation', priceFrom: 12000 }, { name: 'Installation sanitaire', priceFrom: 35000 }] },
  { name: 'Garage Marcory Auto', category: 'mecaniciens-auto', city: 'abidjan', lat: 5.301, lng: -3.985, verified: false, short: 'Entretien, vidange et diagnostic multimarques.', services: [{ name: 'Vidange complete', priceFrom: 25000 }, { name: 'Diagnostic electronique', priceFrom: 15000 }] },
  { name: 'Cabinet Kone & Associes', category: 'avocats', city: 'abidjan', lat: 5.34, lng: -4.01, verified: true, short: 'Droit des affaires, droit du travail et contentieux commercial.', services: [{ name: 'Consultation initiale', priceFrom: 25000 }, { name: 'Redaction de contrat', priceFrom: 75000 }] },
  { name: 'Clinique Sante Riviera', category: 'medecins', city: 'abidjan', lat: 5.368, lng: -3.965, verified: true, short: 'Medecine generale et consultations specialisees.', services: [{ name: 'Consultation generale', priceFrom: 10000 }, { name: 'Bilan de sante complet', priceFrom: 40000 }] },
  { name: 'Sourire Dental Cocody', category: 'dentistes', city: 'abidjan', lat: 5.355, lng: -3.99, verified: true, short: 'Soins dentaires, blanchiment et orthodontie.', services: [{ name: 'Detartrage', priceFrom: 15000 }, { name: 'Blanchiment', priceFrom: 60000 }] },
  { name: 'Le Maquis d\'Or', category: 'restaurants', city: 'abidjan', lat: 5.33, lng: -4.0, verified: true, short: 'Cuisine ivoirienne traditionnelle, attieke et poisson braise.', services: [{ name: 'Menu du jour', priceFrom: 3500 }] },
  { name: 'Chez Tantie Aya', category: 'restaurants', city: 'bouake', lat: 7.693, lng: -5.032, verified: false, short: 'Restaurant familial, specialites locales.', services: [{ name: 'Plat garni', priceFrom: 2500 }] },
  { name: 'Hotel Ivoire Palace', category: 'hotels', city: 'abidjan', lat: 5.322, lng: -3.99, verified: true, short: 'Hotel 4 etoiles avec piscine et salle de conference.', services: [{ name: 'Chambre standard / nuit', priceFrom: 55000 }, { name: 'Suite / nuit', priceFrom: 120000 }] },
  { name: 'Residence Lagune Bleue', category: 'hotels', city: 'san-pedro', lat: 4.746, lng: -6.632, verified: false, short: 'Residence hoteliere face a la mer.', services: [{ name: 'Chambre double / nuit', priceFrom: 30000 }] },
  { name: 'BTP Excellence CI', category: 'artisans-btp', city: 'abidjan', lat: 5.35, lng: -4.02, verified: true, short: 'Construction, renovation et gros oeuvre.', services: [{ name: 'Devis gratuit', priceFrom: null }, { name: 'Suivi de chantier', priceFrom: 150000 }] },
  { name: 'Atelier Architecture Baobab', category: 'architectes', city: 'abidjan', lat: 5.34, lng: -3.98, verified: true, short: 'Conception architecturale residentielle et commerciale.', services: [{ name: 'Plan architectural', priceFrom: 200000 }] },
  { name: 'Nettoyage Pro Abidjan', category: 'entreprises-nettoyage', city: 'abidjan', lat: 5.31, lng: -4.0, verified: false, short: 'Nettoyage de bureaux, residences et fin de chantier.', services: [{ name: 'Nettoyage bureau (forfait)', priceFrom: 20000 }] },
  { name: 'Securitas Yamoussoukro', category: 'entreprises-securite', city: 'yamoussoukro', lat: 6.83, lng: -5.29, verified: true, short: 'Gardiennage et surveillance evenementielle.', services: [{ name: 'Agent de securite / jour', priceFrom: 18000 }] },
  { name: 'Studio Lumiere Photographie', category: 'photographes', city: 'abidjan', lat: 5.365, lng: -3.97, verified: true, short: 'Photographie de mariage, portrait et evenementiel.', services: [{ name: 'Seance portrait', priceFrom: 30000 }, { name: 'Reportage mariage', priceFrom: 250000 }] },
  { name: 'Beaute Naturelle Spa', category: 'salons-beaute', city: 'abidjan', lat: 5.358, lng: -3.995, verified: false, short: 'Soins du visage, manucure et massage.', services: [{ name: 'Manucure', priceFrom: 5000 }, { name: 'Massage relaxant', priceFrom: 20000 }] },
  { name: 'Coiffure Elegance Treichville', category: 'coiffeurs', city: 'abidjan', lat: 5.29, lng: -4.01, verified: false, short: 'Coiffure homme, femme et enfant.', services: [{ name: 'Coupe homme', priceFrom: 3000 }, { name: 'Tresses', priceFrom: 8000 }] },
  { name: 'Evenements Prestige CI', category: 'organisateurs-evenements', city: 'abidjan', lat: 5.345, lng: -4.005, verified: true, short: 'Organisation de mariages, seminaires et anniversaires.', services: [{ name: 'Coordination evenement', priceFrom: 300000 }] },
  { name: 'Reussite Cours Particuliers', category: 'professeurs-particuliers', city: 'abidjan', lat: 5.36, lng: -3.99, verified: false, short: 'Soutien scolaire du primaire au lycee.', services: [{ name: 'Cours particulier / heure', priceFrom: 5000 }] },
  { name: 'Digital Solutions Abidjan', category: 'consultants-it', city: 'abidjan', lat: 5.318, lng: -4.0, verified: true, short: 'Conseil en transformation digitale et developpement logiciel.', services: [{ name: 'Audit digital', priceFrom: 100000 }, { name: 'Developpement application', priceFrom: 500000 }] },
  { name: 'NetPro Ingenierie', category: 'ingenieurs-reseaux', city: 'abidjan', lat: 5.33, lng: -3.99, verified: false, short: 'Installation et administration de reseaux d\'entreprise.', services: [{ name: 'Installation reseau', priceFrom: 80000 }] },
  { name: 'CyberGuard Cote d\'Ivoire', category: 'experts-cybersecurite', city: 'abidjan', lat: 5.35, lng: -3.975, verified: true, short: 'Audit de securite, pentest et formation cybersecurite.', services: [{ name: 'Audit de securite', priceFrom: 350000 }] },
  { name: 'Immo Excellence Cocody', category: 'agences-immobilieres', city: 'abidjan', lat: 5.362, lng: -3.98, verified: true, short: 'Vente, location et gestion immobiliere.', services: [{ name: 'Estimation de bien', priceFrom: null }] },
  { name: 'Demenagement Rapide CI', category: 'entreprises-demenagement', city: 'abidjan', lat: 5.32, lng: -4.03, verified: false, short: 'Demenagement residentiel et professionnel.', services: [{ name: 'Demenagement studio', priceFrom: 40000 }, { name: 'Demenagement villa', priceFrom: 150000 }] },
  { name: 'Taxi VIP Abidjan', category: 'services-taxi', city: 'abidjan', lat: 5.34, lng: -3.99, verified: true, short: 'Service de taxi premium avec chauffeur.', services: [{ name: 'Course en ville', priceFrom: 2000 }, { name: 'Transfert aeroport', priceFrom: 15000 }] },
];

function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function main() {
  console.log('Seeding categories...');
  const categoryBySlug = new Map<string, string>();
  for (const c of CATEGORIES) {
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { nameFr: c.nameFr, nameEn: c.nameEn, icon: c.icon, featuredOrder: c.featuredOrder },
      create: c,
    });
    categoryBySlug.set(c.slug, row.id);
  }

  console.log('Seeding cities...');
  const cityBySlug = new Map<string, string>();
  for (const c of CITIES) {
    const row = await prisma.city.upsert({ where: { slug: c.slug }, update: c, create: c });
    cityBySlug.set(c.slug, row.id);
  }

  console.log('Seeding a demo reviewer account...');
  const reviewer = await prisma.user.upsert({
    where: { email: 'demo.reviewer@woyo.ci' },
    update: {},
    create: {
      email: 'demo.reviewer@woyo.ci',
      name: 'Utilisateur Demo',
      passwordHash: await bcrypt.hash('DemoPassword123!', 12),
    },
  });

  console.log('Seeding businesses...');
  for (const b of BUSINESSES) {
    const slug = slugify(b.name);
    const categoryId = categoryBySlug.get(b.category);
    const cityId = cityBySlug.get(b.city);
    if (!categoryId || !cityId) {
      console.warn(`Skipping ${b.name}: unknown category/city`);
      continue;
    }

    const business = await prisma.business.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        name: b.name,
        categoryId,
        cityId,
        shortDescription: b.short,
        description: `${b.short} ${b.name} sert la region de ${b.city} avec professionnalisme et fiabilite.`,
        address: `${b.name}, ${b.city.charAt(0).toUpperCase() + b.city.slice(1)}, Cote d'Ivoire`,
        latitude: b.lat,
        longitude: b.lng,
        phone: '+225 07 00 00 00 00',
        whatsapp: '+225 07 00 00 00 00',
        email: `contact@${slug}.ci`,
        isVerified: b.verified,
        status: 'APPROVED',
        images: {
          create: [0, 1, 2].map((i) => ({
            url: `https://picsum.photos/seed/${slug}-${i}/800/600`,
            order: i,
          })),
        },
        openingHours: {
          create: [
            { day: 'MONDAY', opensAt: '08:00', closesAt: '18:00' },
            { day: 'TUESDAY', opensAt: '08:00', closesAt: '18:00' },
            { day: 'WEDNESDAY', opensAt: '08:00', closesAt: '18:00' },
            { day: 'THURSDAY', opensAt: '08:00', closesAt: '18:00' },
            { day: 'FRIDAY', opensAt: '08:00', closesAt: '18:00' },
            { day: 'SATURDAY', opensAt: '09:00', closesAt: '13:00' },
            { day: 'SUNDAY', opensAt: null, closesAt: null },
          ],
        },
        services: { create: b.services },
      },
    });

    await prisma.review.upsert({
      where: { businessId_userId: { businessId: business.id, userId: reviewer.id } },
      update: {},
      create: {
        businessId: business.id,
        userId: reviewer.id,
        rating: 4 + (b.verified ? 1 : 0) > 5 ? 5 : 4,
        comment: 'Tres bon service, personnel professionnel et reactif.',
      },
    });
  }

  console.log(`Done: ${CATEGORIES.length} categories, ${CITIES.length} cities, ${BUSINESSES.length} businesses.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
