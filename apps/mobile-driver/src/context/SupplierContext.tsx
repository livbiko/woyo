import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import client from '../api/client';

interface SupplierProfile {
  _id: string;
  name?: string;
  businessName?: string;
  email?: string;
  phone?: string;
  serviceType: 'restaurant' | 'produits';
  isVerified: boolean;
  isActive: boolean;
}

interface SupplierCtx {
  profile: SupplierProfile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  isProducts: boolean;
}

const Ctx = createContext<SupplierCtx>({ profile: null, loading: true, refresh: async () => {}, isProducts: false });

export function SupplierProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<SupplierProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await client.get('/supplier/profile');
      setProfile(data.supplier);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, []);

  return (
    <Ctx.Provider value={{ profile, loading, refresh, isProducts: profile?.serviceType === 'produits' }}>
      {children}
    </Ctx.Provider>
  );
}

export const useSupplier = () => useContext(Ctx);
