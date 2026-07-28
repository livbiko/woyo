import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { AuthProvider } from '@/lib/auth-context';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import '../globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

const SITE_URL = 'https://woyo.ci';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Woyo — Trouvez des professionnels de confiance en Cote d\'Ivoire',
    template: '%s | Woyo',
  },
  description:
    "Woyo connecte les Ivoiriens aux meilleurs professionnels et entreprises locales : electriciens, medecins, restaurants, avocats et bien plus.",
  openGraph: {
    type: 'website',
    siteName: 'Woyo',
    locale: 'fr_CI',
  },
  icons: {
    icon: '/favicon.svg',
  },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) notFound();

  const messages = await getMessages();

  return (
    <html lang={locale} className={inter.variable}>
      <body className="font-sans antialiased">
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <Header />
            <main className="min-h-screen">{children}</main>
            <Footer />
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
