'use client';

import { FormEvent, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2 } from 'lucide-react';
import { PageHero } from '@/components/PageHero';
import { Input, Textarea } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function DriverRegisterPage() {
  const t = useTranslations('register');
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    city: '',
    vehicleType: '',
    hasLicense: false,
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/driver-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          email: form.email || undefined,
          message: form.message || undefined,
        }),
      });
      if (!res.ok) throw new Error('request failed');
      setSuccess(true);
    } catch {
      setError(t('errorMessage'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHero title={t('title')} subtitle={t('subtitle')} />

      <section className="mx-auto max-w-xl px-4 py-16 sm:px-6 lg:px-8">
        {success ? (
          <div className="rounded-2xl border border-gray-100 p-10 text-center">
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-red" />
            <h2 className="mb-2 text-xl font-bold text-ink">{t('successTitle')}</h2>
            <p className="text-gray-600">{t('successMessage')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t('name')}</label>
              <Input required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t('phone')}</label>
                <Input required type="tel" minLength={8} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t('email')}</label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t('city')}</label>
                <Input required minLength={2} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t('vehicleType')}</label>
                <Input
                  required
                  minLength={2}
                  placeholder={t('vehicleTypePlaceholder')}
                  value={form.vehicleType}
                  onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                required
                checked={form.hasLicense}
                onChange={(e) => setForm({ ...form, hasLicense: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-red focus:ring-red"
              />
              {t('hasLicense')}
            </label>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t('message')}</label>
              <Textarea rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            </div>

            {error && <p className="text-sm text-red">{error}</p>}

            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? t('submitting') : t('submit')}
            </Button>
          </form>
        )}
      </section>
    </>
  );
}
