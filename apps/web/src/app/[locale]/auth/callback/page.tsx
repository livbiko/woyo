'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth-context';

export default function AuthCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setTokenDirectly } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      setTokenDirectly(token).finally(() => router.push('/'));
    } else {
      router.push('/login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center text-gray-500">
      Connexion en cours...
    </div>
  );
}
